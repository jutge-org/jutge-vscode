import * as os from "os"
import * as vscode from "vscode"

import { JutgeCourseTreeProvider } from "@/providers/tree-view/provider"
import { ConfigService } from "@/services/config"
import { commandRefreshTree, commandShowProblem } from "./commands/show-problem"
import { ProblemWebviewPanel } from "./providers/problem-webview/panel"
import { ProblemWebviewPanelSerializer } from "./providers/problem-webview/panel-serializer"
import { JutgeService } from "./services/jutge"

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

let context_: vscode.ExtensionContext | undefined = undefined

export const getIconUri = (theme: "dark" | "light", filename: string) => {
    if (!context_) {
        throw new Error(`Context is undefined!!!`)
    }
    return vscode.Uri.joinPath(context_.extensionUri, "resources", theme, filename)
}

export const globalStateGet = (key: string): string | undefined => {
    if (!context_) {
        throw new Error(`Context is undefined!!!`)
    }
    return context_.globalState.get(key)
}

export const globalStateUpdate = (key: string, value: string): void => {
    if (!context_) {
        throw new Error(`Context is undefined!!!`)
    }
    context_.globalState.update(key, value)
}

/**
 * Works as entrypoint when the extension is activated.
 * It is responsible for registering commands and other extension components.
 *
 * @param context Provides access to utilities to manage the extension's lifecycle.
 */
export async function activate(context: vscode.ExtensionContext) {
    context_ = context

    const extension = vscode.extensions.getExtension("jutge.jutge-vscode")
    const extensionVersion = extension?.packageJSON.version || "unknown"

    console.info("=== jutge-vscode initialization ===")
    console.info(`Extension Version: ${extensionVersion}`)
    console.info(`VS Code Version: ${vscode.version}`)
    console.info(`Operating System: ${os.type()} ${os.release()} ${os.arch()}`)
    console.info(`Node.js Version: ${process.version}`)
    console.info(`Date: ${new Date().toISOString()}`)
    console.info("===================================")

    await JutgeService.initialize(context)
    ConfigService.initialize()

    const registerCommand = (command: string, callback: (...args: any[]) => any) => {
        const disposable = vscode.commands.registerCommand(command, callback)
        context.subscriptions.push(disposable)
    }

    const registerWebviewPanelSerializer = (
        viewType: string,
        serializer: vscode.WebviewPanelSerializer
    ) => {
        const disposable = vscode.window.registerWebviewPanelSerializer(
            viewType,
            serializer
        )
        context.subscriptions.push(disposable)
    }

    const jutgeCourseTreeProvider = new JutgeCourseTreeProvider(context)
    const treeView = vscode.window.createTreeView("jutgeTreeView", {
        showCollapseAll: true,
        treeDataProvider: jutgeCourseTreeProvider,
    })

    treeView.onDidExpandElement(({ element }) => {
        console.log(`Expanded -> ${element.getId()}!`)
        context.globalState.update(`itemState:${element.getId()}`, "expanded")
    })
    treeView.onDidCollapseElement(({ element }) => {
        console.log(`Collapsed -> ${element.key}`)
        context.globalState.update(`itemState:${element.getId()}`, "collapsed")
    })

    const serializer = new ProblemWebviewPanelSerializer(
        context,
        jutgeCourseTreeProvider.onVeredictMaker
    )
    registerWebviewPanelSerializer(ProblemWebviewPanel.viewType, serializer)

    registerCommand("jutge-vscode.signIn", JutgeService.signIn)
    registerCommand("jutge-vscode.signOut", JutgeService.signOut)
    registerCommand("jutge-vscode.signInExam", JutgeService.signInExam)

    registerCommand(
        "jutge-vscode.showProblem",
        commandShowProblem(context, jutgeCourseTreeProvider)
    )
    registerCommand(
        "jutge-vscode.refreshTree",
        commandRefreshTree(jutgeCourseTreeProvider)
    )

    console.info("[Extension] jutge-vscode is now active")
}
