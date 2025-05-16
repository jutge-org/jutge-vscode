import { runAllTestcases, runSingleTestcase } from "@/runners/problem"
import { Problem } from "@/types"
import { chooseFromEditorList } from "@/utils"
import * as vscode from "vscode"
import { FileService } from "./file"
import { SubmissionService } from "./submission"

export interface IProblemHandler {
    runTestcaseAll(): Promise<void>
    submitToJudge(): Promise<void>
    runTestcaseSingle(id: number): Promise<void>
    createStarterCode(): Promise<void>
}

export class ProblemHandler implements IProblemHandler {
    problem: Problem

    constructor(problem: Problem) {
        this.problem = problem
    }

    async createStarterCode(): Promise<void> {
        const fileUri = await FileService.createNewFileFor(this.problem)
        if (!fileUri) {
            return
        }
        await FileService.showFileInColumn(fileUri, vscode.ViewColumn.One)
    }

    async runTestcaseAll(): Promise<void> {
        let editor = await chooseFromEditorList(vscode.window.visibleTextEditors)
        if (!editor) {
            vscode.window.showErrorMessage("No text editor open.")
            return
        }
        runAllTestcases(this.problem, editor.document.uri.fsPath)
    }

    async runTestcaseSingle(id: number): Promise<void> {
        let editor = await chooseFromEditorList(vscode.window.visibleTextEditors)
        if (!editor) {
            vscode.window.showErrorMessage("No text editor open.")
            return
        }
        runSingleTestcase(id, this.problem, editor.document.uri.fsPath)
    }

    async submitToJudge(): Promise<void> {
        let editor = await chooseFromEditorList(vscode.window.visibleTextEditors)
        if (!editor) {
            vscode.window.showErrorMessage("No text editor open.")
            return
        }
        SubmissionService.submitProblem(this.problem, editor.document.uri.fsPath)
    }
}

export function createProblemHandlerFor(problem: Problem) {
    return new ProblemHandler(problem)
}
