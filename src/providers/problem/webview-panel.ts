import * as vscode from "vscode"

import { runAllTestcases, runSingleTestcase } from "@/runners/problem"
import { ConfigService } from "@/services/config"
import { FileService } from "@/services/file"
import { JutgeService } from "@/services/jutge"
import { SubmissionService } from "@/services/submission"
import * as utils from "@/utils/helpers"
import { Problem, WebviewToVSCodeCommand, WebviewToVSCodeMessage } from "@/utils/types"
import { Button } from "@/webview/components/button"
import { WebviewPanelRegistry } from "./webview-panel-registry"
import { AbstractProblem } from "@/jutge_api_client"
import { makeSpecialCharsVisible } from "../../webview/utils"
import { warningIcon } from "../../webview/components/icons"
import { Testcase } from "../../jutge_api_client"
import { htmlForAllTestcases, htmlForTestcase, htmlForWebview } from "./webview-html"

const _info = (msg: string) => {
    console.info(`[ProblemWebviewPanel] ${msg}`)
}

type ProblemWebviewState = {
    problemNm: string
    title?: string
}

export class ProblemWebviewPanel {
    public static readonly viewType = "problemWebview"
    private context_: vscode.ExtensionContext

    public readonly panel: vscode.WebviewPanel
    public problem: Problem

    public constructor(
        panel: vscode.WebviewPanel,
        context: vscode.ExtensionContext,
        { problemNm, title }: ProblemWebviewState
    ) {
        _info(`Constructing a webview panel for problem ${problemNm} (${context.extensionUri})`)

        this.context_ = context

        this.panel = panel
        this.panel.onDidDispose(() => this.dispose(), null, context.subscriptions)
        this.panel.webview.onDidReceiveMessage(this._handleMessage, this, context.subscriptions)

        this.problem = {
            problem_id: utils.getDefaultProblemId(problemNm),
            problem_nm: problemNm,
            title: title || "",
            language_id: null,
            statementHtml: null,
            testcases: null,
            handler: null,
        }

        // Initialize problem info and update webview
        this._updateWebviewContents()
    }

    public dispose() {
        WebviewPanelRegistry.remove(this.problem.problem_nm)
        this.panel.dispose()
    }

    private async _updateWebviewContents() {
        vscode.window.withProgress(
            {
                location: vscode.ProgressLocation.Notification,
                title: `Loading ${this.problem.problem_nm}`,
                cancellable: false,
            },
            async (progress) => {
                try {
                    progress.report({ increment: 0, message: "Loading..." })

                    const problemNm = this.problem.problem_nm
                    _info(`Updating webview contents for ${problemNm}`)

                    progress.report({ increment: 20, message: "Getting concrete problem..." })
                    const absProb = await JutgeService.getAbstractProblem(problemNm)
                    const { problem_id, title: problemTitle } = this.__chooseConcreteProblem(problemNm, absProb)

                    this.panel.title = `${this.problem.problem_nm} - ${problemTitle}`

                    let statementHtml: string = ""
                    let testcases: Testcase[] = []
                    let handler: string = ""

                    const updateWebview = () => {
                        _info(`Updating HTML for ${this.problem.problem_nm}`)

                        this.panel.webview.html = htmlForWebview({
                            problemNm,
                            problemTitle,
                            nonce: utils.getNonce(),
                            statementHtml,
                            testcasesHtml: htmlForAllTestcases(testcases, handler),
                            styleUri: this._getUri("dist", "webview", "main.css"),
                            scriptUri: this._getUri("dist", "webview", "main.js"),
                            cspSource: this.panel.webview.cspSource,
                        })
                    }

                    const _loadHandler = async () => {
                        const suppl = await JutgeService.getProblemSuppl(problem_id)
                        handler = suppl.handler.handler
                        _info("  A")
                        progress.report({ increment: 20, message: "Loaded handler" })
                    }
                    const _loadTestcases = async () => {
                        testcases = await JutgeService.getSampleTestcases(problem_id)
                        _info("  B")
                        progress.report({ increment: 20, message: "Loaded testcases" })
                    }
                    const _loadStatementHtml = async () => {
                        statementHtml = await JutgeService.getHtmlStatement(problem_id)
                        _info("  C")
                        progress.report({ increment: 20, message: "Loaded HTML statement" })
                    }

                    progress.report({ message: "Loading..." })
                    await Promise.all([_loadHandler(), _loadTestcases(), _loadStatementHtml()])

                    updateWebview()

                    //
                } catch (e) {
                    console.error(e)
                }
            }
        )
    }

