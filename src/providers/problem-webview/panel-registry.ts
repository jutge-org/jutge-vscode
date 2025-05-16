import * as vscode from "vscode"

import { getWebviewOptions } from "@/extension"
import * as utils from "@/utils"
import { VSCodeToWebviewMessage } from "@/types"
import { ProblemWebviewPanel } from "./panel"

export class WebviewPanelRegistry {
    private static createdPanels: Map<string, ProblemWebviewPanel> = new Map()

    /**
     * Creates a new problem webview panel.
     *
     * @param context The context of the extension.
     * @param problemNm The problem number.
     */
    public static async createOrShow(context: vscode.ExtensionContext, problemNm: string) {
        console.debug(`[WebviewPanelRegistry] Attempting to show panel for problem ${problemNm}`)

        if (!(await utils.isProblemValidAndAccessible(problemNm))) {
            console.warn(`[WebviewPanelRegistry] Problem ${problemNm} not valid or accessible`)
            vscode.window.showErrorMessage("Problem not valid or accessible.")
            return
        }

        // Get an existing panel if it exists
        const [existingPanel] = [...this.createdPanels.values()]
        const viewColumn = existingPanel?.panel.viewColumn || vscode.ViewColumn.Beside

        // If we already have a panel, show it.
        if (this.createdPanels.has(problemNm)) {
            console.debug(`[WebviewPanelRegistry] Reusing existing panel for ${problemNm}`)
            let panel = this.createdPanels.get(problemNm) as ProblemWebviewPanel
            panel.panel.reveal(viewColumn, true)
            return this.createdPanels.get(problemNm)
        }

        console.debug(`[WebviewPanelRegistry] Creating new panel for ${problemNm}`)
        const webviewPanel = vscode.window.createWebviewPanel(
            ProblemWebviewPanel.viewType,
            problemNm,
            { viewColumn, preserveFocus: true },
            getWebviewOptions(context.extensionUri)
        )
        const panel = new ProblemWebviewPanel(webviewPanel, context, { problemNm })
        this.createdPanels.set(problemNm, panel)
        return panel
    }

    public static register(problemNm: string, panel: ProblemWebviewPanel) {
        this.createdPanels.set(problemNm, panel)
    }

    public static get(problemNm: string) {
        return this.createdPanels.get(problemNm)
    }

    public static remove(problemNm: string) {
        this.createdPanels.delete(problemNm)
    }

    public static sendMessage(problemNm: string, message: VSCodeToWebviewMessage) {
        const panel = this.createdPanels.get(problemNm)
        if (panel) {
            panel.panel.webview.postMessage(message)
        } else {
            console.error(`Panel ${problemNm} not found.`)
        }
    }
}
