import { Testcase } from "@/jutge_api_client"
import { WebviewPanelRegistry } from "@/providers/problem-webview/panel-registry"
import { getLangIdFromFilePath, getLangRunnerFromLangId } from "@/runners/language/languages"
import { InputExpected, Problem, TestcaseRun, TestcaseStatus, VSCodeToWebviewCommand } from "@/types"
import { chooseFromEditorList, decodeTestcase, Logger } from "@/utils"
import * as vscode from "vscode"
import { FileService } from "./file"
import { JutgeService } from "./jutge"
import { SubmissionService } from "./submission"

export interface IProblemHandler {
    createStarterCode(): Promise<void>
    runTestcaseByIndex(index: number): Promise<boolean>
    runTestcaseAll(): Promise<boolean>
    submitToJudge(): Promise<void>
}

export function createProblemHandlerFor(problem: Problem) {
    return new ProblemHandler(problem)
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
        const fileUri = await FileService.createNewFileFor(this.problem)
        if (!fileUri) {
            return
        }
        await FileService.showFileInColumn(fileUri, vscode.ViewColumn.One)
    }

    async runTestcaseByIndex(index: number): Promise<boolean> {
        try {
            const filePath = await this.__getEditorFilepath()
            this.log.debug(`Running testcase on file ${filePath}`)

            const testcase = await this.__getTestcase(index)
            this.log.debug(`Running testcase ${index}`)

            this.__sendMessage(this.problem.problem_nm, index, TestcaseStatus.RUNNING, "")
            const { status, output } = await this.__run(testcase, filePath)
            this.__sendMessage(this.problem.problem_nm, index, status, output)

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
            const languageRunner = getLangRunnerFromLangId(getLangIdFromFilePath(filePath))
            const document = await this.__getDocument(filePath)

            // Run the test - terminal will only show if there are errors
            this.log.debug(`Executing code with ${languageRunner.constructor.name}`)
            const output = languageRunner.run(filePath, testcase.input, document)
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

    async __sendMessage(problemNm: string, testcaseId: number, status: TestcaseStatus, output: string | null) {
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
