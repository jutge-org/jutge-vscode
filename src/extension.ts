import * as vscode from "vscode";
import * as j from "./jutgeClient";

import { getTokenAtActivation, registerAuthCommands } from "./jutgeAuth";
import { registerWebviewCommands } from "./webviewProvider";
import { registerTreeViewCommands } from "./treeviewProvider";
import { removeExtensionContext, setExtensionContext } from "./context";

/**
 * Works as entrypoint when the extension is activated.
 * It is responsible for registering commands and other extension components.
 *
 * @param context Provides access to utilities to manage the extension's lifecycle.
 */
export async function activate(context: vscode.ExtensionContext) {
    setExtensionContext(context);

    const token = await getTokenAtActivation();
    if (token) {
        j.setMeta(token);
        await context.secrets.store("jutgeToken", token);
    }

    /* Authentication */
    registerAuthCommands(context);

    /* WebView */
    registerWebviewCommands(context);

    /* TreeView */
    registerTreeViewCommands(context);

    console.log("jutge-vscode is now active");
}

export function deactivate() {
    removeExtensionContext();
}
