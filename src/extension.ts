import * as vscode from "vscode"
import * as os from "os"

import { AuthService } from "@/services/AuthService"
import { ConfigService } from "@/services/ConfigService"
import { JutgeApiClient } from "./jutge_api_client"

import { registerWebviewCommands } from "@/providers/WebviewProvider"
import { registerTreeViewCommands } from "@/providers/TreeViewProvider"

export const jutgeClient = new JutgeApiClient()

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

    registerWebviewCommands(context)
    registerTreeViewCommands(context)

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
