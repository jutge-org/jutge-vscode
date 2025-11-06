import * as os from "os"
import * as vscode from "vscode"

/*

TODO:
1. Review all problems with errors in statement, etc. 
   Make a list of things that do not work.
2. Let the user create a test-case (and store it in a file).

IDEAS:
1. Download previous submissions (so you can use Jutge as a "repo", like many people do).
   Show previous submissions and for each one show a button which will download the code.

*/

import { JutgeCourseTreeProvider } from "@/providers/tree-view/provider"
import { ConfigService } from "@/services/config"
import { ProblemWebviewPanel } from "./providers/problem-webview/panel"
import { WebviewPanelRegistry } from "./providers/problem-webview/panel-registry"
import { ProblemWebviewPanelSerializer } from "./providers/problem-webview/panel-serializer"
import { jutgeClient, JutgeService } from "./services/jutge"
import { SubmissionService } from "./services/submission"
import { findCodeFilenameForProblem, showCodeDocument } from "./utils"

/**
 * Get the webview options for the webview panel.
 *
 * @param extensionUri The uri of the extension.
 * @returns The webview options.
 */
export function getWebviewOptions(extensionUri: vscode.Uri): vscode.WebviewOptions {
    return {
        // Enable javascript in the webview
        enableScripts: true,

        // Restrict the webview to only loading content from the extension's `webview` directory.
        localResourceRoots: [
            vscode.Uri.joinPath(extensionUri, "src", "webview"),
            vscode.Uri.joinPath(extensionUri, "dist"),
        ],
    }
}

/// Keep a global copy of the context for the whole extension to use
/// (Could this be wrong? We assume that the context is the same object all the time)

let context_: vscode.ExtensionContext | undefined = undefined

const setContext_ = (context: vscode.ExtensionContext) => {
    context_ = context
}

export const getContext = (): vscode.ExtensionContext => {
    if (!context_) {
        throw new Error(`Context is undefined!!!`)
    }
    return context_
}

export async function whenWorkspaceFolder(
    bodyFunc: (workspace: vscode.WorkspaceFolder) => Promise<void>
) {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0]
    if (workspaceFolder) {
        await bodyFunc(workspaceFolder)
    }
}

export function getWorkspaceFolder(): vscode.WorkspaceFolder | undefined {
    return vscode.workspace.workspaceFolders?.[0]
}

export async function getWorkspaceFolderOrPickOne(): Promise<
    vscode.WorkspaceFolder | undefined
> {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0]
    if (workspaceFolder) {
        return workspaceFolder
    }
    const selection = await vscode.window.showInformationMessage(
        "You need to have an open folder to create source files.",
        { title: "Open Folder" }
    )
    if (selection && selection.title === "Open Folder") {
        console.log(`[Extension]: User chose to open folder`)
        vscode.commands.executeCommand("vscode.openFolder")
    }

    return undefined
}

export const getIconUri = (theme: "dark" | "light", filename: string) =>
    vscode.Uri.joinPath(getContext().extensionUri, "resources", theme, filename)

export const globalStateGet = (key: string): string | undefined =>
    getContext().globalState.get(key)

export const globalStateUpdate = (key: string, value: string) =>
    getContext().globalState.update(key, value)

const registerCommand = (command: string, callback: (...args: any[]) => any) => {
    const disposable = vscode.commands.registerCommand(command, callback)
    getContext().subscriptions.push(disposable)
}

const registerWebviewPanelSerializer = (
    viewType: string,
    serializer: vscode.WebviewPanelSerializer
) => {
    const disposable = vscode.window.registerWebviewPanelSerializer(viewType, serializer)
    getContext().subscriptions.push(disposable)
}

const showExtensionInfo = () => {
    const extension = vscode.extensions.getExtension("jutge.jutge-vscode")
    const extensionVersion = extension?.packageJSON.version || "unknown"

    console.info("=== jutge-vscode initialization ===")
    console.info(`Extension Version: ${extensionVersion}`)
    console.info(`VS Code Version:   ${vscode.version}`)
    console.info(`Operating System:  ${os.type()} ${os.release()} ${os.arch()}`)
    console.info(`Node.js Version:   ${process.version}`)
    console.info(`Date:              ${new Date().toISOString()}`)
    console.info(`MODE:              ${process.env.MODE}`)
    console.info(`JUTGE_API_URL:     ${jutgeClient.JUTGE_API_URL}`)
    console.info("===================================")
}

const initializeTreeView = () => {
    const treeProvider = new JutgeCourseTreeProvider()

    const treeView = vscode.window.createTreeView("jutgeTreeView", {
        showCollapseAll: true,
        treeDataProvider: treeProvider,
    })

    // Store the collapsed state of the "folders" in the tree (courses, lists and exams)
    // so that on reload, the tree looks exactly the same as the last time
    treeView.onDidExpandElement(({ element }) =>
        globalStateUpdate(`itemState:${element.getId()}`, "expanded")
    )
    treeView.onDidCollapseElement(({ element }) =>
        globalStateUpdate(`itemState:${element.getId()}`, "collapsed")
    )
    SubmissionService.onDidReceiveVeredict((veredict) => {
        treeProvider.refreshProblem(veredict)
    })

    return { treeProvider, treeView }
}

const registerCommands = (commands: [string, (...args: any[]) => any][]) => {
    for (const [command, callback] of commands) {
        registerCommand(command, callback)
    }
}

//// Commands

const commandShowProblem = async (problemNm: string | undefined, order: number) => {
    console.debug(`[commandShowProblem] Problem ${problemNm} (order = ${order})`)

    if (!(await JutgeService.isUserAuthenticated())) {
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

/**
 * Works as entrypoint when the extension is activated.
 * It is responsible for registering commands and other extension components.
 *
 * @param context Provides access to utilities to manage the extension's lifecycle.
 */
export async function activate(context: vscode.ExtensionContext) {
    setContext_(context)

    showExtensionInfo()

    await JutgeService.initialize(context)
    ConfigService.initialize()

    const { treeProvider } = initializeTreeView()

    registerWebviewPanelSerializer(
        ProblemWebviewPanel.viewType,
        new ProblemWebviewPanelSerializer(context)
    )

    // Update custom testcases whenever the user deletes a test file
    vscode.workspace.onDidDeleteFiles((event) => {
        WebviewPanelRegistry.updatePanelsOnChangedFiles(event.files)
    })
    vscode.workspace.onDidCreateFiles((event) => {
        WebviewPanelRegistry.updatePanelsOnChangedFiles(event.files)
    })
    vscode.workspace.onDidSaveTextDocument((event) => {
        WebviewPanelRegistry.updatePanelsOnChangedFiles([event.uri])
    })

    registerCommands([
        ["jutge-vscode.signIn", JutgeService.signIn],
        ["jutge-vscode.signOut", JutgeService.signOut],
        ["jutge-vscode.signInExam", JutgeService.signInExam],
        ["jutge-vscode.refreshTree", treeProvider.refresh],
        ["jutge-vscode.showProblem", commandShowProblem],
    ])

    console.info("[Extension] jutge-vscode is now active")
}
