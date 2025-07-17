import * as os from "os"
import * as vscode from "vscode"

/*

TODO:
1. Change to events to communicate between parts (webview and treeview)
2. Show _status_ of a problem in the tree (not last veredict)
3. Review all problems with errors in statement, etc. 
   Make a list of things that do not work.
4. Let the user create a test-case (and store it in a file).

IDEAS:
1. Download previous submissions (so you can use Jutge as a "repo", like many people do).
   Show previous submissions and for each one show a button which will download the code.

*/

import { JutgeCourseTreeProvider } from "@/providers/tree-view/provider"
import { ConfigService } from "@/services/config"
import { ProblemWebviewPanel } from "./providers/problem-webview/panel"
import { WebviewPanelRegistry } from "./providers/problem-webview/panel-registry"
import { ProblemWebviewPanelSerializer } from "./providers/problem-webview/panel-serializer"
import { JutgeService } from "./services/jutge"
import { SubmissionService } from "./services/submission"

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

const getContext_ = (): vscode.ExtensionContext => {
    if (!context_) {
        throw new Error(`Context is undefined!!!`)
    }
    return context_
}

export function getWorkspaceFolder(): vscode.WorkspaceFolder | undefined {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0]
    if (!workspaceFolder) {
        // FIXME: Show a dialog to open a workspace instead??'
        vscode.window.showErrorMessage("No workspace folder open.")
    }
    return workspaceFolder
}

export const getIconUri = (theme: "dark" | "light", filename: string) =>
    vscode.Uri.joinPath(getContext_().extensionUri, "resources", theme, filename)

export const globalStateGet = (key: string): string | undefined =>
    getContext_().globalState.get(key)

export const globalStateUpdate = (key: string, value: string) =>
    getContext_().globalState.update(key, value)

const registerCommand = (command: string, callback: (...args: any[]) => any) => {
    const disposable = vscode.commands.registerCommand(command, callback)
    getContext_().subscriptions.push(disposable)
}

const registerWebviewPanelSerializer = (
    viewType: string,
    serializer: vscode.WebviewPanelSerializer
) => {
    const disposable = vscode.window.registerWebviewPanelSerializer(viewType, serializer)
    getContext_().subscriptions.push(disposable)
}

const showExtensionInfo = () => {
    const extension = vscode.extensions.getExtension("jutge.jutge-vscode")
    const extensionVersion = extension?.packageJSON.version || "unknown"

    console.info("=== jutge-vscode initialization ===")
    console.info(`Extension Version: ${extensionVersion}`)
    console.info(`VS Code Version: ${vscode.version}`)
    console.info(`Operating System: ${os.type()} ${os.release()} ${os.arch()}`)
    console.info(`Node.js Version: ${process.version}`)
    console.info(`Date: ${new Date().toISOString()}`)
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
        treeProvider.refreshProblem(veredict.problem_nm)
    })

    return { treeProvider, treeView }
}

const registerCommands = (commands: [string, (...args: any[]) => any][]) => {
    for (const [command, callback] of commands) {
        registerCommand(command, callback)
    }
}

//// Commands

const commandShowProblem = async (problemNm: string | undefined) => {
    console.debug(`[commandShowProblem] Problem ${problemNm}`)

    if (!(await JutgeService.isUserAuthenticated())) {
        vscode.window.showErrorMessage(
            "You need to sign in to Jutge.org to use this feature."
        )
        return
    }

    // If the command is called from the command palette, ask for the problem number.
    if (problemNm === undefined) {
        problemNm = await vscode.window.showInputBox({
            title: "Jutge Problem ID",
            placeHolder: "P12345",
            prompt: "Please write the problem ID.",
            value: "",
        })
    }

    if (problemNm) {
        WebviewPanelRegistry.createOrShow(getContext_(), problemNm)
    }
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

    registerCommands([
        ["jutge-vscode.signIn", JutgeService.signIn],
        ["jutge-vscode.signOut", JutgeService.signOut],
        ["jutge-vscode.signInExam", JutgeService.signInExam],
        ["jutge-vscode.refreshTree", treeProvider.refresh],
        ["jutge-vscode.showProblem", commandShowProblem],
    ])

    console.info("[Extension] jutge-vscode is now active")
}
