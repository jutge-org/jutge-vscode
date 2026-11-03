import * as vscode from "vscode"

import { StaticLogger } from "@/loggers"
import { WebviewPanelRegistry } from "@/providers/problem-view/panel-registry"
import { splitProblemNm } from "@/utils"
import { ConfigService } from "./config"
import { JutgeService } from "./jutge"
import { problemNmFromHeader } from "./links"

/**
 * Opens the problem statement automatically the first time a source file
 * created by the extension is opened, i.e. when the file header contains a
 * `jutge://problems/<problem_id>` link (see `ProblemLinkProvider`).
 *
 * This is only a convenience: the user can still open the statement at any time
 * by Ctrl+Clicking the link in the header.
 */
export class ProblemAutoOpener extends StaticLogger {
    /// Documents whose statement has already been opened (or attempted) in this
    /// session, keyed by document URI. Entries are removed when the document is
    /// closed, so reopening a file opens its statement again.
    private static seen_: Set<string> = new Set()

    static register(context: vscode.ExtensionContext) {
        context.subscriptions.push(
            vscode.window.onDidChangeActiveTextEditor((editor) => this.onActiveEditor(editor)),
            vscode.workspace.onDidCloseTextDocument((document) => {
                this.seen_.delete(document.uri.toString())
            })
        )
    }

    /// Marks `uri` as handled, so that opening it does not auto-open its
    /// statement. Used by `commandShowProblem`, which opens the panel itself.
    static markSeen(uri: vscode.Uri) {
        this.seen_.add(uri.toString())
    }

    private static async onActiveEditor(editor: vscode.TextEditor | undefined) {
        if (!editor || editor.document.uri.scheme !== "file") {
            return
        }

        const uri = editor.document.uri.toString()
        if (this.seen_.has(uri)) {
            return
        }

        if (!ConfigService.getAutoOpenStatement()) {
            return
        }

        if (!JutgeService.isState("signed-in") && !JutgeService.isState("signed-in-exam")) {
            // Do not mark the document as seen: if the user signs in and comes
            // back to this file, we still want to open the statement.
            return
        }

        const problemNm = problemNmFromHeader(editor.document)
        if (!problemNm) {
            return
        }

        // Mark before the first `await`, so that a burst of editor events for
        // the same document cannot open the statement twice.
        this.seen_.add(uri)

        const { problemNm: problemId, language } = splitProblemNm(problemNm)
        this.log.debug(`Auto-opening statement for problem ${problemId}`)
        await WebviewPanelRegistry.createOrReveal(problemId, -1, language, { silent: true })
    }
}
