import * as vscode from "vscode"

export class SidebarProvider implements vscode.WebviewViewProvider {

    constructor(private readonly _extensionUri: vscode.Uri) {
        console.log("SidebarProvider created")
    }

    public resolveWebviewView(webviewView: vscode.WebviewView) {

        webviewView.webview.options = {
            // Allow scripts in the webview
            enableScripts: true,
        }

        webviewView.webview.html = `

        <p>
            <img src="https://jutge.org/ico/welcome/jutge.png" width="100" />
        </p>
        <p>
            <b>Sign in to Jutge.org</b>
        </p>
        <form>
            <label for="email">Email:</label><br>
            <input type="text" id="email" name="email"><br>
            <label for="password">Password:</label><br>
            <input type="password" id="password" name="password"><br><br>
            <input type="submit" value="Submit">
        </form>
        `
    }
}