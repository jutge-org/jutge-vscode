import { getWorkspaceFolder } from "@/extension"
import { Testcase } from "@/jutge_api_client"
import { Logger } from "@/loggers"
import { WebviewPanelRegistry } from "@/providers/problem-webview/panel-registry"
import {
    LanguageInfo,
    Proglang,
    proglangFromCompiler,
    proglangFromFilepath,
    proglangInfoGet,
} from "@/services/runners/languages"
import {
    CustomTestcase,
    InputExpected,
    Problem,
    TestcaseRun,
    TestcaseStatus,
    VSCodeToWebviewCommand,
} from "@/types"
import { chooseFromEditorList, decodeTestcase, sanitizeTitle } from "@/utils"
import { existsSync } from "fs"
import { extname } from "path"
import * as vscode from "vscode"
import { FileService } from "./file"
import { JutgeService } from "./jutge"
import { SubmissionService } from "./submission"

export class ProblemHandler extends Logger {
    problem_: Problem
    proglang_: Proglang | undefined
    langInfo_: LanguageInfo | undefined
    customTestcases_: CustomTestcase[] | null

    constructor(problem: Problem, customTestcases: CustomTestcase[] | null) {
        super()

        this.problem_ = problem
        this.customTestcases_ = customTestcases

        // Launch loading of testcases already
        if (!this.problem_.testcases) {
            JutgeService.getSampleTestcases(this.problem_.problem_id).then(
                (testcases) => (this.problem_.testcases = testcases)
            )
        }
    }

    async initProglang() {
        this.proglang_ = (await this.getProglangFromProblem()) || Proglang.CPP
        this.langInfo_ = proglangInfoGet(this.proglang_)
    }

    get langInfo() {
        if (!this.langInfo_) {
            throw new Error(`Lang info not initialized yet!!`)
        }
        return this.langInfo_
    }

    async defaultFilenameForProblem() {
        const { problem_id, title } = this.problem_
        const defaultExtension = this.langInfo.extensions[0]
        return `${problem_id}_${sanitizeTitle(title)}${defaultExtension}`
    }

    findFileInWorkspace(filename: string): vscode.Uri | undefined {
        const workspaceFolder = getWorkspaceFolder()
        if (!workspaceFolder) {
            return undefined
        }
        return vscode.Uri.joinPath(workspaceFolder.uri, filename)
    }

    async suggestedFileExists(): Promise<boolean> {
        const suggestedFilename = await this.defaultFilenameForProblem()
        const fileUri = this.findFileInWorkspace(suggestedFilename)
        if (!fileUri) {
            return false
        }
        const path = fileUri.fsPath
        return existsSync(path)
    }

    getCompilerId(): string {
        const compilers = this.problem_.handler?.compilers
        let compiler_id = ""
        if (Array.isArray(compilers)) {
            compiler_id = compilers[0]
        } else if (typeof compilers === "string") {
            compiler_id = compilers
        }
        return compiler_id
    }

    async getProglangFromProblem(): Promise<Proglang | null> {
        const compiler_id = this.getCompilerId()
        if (!compiler_id) {
            return null
        }
        try {
            return proglangFromCompiler(compiler_id)
            //
        } catch (e) {
            vscode.window.showErrorMessage(`Could not determine programming language`)
            return null
        }
    }

    async openExistingFile(): Promise<void> {
        if (!getWorkspaceFolder()) {
            return
        }
        const suggestedFileName = await this.defaultFilenameForProblem()
        const fileUri = this.findFileInWorkspace(suggestedFileName)
        if (!fileUri) {
            throw new Error(`File ${suggestedFileName} does not exist in workspace!`)
        }
        const document = await vscode.workspace.openTextDocument(fileUri)
        vscode.window.showTextDocument(document, vscode.ViewColumn.One)
    }

    async addNewTestcase(): Promise<void> {
        this.log.info(`addNewTestcase`)

        const workspaceFolder = getWorkspaceFolder()
        if (!workspaceFolder) {
            return
        }
        const fileUri = await FileService.createNewTestcaseFile(this.problem_)
        if (!fileUri) {
            return
        }
        const document = await vscode.workspace.openTextDocument(fileUri)
        vscode.window.showTextDocument(document, vscode.ViewColumn.One)
    }

    async createStarterCode(): Promise<void> {
        const workspaceFolder = getWorkspaceFolder()
        if (!workspaceFolder) {
            return
        }
        const fileUri = await FileService.createNewFileFor(this.problem_)
        if (!fileUri) {
            return
        }
        const document = await vscode.workspace.openTextDocument(fileUri)
        await vscode.window.showTextDocument(document, vscode.ViewColumn.One)
    }

