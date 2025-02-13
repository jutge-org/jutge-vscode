import * as vscode from "vscode"

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
    await AuthService.initialize(context) // needs to await token validation
    ConfigService.initialize()

    registerWebviewCommands(context)
    registerTreeViewCommands(context)

    console.log("jutge-vscode is now active")
}
