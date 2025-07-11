import { Testcase } from "@/jutge_api_client"
import { WebviewPanelRegistry } from "@/providers/problem-webview/panel-registry"
import {
    chooseProgrammingLanguage,
    infoForProglang,
    LanguageInfo,
    Proglang,
    proglangFromCompiler,
    proglangFromFilepath,
} from "@/services/runners/languages"
import { InputExpected, Problem, TestcaseRun, TestcaseStatus, VSCodeToWebviewCommand } from "@/types"
import { chooseFromEditorList, decodeTestcase, Logger, stringToFilename } from "@/utils"
import fs from "fs"
import * as vscode from "vscode"
import { JutgeService } from "./jutge"
import { SubmissionService } from "./submission"
import { extname } from "path"

export interface IProblemHandler {
    createStarterCode(): Promise<void>
    runTestcaseByIndex(index: number): Promise<boolean>
    runTestcaseAll(): Promise<boolean>
    submitToJudge(): Promise<void>
}

export class ProblemHandler extends Logger implements IProblemHandler {
    problem: Problem

    constructor(problem: Problem) {
        super()

        this.problem = problem

        // Launch loading of testcases already
        if (!this.problem.testcases) {
            JutgeService.getSampleTestcases(this.problem.problem_id).then(
                (testcases) => (this.problem.testcases = testcases)
            )
        }
    }

    async createStarterCode(): Promise<void> {
        // Check that there is a workspace open
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0]
        if (!workspaceFolder) {
            vscode.window.showErrorMessage("No workspace folder open.")
            return
        }

        // Collect handler info
        const handler = this.problem.handler?.handler || ""
        const source_modifier = this.problem.handler?.source_modifier || ""
        const compilers = this.problem.handler?.compilers
        let compiler_id = ""
        if (Array.isArray(compilers)) {
            compiler_id = compilers[0]
        } else if (typeof compilers === "string") {
            compiler_id = compilers
        }

        // Determine programming language
        let proglang: Proglang | null = Proglang.CPP
        try {
            if (compiler_id) {
                proglang = proglangFromCompiler(compiler_id)
                if (!proglang) {
                }
            } else {
                proglang = await chooseProgrammingLanguage(this.problem.problem_nm)
                if (!proglang) {
                    return // user cancelled
                }
            }
        } catch (e) {
            vscode.window.showErrorMessage(`Could not determine programming language`)
            return
        }

        // Generate filename from problem and language info
        const langInfo = infoForProglang(proglang)
        const sanitizedTitle = stringToFilename(this.problem.title)
        const defaultExtension = langInfo.extensions[0]

        const suggestedFileName = `${this.problem.problem_id}_${sanitizedTitle}${defaultExtension}`

        // Ask the user where to save the file
        const fileUri = await vscode.window.showSaveDialog({
            defaultUri: vscode.Uri.joinPath(workspaceFolder.uri, suggestedFileName),
            filters: { "All files": ["*"] },
            saveLabel: "Create",
            title: `Create new file for ${this.problem.title}`,
        })
        if (!fileUri) {
            return // user cancelled
        }

        // TODO: If extension is changed by user in the save dialog, update fileLang?

        // Write file with starter content
        try {
            const comment = langInfo.commentPrefix

            const profileRes = JutgeService.getProfileSWR()
            const profile = profileRes.data
            const fileHeader = [
                `${comment} ${this.problem.title}\n`,
                `${comment} https://jutge.org/problems/${this.problem.problem_id}\n`,
                `${comment} ${this.problem.problem_id}:${handler}:${source_modifier}:${compiler_id}\n`,
                `${comment} Created on ${new Date().toLocaleString()} ${profile ? `by ${profile.name}` : ``}\n`,
                `\n`,
            ].join("")

            const body = await this.__fileBody(langInfo, handler, source_modifier)
            if (typeof body === "string") {
                this.log.info(`Wrote string to ${fileUri.fsPath}`)
                fs.writeFileSync(fileUri.fsPath, fileHeader + body)
            } else {
                this.log.info(`Wrote Uint8Array to ${fileUri.fsPath}`)
                fs.writeFileSync(fileUri.fsPath, body)
            }
            //
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to create file in ${fileUri.fsPath}: ${error}`)
            throw error
        }

        const document = await vscode.workspace.openTextDocument(fileUri)
        vscode.window.showTextDocument(document, vscode.ViewColumn.One)
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

    private async __stdNoMainBody(langInfo: LanguageInfo): Promise<Uint8Array<ArrayBufferLike>> {
        const { problem_id } = this.problem

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

        this.log.info(`Got template '${template}': ${name} - ${type} (${data.constructor.name})`)
        return data
    }

    async runTestcaseByIndex(index: number): Promise<boolean> {
        try {
            const filePath = await this.__getEditorFilepath()
            this.log.debug(`Running testcase on file ${filePath}`)

            const testcase = await this.__getTestcase(index)
            this.log.debug(`Running testcase ${index}`)

            const { problem_nm } = this.problem
            this.__sendMessage(problem_nm, index, TestcaseStatus.RUNNING)
            const { status, output } = await this.__run(testcase, filePath)
            this.__sendMessage(problem_nm, index, status, output)

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

    async runTestcaseAll(): Promise<boolean> {
        try {
            const testcases = await this.__ensureTestcases()
            this.log.debug(`Running all testcases for problem ${this.problem.problem_id}`)

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
        SubmissionService.submitProblem(this.problem, editor.document.uri.fsPath)
    }

    async __run(testcase: InputExpected, filePath: string): Promise<TestcaseRun> {
        try {
            const proglang = proglangFromFilepath(filePath)
            const runner = infoForProglang(proglang).runner
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

    async __sendMessage(problemNm: string, testcaseId: number, status: TestcaseStatus, output: string | null = "") {
        const message = {
            command: VSCodeToWebviewCommand.UPDATE_TESTCASE,
            data: { testcaseId, status, output },
        }
        WebviewPanelRegistry.sendMessage(problemNm, message)
    }

    async __getEditorFilepath(): Promise<string> {
        const editor = await chooseFromEditorList(vscode.window.visibleTextEditors)
        if (!editor) {
            throw new Error(`No text editor open`)
        }
        return editor.document.uri.fsPath
    }

    async __ensureTestcases(): Promise<Testcase[]> {
        const { testcases } = this.problem
        if (!testcases || testcases.length === 0) {
            throw new Error(`No testcases found for problem ${this.problem.problem_nm}`)
        }
        this.log.debug(`Found ${testcases.length} testcases for problem ${this.problem.problem_nm}`)
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

    async __getDocument(filePath: string): Promise<vscode.TextDocument> {
        const document = vscode.workspace.textDocuments.find((doc) => doc.uri.fsPath === filePath)
        if (!document) {
            this.log.error(`File ${filePath} not found in workspace documents`)
            throw new Error("File not found in the workspace.")
        }
        return document
    }
}
