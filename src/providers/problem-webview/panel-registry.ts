import * as vscode from "vscode"

import { getWebviewOptions } from "@/extension"
import { VSCodeToWebviewMessage } from "@/types"
import { StaticLogger } from "@/loggers"
import { ProblemWebviewPanel } from "./panel"
import { JutgeService } from "@/services/jutge"

/**
 * A helper function that returns a boolean indicating whether a given problem name is valid and accessible.
 *
 */
export async function isProblemValidAndAccessible(problemNm: string): Promise<boolean> {
    try {
        await JutgeService.getAbstractProblemSWR(problemNm)
        return true
    } catch (error) {
        return false
    }
}

export class WebviewPanelRegistry extends StaticLogger {
    private static createdPanels_: Map<string, ProblemWebviewPanel> = new Map()

    /**
     * Creates a new problem webview panel.
     *
     * @param context The context of the extension.
     * @param problemNm The problem number.
     */
    static async createOrShow(context: vscode.ExtensionContext, problemNm: string) {
        this.log.debug(`Attempting to show panel for problem ${problemNm}`)

        if (!(await isProblemValidAndAccessible(problemNm))) {
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
