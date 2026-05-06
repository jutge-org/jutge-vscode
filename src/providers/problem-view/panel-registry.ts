import * as vscode from "vscode"

import { getContext, getWebviewOptions } from "@/extension"
import { StaticLogger } from "@/loggers"
import { JutgeService } from "@/services/jutge"
import { VSCodeToWebviewMessage } from "@/types"
import { getProblemIdFromFilename, sourceFileExists } from "@/utils"
import { basename } from "path"
import { ProblemViewPanel } from "./panel"

export async function isProblemValidAndAccessible(problemNm: string): Promise<boolean> {
    try {
        await JutgeService.getAbstractProblemSWR(problemNm)
        return true
    } catch {
        return false
    }
}

export class WebviewPanelRegistry extends StaticLogger {
    private static createdPanels_: Map<string, ProblemViewPanel> = new Map()

    static async createOrReveal(
        problemNm: string,
        order: number = -1
    ): Promise<ProblemViewPanel | null> {
        const context = getContext()
        if (!(await isProblemValidAndAccessible(problemNm))) {
            vscode.window.showErrorMessage("Problem not valid or accessible.")
            return null
        }
        const viewColumn = vscode.ViewColumn.Beside
        if (this.createdPanels_.has(problemNm)) {
            const panel = this.createdPanels_.get(problemNm) as ProblemViewPanel
            panel.panel.reveal(viewColumn, true)
            return panel
        }
        const webviewPanel = vscode.window.createWebviewPanel(
            ProblemViewPanel.viewType,
            problemNm,
            { viewColumn, preserveFocus: true },
            getWebviewOptions(context.extensionUri)
        )
        const panel = new ProblemViewPanel(webviewPanel, { problemNm, order })
        this.createdPanels_.set(problemNm, panel)
        return panel
    }

    static updatePanelsOnChangedFiles(files: readonly vscode.Uri[]) {
        const problemNms = files.map((uri) => getProblemIdFromFilename(basename(uri.fsPath)))
        for (const problemNm of problemNms) {
            if (problemNm) {
                WebviewPanelRegistry.notifyProblemFilesChanges(problemNm)
            }
        }
    }

    static async notifyProblemFilesChanges(problemNm: string) {
        const panel = this.get(problemNm)
        if (!panel) {
            return
        }
        await panel.notifyProblemFilesChanges()
        const fileExists = await sourceFileExists(panel.problem, panel.order)
        panel.fileExists = fileExists
    }

    static register(problemNm: string, panel: ProblemViewPanel) {
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
        }
    }
}
