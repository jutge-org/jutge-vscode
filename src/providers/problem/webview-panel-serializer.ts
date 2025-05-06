import * as vscode from "vscode"
import { WebviewPanelRegistry } from "./webview-panel-registry"
import { ProblemWebviewPanel } from "./webview-panel"

export class ProblemWebviewPanelSerializer implements vscode.WebviewPanelSerializer {
    private readonly _extensionUri: vscode.Uri

    constructor(extensionUri: vscode.Uri) {
        this._extensionUri = extensionUri
    }

    async deserializeWebviewPanel(webviewPanel: vscode.WebviewPanel, state: any) {
        try {
            console.debug(
                `[ProblemWebviewPanelSerializer] Deserializing webview panel with state: ${JSON.stringify(state)}`
            )
            if (!state?.problemNm) {
                console.warn("[WebviewPanel] No problem number found in state")
                webviewPanel.dispose()
                return
            }

            const panel = new ProblemWebviewPanel(webviewPanel, this._extensionUri, state.problemNm)
            WebviewPanelRegistry.register(state.problemNm, panel)
        } catch (error) {
            console.error("[WebviewPanel] Error deserializing webview panel: ", error)
            webviewPanel.dispose()
        }
    }
}
