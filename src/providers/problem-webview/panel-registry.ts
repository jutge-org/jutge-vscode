import * as vscode from "vscode"

import { getWebviewOptions } from "@/extension"
import * as utils from "@/utils"
import { VSCodeToWebviewMessage } from "@/types"
import { ProblemWebviewPanel } from "./panel"

export class WebviewPanelRegistry extends utils.StaticLogger {
    private static createdPanels_: Map<string, ProblemWebviewPanel> = new Map()

    /**
     * Creates a new problem webview panel.
     *
     * @param context The context of the extension.
     * @param problemNm The problem number.
     */
    static async createOrShow(context: vscode.ExtensionContext, problemNm: string) {
        this.log.debug(`Attempting to show panel for problem ${problemNm}`)

        if (!(await utils.isProblemValidAndAccessible(problemNm))) {
            this.log.warn(`Problem ${problemNm} not valid or accessible`)
            vscode.window.showErrorMessage("Problem not valid or accessible.")
            return
        }

        // Get an existing panel if it exists
        const [existingPanel] = [...this.createdPanels_.values()]
        const viewColumn = existingPanel?.panel.viewColumn || vscode.ViewColumn.Beside

        // If we already have a panel, show it.
        if (this.createdPanels_.has(problemNm)) {
            this.log.debug(`Reusing existing panel for ${problemNm}`)
            let panel = this.createdPanels_.get(problemNm) as ProblemWebviewPanel
            panel.panel.reveal(viewColumn, true)
            return this.createdPanels_.get(problemNm)
        }

        this.log.debug(`Creating new panel for ${problemNm}`)
        const webviewPanel = vscode.window.createWebviewPanel(
            ProblemWebviewPanel.viewType,
            problemNm,
            { viewColumn, preserveFocus: true },
            getWebviewOptions(context.extensionUri)
        )
        const panel = new ProblemWebviewPanel(webviewPanel, context, {
            problemNm,
        })
        this.createdPanels_.set(problemNm, panel)
        return panel
    }

    static register(problemNm: string, panel: ProblemWebviewPanel) {
        this.createdPanels_.set(problemNm, panel)
    }

    static get(problemNm: string) {
        return this.createdPanels_.get(problemNm)
    }

    static remove(problemNm: string) {
        this.createdPanels_.delete(problemNm)
    }

    static sendMessage(problemNm: string, message: VSCodeToWebviewMessage) {
        const panel = this.createdPanels_.get(problemNm)
        if (panel) {
            panel.panel.webview.postMessage(message)
        } else {
            console.error(`Panel ${problemNm} not found.`)
        }
    }
}
