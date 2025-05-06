import * as vscode from "vscode"

import { getWebviewOptions } from "@/extension"
import * as utils from "@/utils/helpers"
import { VSCodeToWebviewMessage } from "@/utils/types"
import { ProblemWebviewPanel } from "./problem-panel"

export class WebviewPanelHandler {
    private static createdPanels: Map<string, ProblemWebviewPanel> = new Map()

    /**
     * Creates a new problem webview panel.
     *
     * @param extensionUri The uri of the extension.
     * @param problemNm The problem number.
     */
    public static async createOrShow(extensionUri: vscode.Uri, problemNm: string) {
        console.debug(`[WebviewPanel] Attempting to show problem ${problemNm}`)

        if (!(await utils.isProblemValidAndAccessible(problemNm))) {
            console.warn(`[WebviewPanel] Problem ${problemNm} not valid or accessible`)
            vscode.window.showErrorMessage("Problem not valid or accessible.")
            return
        }

        // Get column
        const [existingPanel] = [...WebviewPanelHandler.createdPanels.values()]
        const column = existingPanel?.panel.viewColumn || vscode.ViewColumn.Beside

        // If we already have a panel, show it.
        if (this.createdPanels.has(problemNm)) {
            console.debug(`[WebviewPanel] Reusing existing panel for ${problemNm}`)
            let panel = this.createdPanels.get(problemNm) as ProblemWebviewPanel
            panel.panel.reveal(column, true)
            return this.createdPanels.get(problemNm)
        }

        console.debug(`[WebviewPanel] Creating new panel for ${problemNm}`)
        const panel = vscode.window.createWebviewPanel(
            ProblemWebviewPanel.viewType,
            problemNm,
            { viewColumn: column, preserveFocus: true },
            getWebviewOptions(extensionUri)
        )

        this.createdPanels.set(problemNm, new ProblemWebviewPanel(panel, extensionUri, problemNm))
        return this.createdPanels.get(problemNm)
    }

    public static registerPanel(problemNm: string, panel: ProblemWebviewPanel) {
        this.createdPanels.set(problemNm, panel)
    }

    public static getPanel(problemNm: string) {
        return this.createdPanels.get(problemNm)
    }

    public static removePanel(problemNm: string) {
        this.createdPanels.delete(problemNm)
    }

    public static sendMessageToPanel(problemNm: string, message: VSCodeToWebviewMessage) {
        const panel = this.createdPanels.get(problemNm)
        if (panel) {
            panel.panel.webview.postMessage(message)
        } else {
            console.error(`Panel ${problemNm} not found.`)
        }
    }
}
