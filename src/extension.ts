import * as vscode from "vscode";

import { removeExtensionContext, setExtensionContext } from "@/context";

import { AuthService } from "@/services/AuthService";
import { ConfigService } from "@/services/ConfigService";

import { registerWebviewCommands } from "@/providers/WebviewProvider";
import { registerTreeViewCommands } from "@/providers/TreeViewProvider";

/**
 * Works as entrypoint when the extension is activated.
 * It is responsible for registering commands and other extension components.
 *
 * @param context Provides access to utilities to manage the extension's lifecycle.
 */
export async function activate(context: vscode.ExtensionContext) {
    setExtensionContext(context);

    await AuthService.initialize(context); // needs to wait for token to be validated
    await ConfigService.initialize();

    registerWebviewCommands(context);
    registerTreeViewCommands(context);

    console.log("jutge-vscode is now active");
}

export function deactivate() {
    removeExtensionContext();
}
