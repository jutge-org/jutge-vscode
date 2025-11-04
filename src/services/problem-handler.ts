import { getWorkspaceFolderWithErrorMessage } from "@/extension"
import { Testcase } from "@/jutge_api_client"
import { Logger } from "@/loggers"
import { ProblemWebviewPanel } from "@/providers/problem-webview/panel"
import { WebviewPanelRegistry } from "@/providers/problem-webview/panel-registry"
import {
    LanguageInfo,
    Proglang,
    proglangFromFilepath,
    proglangInfoGet,
} from "@/services/runners/languages"
import {
    InputExpected,
    Problem,
    TestcaseRun,
    TestcaseStatus,
    VSCodeToWebviewCommand,
} from "@/types"
import {
    chooseFromEditorList,
    decodeTestcase,
    defaultFilenameForProblem,
    findPossibleFiles,
    getProglangFromProblem,
    getWorkingDirectory,
    showCodeDocument,
} from "@/utils"
import { readFile, writeFile } from "fs/promises"
import { basename, join } from "path"
import * as vscode from "vscode"
import { FileService } from "./file"
import { JutgeService } from "./jutge"
import { SubmissionService } from "./submission"

export class ProblemHandler extends Logger {
    panel_: ProblemWebviewPanel
    problem_: Problem
    order_: number
    proglang_: Proglang | undefined
    langInfo_: LanguageInfo | undefined

    constructor(panel: ProblemWebviewPanel, problem: Problem, order: number) {
        super()

        this.panel_ = panel
        this.problem_ = problem
        this.order_ = order

        // Launch loading of testcases already
        if (!this.problem_.testcases) {
            JutgeService.getSampleTestcases(this.problem_.problem_id).then(
                (testcases) => (this.problem_.testcases = testcases)
            )
        }

        this.proglang_ = getProglangFromProblem(problem) || Proglang.CPP
        this.langInfo_ = proglangInfoGet(this.proglang_)
    }

    get langInfo() {
        if (!this.langInfo_) {
            throw new Error(`Lang info not initialized yet!!`)
        }
        return this.langInfo_
    }

    async chooseSourceFile(
        filename: string,
        extension: string
    ): Promise<vscode.Uri | undefined> {
        const workspaceFolder = getWorkspaceFolderWithErrorMessage()
        if (!workspaceFolder) {
            return undefined
        }

        // Compile all files that start with `filename` and have `extension`
        const possibleUris = await findPossibleFiles(filename, extension)
        const filenames = possibleUris.map((uri) => basename(uri.fsPath))
        let chosen: string | undefined = filenames[0]
        if (filenames.length > 1) {
            chosen = await vscode.window.showQuickPick(filenames)
        }
        if (!chosen) {
            return
        }
        return vscode.Uri.joinPath(workspaceFolder.uri, chosen)
    }

    async openExistingFile(panel: vscode.WebviewPanel) {
        if (!getWorkspaceFolderWithErrorMessage()) {
            return
        }
        const { filename, extension } = defaultFilenameForProblem(this.problem_, this.order_)
        const fileUri = await this.chooseSourceFile(filename, extension)
        if (!fileUri) {
            throw new Error(`File '${filename}${extension}' does not exist in workspace!`)
        }

        //

        // NOTE(pauek): This ensures that we can open the webview besides the code file,
        // if we don't do this the "createOrReveal" call fails the second time. I don't know
        // why that is, but even if this is inefficient, we at least ensure that the source
        // code is on the left and the webview on the right.
        //
        panel.dispose()

        const document = await vscode.workspace.openTextDocument(fileUri)
        showCodeDocument(document)

        const { problem_nm } = this.problem_
        await WebviewPanelRegistry.createOrReveal(problem_nm)
        await WebviewPanelRegistry.notifyProblemFilesChanges(problem_nm)
    }

    async createNewFile(panel: vscode.WebviewPanel): Promise<void> {
        const workspaceFolder = getWorkspaceFolderWithErrorMessage()
        if (!workspaceFolder) {
            return
        }
        const fileUri = await FileService.createNewFileFor(this.problem_, this.order_)
        if (!fileUri) {
            return
        }
        const document = await vscode.workspace.openTextDocument(fileUri)
        showCodeDocument(document)

        panel.reveal(vscode.ViewColumn.Beside, true)
    }

