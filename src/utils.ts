import * as fs from "fs"
import { basename, dirname, extname, join } from "path"
import * as vscode from "vscode"
import { Testcase } from "./jutge_api_client"
import { Problem } from "./types"
import {
    Proglang,
    getProglangExtensions,
    proglangFromCompiler,
    proglangInfoGet,
} from "./services/runners/languages"
import { getWorkspaceFolder } from "./extension"
import { readdir } from "fs/promises"
import { JutgeService } from "./services/jutge"

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
    const preferredLang = vscode.workspace
        .getConfiguration("jutge-vscode")
        .get("problem.preferredLang") as string
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

export function sanitizeTitle(title: string): string {
    title = title.replace(/ /g, "_") // Replace spaces with underscores
    title = title.replace(/[^a-zA-Z0-9_]/g, "") // Remove other special characters except underscores
    return title
}

export function decodeTestcase(testcase: Testcase): { input: string; expected: string } {
    const { input_b64, correct_b64 } = testcase
    const input = Buffer.from(input_b64, "base64").toString("utf-8")
    const expected = Buffer.from(correct_b64, "base64").toString("utf-8")
    return { input, expected }
}

export function fileExistsOrThrow(filePath: string) {
    if (!fs.existsSync(filePath)) {
        throw new Error(`File '${filePath}' does not exist.`)
    }
}

const jutgeFileRegex = /([P-Z]\d{5}).*/

export function getProblemIdFromFilename(filePath: string) {
    const m = filePath.match(jutgeFileRegex)
    return m === null ? null : m[1]
}

export function fileUriExists(fileUri: vscode.Uri | null): boolean {
    return fileUri ? fs.existsSync(fileUri.fsPath) : false
}

export function getCompilerId(problem: Problem): string {
    const compilers = problem.handler?.compilers
    let compiler_id = ""
    if (Array.isArray(compilers)) {
        compiler_id = compilers[0]
    } else if (typeof compilers === "string") {
        compiler_id = compilers
    }
    return compiler_id
}

export function getProglangFromProblem(problem: Problem): Proglang | null {
    const compiler_id = getCompilerId(problem)
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

export function defaultFilenameForProblem(problem: Problem) {
    const { problem_id, title } = problem
    const proglang = getProglangFromProblem(problem) || Proglang.CPP
    const langInfo = proglangInfoGet(proglang)
    const defaultExtension = langInfo.extensions[0]
    return {
        filename: `${problem_id}_${sanitizeTitle(title)}`,
        extension: defaultExtension,
    }
}

export async function findCodeFilenameForProblem(
    problemNm: string
): Promise<vscode.Uri | null> {
    const problemId = getDefaultProblemId(problemNm)

    const workspace = getWorkspaceFolder()
    if (!workspace) {
        return null
    }

    const proglangExtensions = getProglangExtensions()

    // Find files that match
    const candidates: vscode.Uri[] = []
    for (let ent of await readdir(workspace.uri.fsPath, { withFileTypes: true })) {
        const extension = extname(ent.name)
        if (
            ent.isFile() &&
            ent.name.startsWith(problemId) &&
            proglangExtensions.includes(extension)
        ) {
            candidates.push(vscode.Uri.joinPath(workspace.uri, ent.name))
        }
    }

    return candidates[0] || null
}

export function string2Uint8Array(data: string): Uint8Array<ArrayBufferLike> {
    const encoder = new TextEncoder()
    return encoder.encode(data)
}

const endsWithParenNumRegex = / \(([0-9]+)\)$/

export function addParenthesizedNumerToPath(path: string): string {
    const baseDir = dirname(path)
    const filename = basename(path)
    const extension = extname(filename)

    let filenameNoExt = filename.slice(0, -extension.length)

    const match = filenameNoExt.match(endsWithParenNumRegex)
    let num: number = 1
    let newFilename: string = filenameNoExt
    if (match) {
        num = 1 + Number(match[1])
        newFilename = filenameNoExt.slice(0, match.index)
    }
    newFilename += ` (${num})` + extension
    return join(baseDir, newFilename)
}

export function findFirstAvailableNumberedFilename(path: string): string {
    while (fs.existsSync(path)) {
        path = addParenthesizedNumerToPath(path)
    }
    return path
}