    private async __fileBody(
        langInfo: LanguageInfo,
        handler: string,
        source_modifier: string
    ): Promise<string | Uint8Array<ArrayBufferLike>> {
        switch (handler) {
            case "std": {
                switch (source_modifier) {
                    case "no_main": {
                        return this.__stdNoMainBody(langInfo)
                    }
                    default: {
                        switch (langInfo.proglang) {
                            case Proglang.CPP: {
                                return `#include <iostream>\nusing namespace std;\n\nint main() {\n\n}\n`
                            }
                            default: {
                                return ``
                            }
                        }
                    }
                }
            }
            default: {
                throw new Error(`Handler '${handler}' unimplemented yet`)
            }
        }
    }

    private async __stdNoMainBody(
        langInfo: LanguageInfo
    ): Promise<Uint8Array<ArrayBufferLike>> {
        const { problem_id } = this.problem_

        const findTemplate = async () => {
            const templateList = await JutgeService.getTemplateList(problem_id)
            for (const template of templateList) {
                const ext = extname(template)
                if (langInfo.extensions.includes(ext)) {
                    return template
                }
            }
            return null
        }

        const template = await findTemplate()
        if (template === null) {
            throw new Error(`No template for language ${langInfo.proglang}`)
        }
        this.log.info(`Found template '${template}'`)

        const { data, name, type } = await JutgeService.getTemplate(problem_id, template)

        this.log.info(
            `Got template '${template}': ${name} - ${type} (${data.constructor.name})`
        )
        return data
    }

    async runTestcaseByIndex(index: number): Promise<boolean> {
        try {
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
            const testcases = await this.__ensureTestcases()
            this.log.debug(
                `Running all testcases for problem ${this.problem_.problem_id}`
            )

            let allPassed = true
            for (let index = 1; index <= testcases.length; index++) {
                allPassed = allPassed && (await this.runTestcaseByIndex(index))
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
        let editor = await chooseFromEditorList(vscode.window.visibleTextEditors)
        if (!editor) {
            vscode.window.showErrorMessage("No text editor open.")
            return
        }
        await SubmissionService.submitProblem(this.problem_, editor.document.uri.fsPath)
    }

    async __runExpecting(
        testcase: InputExpected,
        filePath: string
    ): Promise<TestcaseRun> {
        try {
            const proglang = proglangFromFilepath(filePath)
            const runner = proglangInfoGet(proglang).runner
            const document = await this.__getDocument(filePath)

            this.log.debug(`Executing code with ${runner.constructor.name}`)
            const output = runner.run(filePath, testcase.input, document)
            this.log.debug(`Code execution completed`)

            const passed = output !== null && output === testcase.expected
            return {
                status: passed ? TestcaseStatus.PASSED : TestcaseStatus.FAILED,
                output,
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
        const output = runner.run(filePath, input, document)
        this.log.debug(`Code execution completed`)

        return output
    }

    async __sendMessage(
        command: VSCodeToWebviewCommand,
        problemNm: string,
        testcaseId: number,
        status: TestcaseStatus,
        output: string | null = ""
    ) {
        const message = {
            command,
            data: { testcaseId, status, output },
        }
        WebviewPanelRegistry.sendMessage(problemNm, message)
    }

    async __sendUpdate(
        problemNm: string,
        testcaseId: number,
        status: TestcaseStatus,
        output: string | null = ""
    ) {
        this.__sendMessage(
            VSCodeToWebviewCommand.UPDATE_TESTCASE,
            problemNm,
            testcaseId,
            status,
            output
        )
    }

    async __sendUpdateCustom(
        problemNm: string,
        testcaseId: number,
        status: TestcaseStatus,
        output: string | null = ""
    ) {
        this.__sendMessage(
            VSCodeToWebviewCommand.UPDATE_CUSTOM_TESTCASE,
            problemNm,
            testcaseId,
            status,
            output
        )
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

    async __getTestcase(index: number): Promise<{ input: string; expected: string }> {
        const testcases = await this.__ensureTestcases()
        const k = index - 1 // Testcases are 1-indexed to be consistent with the UI.
        if (k < 0 || k >= testcases.length) {
            throw new Error(`Internal error: testcase index ${index} does not exist!`)
        }
        return decodeTestcase(testcases[k])
    }

    async __getCustomTestcase(index: number): Promise<string> {
        const customTestcases = this.customTestcases_
        if (customTestcases === null) {
            throw new Error(`Internal Error: there are no custom testcases!`)
        }
        const k = index - 1
        if (k < 0 || k >= customTestcases.length) {
            throw new Error(
                `Internal error: custom testcase index ${index} does not exist!`
            )
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

/**
 * Make a new problem handler AND initialize fields that required an `async` function.
 * We hide this interface behind this function.
 *
 * @param problem
 * @returns The problem handler
 */
export const makeProblemHandler = async (
    problem: Problem,
    customTestcases: CustomTestcase[] | null
) => {
    const handler = new ProblemHandler(problem, customTestcases)
    await handler.initProglang()
    return handler
}
