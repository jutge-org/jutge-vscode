import * as vscode from "vscode"
import { WebviewPanelRegistry } from "./webview-panel-registry"
import { ProblemWebviewPanel } from "./webview-panel"

export class ProblemWebviewPanelSerializer implements vscode.WebviewPanelSerializer {
    private readonly context_: vscode.ExtensionContext

    constructor(context: vscode.ExtensionContext) {
        this.context_ = context
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

            const panel = new ProblemWebviewPanel(webviewPanel, this.context_, {
                problemNm: state.problemNm,
            })
            WebviewPanelRegistry.register(state.problemNm, panel)
        } catch (error) {
            console.error("[WebviewPanel] Error deserializing webview panel: ", error)
            webviewPanel.dispose()
        }
    }
}
