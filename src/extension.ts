import * as os from "os"
import * as vscode from "vscode"

import { TreeViewProvider } from "@/providers/tree-view/provider"
import { ProblemWebviewPanel } from "@/providers/problem/webview-panel"
import { AuthService } from "@/services/auth"
import { ConfigService } from "@/services/config"
import { JutgeApiClient } from "./jutge_api_client"
import { ProblemWebviewPanelSerializer } from "./providers/problem/webview-panel-serializer"
import { commandRefreshTree, commandShowProblem } from "./commands/show-problem"

export const jutgeClient = new JutgeApiClient()

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

/**
 * Works as entrypoint when the extension is activated.
 * It is responsible for registering commands and other extension components.
 *
 * @param context Provides access to utilities to manage the extension's lifecycle.
 */
export async function activate(context: vscode.ExtensionContext) {
    logSystemInfo(context)
    await AuthService.initialize(context) // needs to await token validation
    ConfigService.initialize()

    const registerCommand = (command: string, callback: (...args: any[]) => any) => {
        const disposable = vscode.commands.registerCommand(command, callback)
        context.subscriptions.push(disposable)
    }

    const registerTreeDataProvider = (viewId: string, provider: vscode.TreeDataProvider<any>) => {
        const disposable = vscode.window.registerTreeDataProvider(viewId, provider)
        context.subscriptions.push(disposable)
    }

    const registerWebviewPanelSerializer = (viewType: string, serializer: vscode.WebviewPanelSerializer) => {
        const disposable = vscode.window.registerWebviewPanelSerializer(viewType, serializer)
        context.subscriptions.push(disposable)
    }

    const treeViewProvider = new TreeViewProvider()
    registerTreeDataProvider("jutgeTreeView", treeViewProvider)

    const serializer = new ProblemWebviewPanelSerializer(context.extensionUri)
    registerWebviewPanelSerializer(ProblemWebviewPanel.viewType, serializer)

    registerCommand("jutge-vscode.signIn", AuthService.signIn)
    registerCommand("jutge-vscode.signOut", AuthService.signOut)
    registerCommand("jutge-vscode.showProblem", commandShowProblem(context))
    registerCommand("jutge-vscode.refreshTree", commandRefreshTree(treeViewProvider))

    console.info("[Extension] jutge-vscode is now active")
}

/**
 * Logs system information to help with debugging
 */
function logSystemInfo(context: vscode.ExtensionContext) {
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