    private __chooseConcreteProblem(problemNm: string, absProb: AbstractProblem) {
        const langId = ConfigService.getPreferredLangId()
        const concreteProblems = absProb.problems
        let problem
        let id = `${problemNm}_${langId}`
        if (concreteProblems[id]) {
            problem = concreteProblems[id]
        } else {
            console.warn("[ProblemWebviewPanel] Preferred language not available. Trying with fallback languages.")
            for (const langId of utils.fallbackLangOrder) {
                const id = `${problemNm}_${langId}`
                if (concreteProblems[id]) {
                    problem = concreteProblems[id]
                    break
                }
            }
        }
        if (!problem) {
            throw new Error("No problem found in any language.")
        }
        return problem
    }

    private _getUri(...path: string[]) {
        const uri = vscode.Uri.joinPath(this.context_.extensionUri, ...path)
        return this.panel.webview.asWebviewUri(uri)
    }

    private async _handleMessage(message: WebviewToVSCodeMessage) {
        console.debug(`[ProblemWebviewPanel] Received message from webview: ${message.command}`)

        const { command, data } = message
        switch (command) {
            case WebviewToVSCodeCommand.RUN_ALL_TESTCASES:
                return this._runAllTestcases()

            case WebviewToVSCodeCommand.SUBMIT_TO_JUTGE:
                return this._submitToJutge()

            case WebviewToVSCodeCommand.RUN_TESTCASE:
                return this._runTestcase(data.testcaseId)

            case WebviewToVSCodeCommand.NEW_FILE:
                return this._newFile()

            case WebviewToVSCodeCommand.SHOW_DIFF:
                return this._showDiff(data)

            default:
                console.warn(`[ProblemWebviewPanel] Don't know how to handle message: ${message.command}`)
        }
    }

    private async _runAllTestcases() {
        let editor = await utils.chooseFromEditorList(vscode.window.visibleTextEditors)
        if (!editor) {
            vscode.window.showErrorMessage("No text editor open.")
            return
        }
        runAllTestcases(this.problem, editor.document.uri.fsPath)
    }

    private async _submitToJutge() {
        let editor = await utils.chooseFromEditorList(vscode.window.visibleTextEditors)
        if (!editor) {
            vscode.window.showErrorMessage("No text editor open.")
            return
        }
        SubmissionService.submitProblem(this.problem, editor.document.uri.fsPath)
    }

    private async _runTestcase(testcaseId: number) {
        let test_editor = await utils.chooseFromEditorList(vscode.window.visibleTextEditors)
        if (!test_editor) {
            vscode.window.showErrorMessage("No text editor open.")
            return
        }
        runSingleTestcase(testcaseId, this.problem, test_editor.document.uri.fsPath)
    }

    private async _newFile() {
        const fileUri = await FileService.createNewFileForProblem(this.problem)
        if (!fileUri) {
            return
        }
        await FileService.showFileInColumn(fileUri, vscode.ViewColumn.One)
        this.panel.reveal(vscode.ViewColumn.Beside, true)
    }

    private async _showDiff(data: { testcaseId: number; expected: string; received: string }) {
        const { testcaseId, expected, received } = data

        // Create a more specific diff display name
        const diffTitle = `Testcase ${testcaseId}: Expected vs. Received Output`

        // Use virtual documents with a custom scheme instead of actual files
        const expectedUri = vscode.Uri.parse(`jutge-diff://${testcaseId}/expected.txt`)
        const receivedUri = vscode.Uri.parse(`jutge-diff://${testcaseId}/received.txt`)

        // Register document content providers
        const contentProvider = new (class implements vscode.TextDocumentContentProvider {
            // Event to signal content changes
            onDidChangeEmitter = new vscode.EventEmitter<vscode.Uri>()
            onDidChange = this.onDidChangeEmitter.event

            // Store the content
            private _content = new Map<string, string>([
                [expectedUri.toString(), expected],
                [receivedUri.toString(), received],
            ])

            provideTextDocumentContent(uri: vscode.Uri): string {
                return this._content.get(uri.toString()) || ""
            }
        })()

        // Register the provider for our custom scheme
        const registration = vscode.workspace.registerTextDocumentContentProvider("jutge-diff", contentProvider)

        // Open the diff editor with our virtual documents
        await vscode.commands.executeCommand("vscode.diff", expectedUri, receivedUri, diffTitle, {
            viewColumn: vscode.ViewColumn.Beside,
            preview: true,
        })

        // Keep registration active until diff is closed
        // We'll create a listener to dispose it when appropriate
        const disposable = vscode.window.onDidChangeVisibleTextEditors((editors) => {
            // Check if our diff editor is still open
            const isStillOpen = editors.some(
                (editor) =>
                    editor.document.uri.scheme === "jutge-diff" && editor.document.uri.path.includes(`/${testcaseId}/`)
            )

            if (!isStillOpen) {
                registration.dispose()
                disposable.dispose()
            }
        })
    }
}
