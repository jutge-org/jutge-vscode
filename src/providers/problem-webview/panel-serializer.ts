import { Logger } from "@/utils"
import * as vscode from "vscode"
import { ProblemWebviewPanel } from "./panel"
import { WebviewPanelRegistry } from "./panel-registry"

export class ProblemWebviewPanelSerializer
    extends Logger
    implements vscode.WebviewPanelSerializer
{
    private readonly context_: vscode.ExtensionContext

    constructor(context: vscode.ExtensionContext) {
        super()
        this.context_ = context
    }

    async deserializeWebviewPanel(webviewPanel: vscode.WebviewPanel, state: any) {
        try {
            this.log.debug(
                `Deserializing webview panel with state: ${JSON.stringify(state)}`
            )
            if (!state?.problemNm) {
                this.log.warn("[WebviewPanel] No problem number found in state")
                webviewPanel.dispose()
                return
            }

            const panel = new ProblemWebviewPanel(webviewPanel, this.context_, {
                problemNm: state.problemNm,
            })
            WebviewPanelRegistry.register(state.problemNm, panel)
        } catch (error) {
            this.log.error("[WebviewPanel] Error deserializing webview panel: ", error)
            webviewPanel.dispose()
        }
    }
}
