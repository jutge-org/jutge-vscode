import * as vscode from "vscode"

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
