import * as vscode from "vscode"

import { getContext, getWebviewOptions } from "@/extension"
import { StaticLogger } from "@/loggers"
import { JutgeService } from "@/services/jutge"
import { VSCodeToWebviewMessage } from "@/types"
import { getProblemIdFromFilename } from "@/utils"
import { basename } from "path"
import { ProblemWebviewPanel } from "./panel"

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
    static async createOrReveal(problemNm: string): Promise<ProblemWebviewPanel | null> {
        this.log.debug(`Attempting to show panel for problem ${problemNm}`)

        const context = getContext()

        if (!(await isProblemValidAndAccessible(problemNm))) {
            this.log.warn(`Problem ${problemNm} not valid or accessible`)
            vscode.window.showErrorMessage("Problem not valid or accessible.")
            return null
        }

        // NOTE(pauek): Always show problem panels on column two!
        const viewColumn = vscode.ViewColumn.Beside

        // If we already have a panel, show it.
        if (this.createdPanels_.has(problemNm)) {
            this.log.debug(`Reusing existing panel for ${problemNm}`)
            let panel = this.createdPanels_.get(problemNm) as ProblemWebviewPanel
            panel.panel.reveal(viewColumn, true)
            return panel
        }

        this.log.debug(`Creating new panel for ${problemNm}`)
        const webviewPanel = vscode.window.createWebviewPanel(
            ProblemWebviewPanel.viewType,
            problemNm,
            { viewColumn, preserveFocus: true },
            getWebviewOptions(context.extensionUri)
        )
        const panel = new ProblemWebviewPanel(webviewPanel, { problemNm })
        this.createdPanels_.set(problemNm, panel)
        return panel
    }

    static updatePanelsOnChangedFiles(files: readonly vscode.Uri[]) {
        const problemNms = files.map((uri) =>
            getProblemIdFromFilename(basename(uri.fsPath))
        )
        for (const problemNm of problemNms) {
            if (problemNm) {
                WebviewPanelRegistry.updateCustomTestcases(problemNm)
            }
        }
    }

    static updateCustomTestcases(problemNm: string) {
        const panel = this.get(problemNm)
        if (!panel) {
            this.log.info(`updateCustomTestcases: Problem ${problemNm} not found`)
            return
        }
        panel.updateCustomTestcases()
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

    static async sendMessage(problemNm: string, message: VSCodeToWebviewMessage) {
        const panel = this.createdPanels_.get(problemNm)
        if (panel) {
            await panel.panel.webview.postMessage(message)
        } else {
            console.error(`Panel ${problemNm} not found.`)
        }
    }
}
