import * as vscode from "vscode";
import axios from "axios";

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

  /* Axios setup */
  axios.defaults.baseURL = "https://api.jutge.org";
  const token = await getTokenAtActivation();
  if (token) {
    axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
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