    async runTestcaseByIndex(
        index: number,
        options: { saveFirst: boolean } = { saveFirst: true }
    ): Promise<boolean> {
        try {
            if (options?.saveFirst) {
                // Save the current file first
                await vscode.commands.executeCommand("workbench.action.files.save")
            }

            const filePath = await this.__getEditorFilepath()
            this.log.debug(`Running testcase on file ${filePath}`)

            const testcase = await this.__getTestcase(index)
            this.log.debug(`Running testcase ${index}`)

            const { problem_nm } = this.problem_
            this.__sendUpdate(problem_nm, index, TestcaseStatus.RUNNING)

            const { status, output } = await this.__runExpecting(testcase, filePath)
            this.__sendUpdate(problem_nm, index, status, output)

            return status === TestcaseStatus.PASSED
            //
        } catch (e: any) {
            this.log.error(e)
            if (e instanceof Error) {
                vscode.window.showErrorMessage(e.message)
            }
            return false
        }
    }

    async runCustomTestcaseByIndex(index: number): Promise<boolean> {
        try {
            // Save the current file first
            await vscode.commands.executeCommand("workbench.action.files.save")

            const filePath = await this.__getEditorFilepath()
            this.log.debug(`Running testcase on file ${filePath}`)

            const testcase = await this.__getCustomTestcase(index)
            this.log.debug(`Running custom testcase ${index}`)

            const { problem_nm } = this.problem_
            this.__sendUpdateCustom(problem_nm, index, TestcaseStatus.RUNNING)

            const output = await this.__run(testcase, filePath)
            this.__sendUpdateCustom(problem_nm, index, TestcaseStatus.PASSED, output)

            return true
            //
        } catch (e: unknown) {
            this.log.error(e)
            if (e instanceof Error) {
                vscode.window.showErrorMessage(e.message)
            }
            return false
        }
    }

    async runTestcaseAll(): Promise<boolean> {
        try {
            // Save the current file first
            await vscode.commands.executeCommand("workbench.action.files.save")

            const testcases = await this.__ensureTestcases()
            this.log.debug(`Running all testcases for problem ${this.problem_.problem_id}`)

            let allPassed = true
            for (let index = 1; index <= testcases.length; index++) {
                allPassed =
                    allPassed && (await this.runTestcaseByIndex(index, { saveFirst: false }))
            }

            return allPassed
            //
        } catch (error: any) {
            this.log.error(`Error running all testcases: ${error}`)
            vscode.window.showErrorMessage(error.toString())
            return false
        }
    }

    async submitToJudge(): Promise<void> {
        // Save the current file first
        await vscode.commands.executeCommand("workbench.action.files.save")

        let editor = await chooseFromEditorList(vscode.window.visibleTextEditors)
        if (!editor) {
            vscode.window.showErrorMessage("No text editor open.")
            return
        }
        return SubmissionService.submitProblem(this.problem_, editor.document.uri.fsPath)
    }

