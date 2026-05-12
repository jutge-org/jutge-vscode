import * as vscode from "vscode"

//// Commands

import { JutgeService } from "./services/jutge"
import {
    confirmSignOut,
    findCodeFilenameForProblem,
    showCodeDocument,
    whenWorkspaceFolder,
} from "./utils"
import { WebviewPanelRegistry } from "./providers/problem-webview/panel-registry"
import { JutgeVSCodeExtension } from "./extension"

export const showProblem = async (problemNm: string | undefined, order: number) => {
    console.debug(`[commandShowProblem] Problem ${problemNm} (order = ${order})`)

    if (!JutgeService.isSignedIn()) {
        vscode.window.showErrorMessage("You need to sign in to Jutge.org to use this feature.")
        return
    }

    // If the command is called from the command palette, ask for the problem number.
    if (problemNm === undefined) {
        if (JutgeService.isExamMode()) {
            vscode.window.showErrorMessage(
                "In exam mode you can only see problems from the exam"
            )
            return
        }

        problemNm = await vscode.window.showInputBox({
            title: "Jutge Problem ID",
            placeHolder: "P12345",
            prompt: "Please write the problem ID.",
            value: "",
        })
        if (!problemNm) {
            return
        }
    }

    // Check that the problem really exists
    if (!(await JutgeService.problemExists(problemNm))) {
        vscode.window.showErrorMessage(`Problem ${problemNm} does not exist`)
        return
    }

    await whenWorkspaceFolder(async (workspace) => {
        const fileUri = await findCodeFilenameForProblem(workspace, problemNm)
        if (fileUri) {
            const document = await vscode.workspace.openTextDocument(fileUri)
            await showCodeDocument(document)
        }
    })

    await WebviewPanelRegistry.createOrReveal(problemNm, order)

    // Force update on "Open Existing File" button + custom testcases
    await WebviewPanelRegistry.notifyProblemFilesChanges(problemNm)
}

export const signIn = async () => {
    if (JutgeService.isSignedIn()) {
        vscode.window.showInformationMessage("Jutge.org: You are already signed in.")
        return
    }

    const token = await JutgeService.getTokenFromCredentials()
    if (!token) {
        return
    }
    await JutgeService.setSignedIn(token)

    vscode.commands.executeCommand("jutge-vscode.refreshCoursesTree")
    vscode.window.showInformationMessage("Jutge.org: You have signed in.")

    JutgeService.getProfileSWR() // cache for later
}

export const signOut = async (options?: {
    askConfirmation: boolean
    message: string
}): Promise<void> => {
    try {
        const askConfirmation = options?.askConfirmation || true
        if (askConfirmation) {
            if (!(await confirmSignOut())) {
                return
            }
        }

        JutgeService.storeToken(undefined)
        await JutgeService.setSignedOut()

        vscode.commands.executeCommand("jutge-vscode.refreshCoursesTree")

        const message = options?.message || "You have signed out"
        vscode.window.showInformationMessage(`Jutge.org: ${message}`)
    } catch (e) {
        console.error(e)
    }
}

export const examSignIn = async () => {
    if (JutgeService.isSignedIn()) {
        vscode.window.showInformationMessage("Jutge.org: You are already in an exam.")
        return
    }
    const result = await JutgeService.getExamTokenFromCredentials()
    if (!result) {
        return
    }
    const { token: examToken, exam_key } = result
    if (!examToken) {
        return
    }

    await JutgeService.setSignedInExam(examToken)

    vscode.commands.executeCommand("jutge-vscode.refreshExamsTree")
    vscode.window.showInformationMessage(`Jutge.org: You have entered exam ${exam_key}.`)

    JutgeService.getProfileSWR() // cache this for later
}

export const examSignOut = async (options?: {
    askConfirmation: boolean
    message: string
}): Promise<void> => {
    try {
        const askConfirmation = options?.askConfirmation || true
        if (askConfirmation) {
            if (!(await confirmSignOut())) {
                return
            }
        }

        JutgeService.exitExamMode()
        JutgeService.storeExamToken(undefined)
        await JutgeService.setSignedOutExam()

        vscode.commands.executeCommand("jutge-vscode.refreshExamsTree")

        const message = options?.message || "You have exited the exam"
        vscode.window.showInformationMessage(`Jutge.org: ${message}`)
    } catch (e) {
        console.error(e)
    }
}

export const invalidateToken = async () => {
    JutgeService.invalidateToken()
}

export const refreshCourses = async () => {
    JutgeVSCodeExtension.singleton.refreshCourses()
}

export const refreshExams = async () => {
    JutgeVSCodeExtension.singleton.refreshExams()
}
