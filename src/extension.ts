import * as os from "os"
import * as vscode from "vscode"

import { TreeViewProvider } from "@/providers/tree-view/provider"
import { ProblemWebviewPanel } from "@/providers/web-view/problem-panel"
import { AuthService } from "@/services/AuthService"
import { ConfigService } from "@/services/ConfigService"
import { JutgeApiClient } from "./jutge_api_client"
import { ProblemWebviewPanelSerializer } from "./providers/web-view/problem-panel-serializer"
import { jutgeVSCodeShowProblemCommand } from "./commands/show-problem"

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

    // Register WebView Commands
    context.subscriptions.push(
        vscode.commands.registerCommand("jutge-vscode.showProblem", jutgeVSCodeShowProblemCommand(context))
    )
    vscode.window.registerWebviewPanelSerializer(
        ProblemWebviewPanel.viewType,
        new ProblemWebviewPanelSerializer(context.extensionUri)
    )

    // Register TreeView Commands
    const treeViewProvider = new TreeViewProvider()
    context.subscriptions.push(vscode.window.registerTreeDataProvider("jutgeTreeView", treeViewProvider))
    context.subscriptions.push(
        vscode.commands.registerCommand("jutge-vscode.refreshTree", () => treeViewProvider.refresh())
    )
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
