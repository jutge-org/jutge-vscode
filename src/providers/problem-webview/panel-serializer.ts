import * as vscode from "vscode"
import { WebviewPanelRegistry } from "./panel-registry"
import { ProblemWebviewPanel } from "./panel"
import { Logger } from "@/utils"
import { JutgeCourseTreeProvider } from "../tree-view/provider"
import { OnVeredictMaker } from "@/types"

export class ProblemWebviewPanelSerializer
    extends Logger
    implements vscode.WebviewPanelSerializer
{
    private readonly context_: vscode.ExtensionContext
    private readonly onVeredictMaker_: (problemNm: string) => () => void

    constructor(context: vscode.ExtensionContext, onVeredictMaker: OnVeredictMaker) {
        super()
        this.context_ = context
        this.onVeredictMaker_ = onVeredictMaker
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

            const panel = new ProblemWebviewPanel(
                webviewPanel,
                this.context_,
                this.onVeredictMaker_(state.problemNm),
                {
                    problemNm: state.problemNm,
                }
            )
            WebviewPanelRegistry.register(state.problemNm, panel)
        } catch (error) {
            this.log.error("[WebviewPanel] Error deserializing webview panel: ", error)
            webviewPanel.dispose()
        }
    }
}
