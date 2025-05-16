import { JutgeService } from "@/services/jutge"
import { dirname } from "path"
import * as vscode from "vscode"

/**
 * A helper function that returns a unique alphanumeric identifier called a nonce.
 *
 * @remarks This function is primarily used to help enforce content security
 * policies for resources/scripts being executed in a webview context.
 *
 * @returns A nonce
 */
export function getNonce() {
    let text = ""
    const possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"
    for (let i = 0; i < 32; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length))
    }
    return text
}

type LangInfo = {
    compiler_id: string
    mimeType: string
}

const cpp: LangInfo = { compiler_id: "G++", mimeType: "text/x-c" }
const python: LangInfo = { compiler_id: "Python3", mimeType: "text/x-script.phyton" }

const _ext2langinfo: Record<string, LangInfo> = {
    ".cc": cpp,
    ".cpp": cpp,
    ".cxx": cpp,
    ".c++": cpp,
    ".py": python,
}

/**
 * A helper function that returns the compiler id for a given file extension.
 *
 * @remarks This function is used to determine the compiler id to be used when
 * submitting a file to Jutge.
 *
 * @param extension The file extension
 * @returns The compiler id
 */
export function getLangInfoFromExtension(extension: string) {
    return _ext2langinfo[extension]
}

/**
 * A helper function that returns a boolean indicating whether a given problem name is valid and accessible.
 *
 */
export async function isProblemValidAndAccessible(problemNm: string): Promise<boolean> {
    try {
        await JutgeService.getAbstractProblemSWR(problemNm)
        return true
    } catch (error) {
        return false
    }
}

export async function chooseFromEditorList(
    editors: readonly vscode.TextEditor[]
): Promise<vscode.TextEditor | undefined> {
    // Filter out non-file editors (e.g. logs, output, terminal)
    editors = editors.filter((editor) => editor.document.uri.scheme === "file")
    if (editors.length === 0) {
        return
    }
    if (editors.length === 1) {
        return editors[0]
    }

    const selectedEditor = await vscode.window.showQuickPick(
        editors.map((editor) => ({
            label: editor.document.fileName,
            description: editor.document.languageId,
            editor,
        }))
    )
    // TODO: What if
    return selectedEditor?.editor
}

export const preferredLangToLangId: { [key: string]: string } = {
    Català: "ca",
    Castellano: "es",
    English: "en",
}
export const fallbackLangOrder = ["ca", "es", "en", "fr"]

export function getDefaultProblemId(problemNm: string): string {
    const preferredLang = vscode.workspace.getConfiguration("jutge-vscode").get("problem.preferredLang") as string
    const preferredLangId = preferredLangToLangId[preferredLang]
    return problemNm + "_" + preferredLangId
}

export const getWorkingDirectory = (filename: string) => {
    let workingDir = ""
    let workspaces = vscode.workspace.workspaceFolders
    if (workspaces && workspaces.length > 0) {
        // TODO: Check that this uri is not remote?
        workingDir = workspaces[0].uri.path
    } else {
        workingDir = dirname(filename)
    }
    console.debug(`[Helpers] Working dir: "${workingDir}"`)
    return workingDir
}

export async function waitMilliseconds(time_ms: number): Promise<void> {
    return new Promise((resolve) => {
        setTimeout(() => resolve(), time_ms)
    })
}

export function stringToFilename(title: string): string {
    title = title.replace(/ /g, "_") // Replace spaces with underscores
    title = title.replace(/[^a-zA-Z0-9_]/g, "") // Remove other special characters except underscores
    return title
}