    async __runExpecting(testcase: InputExpected, filePath: string): Promise<TestcaseRun> {
        try {
            const proglang = proglangFromFilepath(filePath)
            const runner = proglangInfoGet(proglang).runner
            const document = await this.__getDocument(filePath)

            this.log.debug(`Executing code with ${runner.constructor.name}`)
            const output = runner
                .run(filePath, testcase.input, document)
                .replaceAll(/\r\n/g, "\n")
            this.log.debug(`Code execution completed`)

            const handler = this.problem_.handler?.handler || "<unknown>"
            switch (handler) {
                case "std": {
                    const expected = testcase.expected.toString("utf-8")
                    const passed = output !== null && output === expected
                    return {
                        status: passed ? TestcaseStatus.PASSED : TestcaseStatus.FAILED,
                        output,
                    }
                }
                case "graphic": {
                    const workingDir = getWorkingDirectory(`output.png`)

                    // 1. The program has produced the 'output.png' file as output.
                    const outputPath = join(workingDir, `output.png`)
                    const expectedPath = join(workingDir, `expected.png`)
                    const buf = (await readFile(outputPath)).buffer
                    const output = Buffer.from(buf)
                    const output_b64 = output.toString("base64")

                    // 2. Save the expected output to 'expected.png'
                    await writeFile(expectedPath, testcase.expected)

                    // 3. Compare the two files using ImageMagick 'compare'
                    const rmse = await FileService.compareImages(outputPath, expectedPath)

                    const THRESHOLD = 0.05
                    const failed = rmse === null || rmse > THRESHOLD
                    return {
                        status: failed ? TestcaseStatus.FAILED : TestcaseStatus.PASSED,
                        output: output_b64,
                    }
                }
                default:
                    const msg = `Error running testcase: handler '${handler}' not supported`
                    this.log.error(msg)
                    throw new Error(msg)
            }

            //
        } catch (err) {
            this.log.error(`Error running testcase: ${err}`)
            throw new Error(`Error running testcase: ${err}`)
        }
    }

    async __run(input: string, filePath: string): Promise<string> {
        const proglang = proglangFromFilepath(filePath)
        const runner = proglangInfoGet(proglang).runner
        const document = await this.__getDocument(filePath)

        this.log.debug(`Executing code with ${runner.constructor.name}`)
        const output = runner.run(filePath, input, document).replaceAll(/\r\n/g, "\n")
        this.log.debug(`Code execution completed`)

        return output
    }

    async __sendMessage(command: VSCodeToWebviewCommand, problemNm: string, data: any) {
        await WebviewPanelRegistry.sendMessage(problemNm, { command, data })
    }

    async __sendUpdate(
        problemNm: string,
        testcaseId: number,
        status: TestcaseStatus,
        output: string | null = ""
    ) {
        this.__sendMessage(VSCodeToWebviewCommand.UPDATE_TESTCASE_STATUS, problemNm, {
            testcaseId,
            status,
            output,
        })
    }

    async __sendUpdateCustom(
        problemNm: string,
        testcaseId: number,
        status: TestcaseStatus,
        output: string | null = ""
    ) {
        this.__sendMessage(VSCodeToWebviewCommand.UPDATE_CUSTOM_TESTCASE_STATUS, problemNm, {
            testcaseId,
            status,
            output,
        })
    }

    async __getEditorFilepath(): Promise<string> {
        const editor = await chooseFromEditorList(vscode.window.visibleTextEditors)
        if (!editor) {
            throw new Error(`No text editor open`)
        }
        return editor.document.uri.fsPath
    }

    async __ensureTestcases(): Promise<Testcase[]> {
        const { testcases } = this.problem_
        if (!testcases || testcases.length === 0) {
            throw new Error(`No testcases found for problem ${this.problem_.problem_nm}`)
        }
        this.log.debug(
            `Found ${testcases.length} testcases for problem ${this.problem_.problem_nm}`
        )
        return testcases
    }

    async __getTestcase(index: number): Promise<InputExpected> {
        const testcases = await this.__ensureTestcases()
        const k = index - 1 // Testcases are 1-indexed to be consistent with the UI.
        if (k < 0 || k >= testcases.length) {
            throw new Error(`Internal error: testcase index ${index} does not exist!`)
        }
        return decodeTestcase(testcases[k])
    }

    async __getCustomTestcase(index: number): Promise<string> {
        const { customTestcases } = this.panel_
        if (customTestcases === null) {
            throw new Error(`Internal Error: there are no custom testcases!`)
        }
        const k = index - 1
        if (k < 0 || k >= customTestcases.length) {
            throw new Error(`Internal error: custom testcase index ${index} does not exist!`)
        }
        return customTestcases[k].input
    }

    async __getDocument(filePath: string): Promise<vscode.TextDocument> {
        const document = vscode.workspace.textDocuments.find(
            (doc) => doc.uri.fsPath === filePath
        )
        if (!document) {
            this.log.error(`File ${filePath} not found in workspace documents`)
            throw new Error("File not found in the workspace.")
        }
        return document
    }
}
