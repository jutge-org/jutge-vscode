import * as vscode from "vscode"

import { runAllTestcases, runSingleTestcase } from "@/runners/problem"
import { ConfigService } from "@/services/config"
import { FileService } from "@/services/file"
import { JutgeService } from "@/services/jutge"
import { SubmissionService } from "@/services/submission"
import * as utils from "@/utils/helpers"
import { Problem, WebviewToVSCodeCommand, WebviewToVSCodeMessage } from "@/utils/types"
import { Button } from "@/webview/components/button"
import { generateTestcases } from "@/webview/components/testcases"
import { WebviewPanelRegistry } from "./webview-panel-registry"

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
        _info(`Updating webview contents for ${this.problem.problem_nm}`)

        await this._getConcreteProblem()

        this.panel.title = `${this.problem.problem_nm} - ${this.problem.title}`
        // this.panel.iconPath = this._getUri("dist", "webview", "icon.png")

        await this._getProblemHandler()
        await this._getProblemTestcases()
        await this._getProblemHTMLStatement()

        await this._updateHtmlForWebview()
    }

    private async _getConcreteProblem(): Promise<void> {
        _info(`Getting problem info for ${this.problem.problem_nm}`)
        try {
            const abstractProblem = await JutgeService.getAbstractProblem(this.problem.problem_nm)
            const concreteProblems = abstractProblem.problems
            const problemNm = this.problem.problem_nm
            const langId = ConfigService.getPreferredLangId()

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

            this.problem.problem_id = problem.problem_id
            this.problem.title = problem.title
            this.problem.language_id = problem.language_id
            //
        } catch (error) {
            console.error("[ProblemWebviewPanel] Error getting problem info: ", error)
        }
    }

    private async _getProblemHTMLStatement() {
        _info(`Getting problem statement for ${this.problem.problem_nm}`)
        if (this.problem.statementHtml) {
            return this.problem.statementHtml
        }
        try {
            this.problem.statementHtml = await JutgeService.getHtmlStatement(this.problem.problem_id)
        } catch (error) {
            console.error("Error getting problem statement: ", error)
            return "<p>Error getting problem statement.</p>"
        }
    }

    private async _getProblemHandler() {
        _info(`Getting problem handler for ${this.problem.problem_nm}`)
        if (this.problem.handler) {
            return this.problem.handler
        }
        try {
            const suppl = await JutgeService.getProblemSuppl(this.problem.problem_id)
            this.problem.handler = suppl.handler.handler
            _info(`Handler is: ${JSON.stringify(this.problem.handler)}`)
        } catch (error) {
            console.error("Error getting problem handler: ", error)
            return "<p>Error getting problem handler.</p>"
        }
    }

    private async _getProblemTestcases() {
        _info(`Getting problem testcases for ${this.problem.problem_nm}`)
        if (this.problem.testcases) {
            return this.problem.testcases
        }
        try {
            this.problem.testcases = await JutgeService.getSampleTestcases(this.problem.problem_id)
        } catch (error) {
            console.error("Error getting problem testcases: ", error)
            return []
        }
    }

    private _getUri(...path: string[]) {
        const uri = vscode.Uri.joinPath(this.context_.extensionUri, ...path)
        return this.panel.webview.asWebviewUri(uri)
    }

    private async _updateHtmlForWebview(): Promise<void> {
        _info(`Updating HTML for ${this.problem.problem_nm}`)

        const data = {
            problemNm: this.problem.problem_nm,
            title: this.problem.title,
        }

        const testcases = generateTestcases(this.problem.testcases!, this.problem.handler)
        const styleUri = this._getUri("dist", "webview", "main.css")
        const scriptUri = this._getUri("dist", "webview", "main.js")

        const nonce = utils.getNonce()

        this.panel.webview.html = `
            <!DOCTYPE html>
            <html lang="en">
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <meta http-equiv="Content-Security-Policy" 
                        content="
                            default-src 'none';
                            style-src ${this.panel.webview.cspSource} 'unsafe-inline' data:;
                            script-src 'nonce-${nonce}' ${this.panel.webview.cspSource} https://cdn.jsdelivr.net/npm/mathjax@3/;
                            img-src ${this.panel.webview.cspSource} https: data:;
                            font-src ${this.panel.webview.cspSource} https://cdn.jsdelivr.net/npm/mathjax@3/;
                        ">
                    <link rel="stylesheet" href="${styleUri}" />
                    <style>body { font-size: 0.9rem; }</style>
                </head>
                <body>
                    <div id="data" data-problem-nm="${data.problemNm}" data-title="${data.title}" />
                    <section id="header" class="component-container">
                        <h2 id="problem-nm" class="font-normal flex-grow-1">${data.problemNm}</h2>
                        ${Button("New File", "add", "new-file")}
                    </section>
                    <section id="statement" class="component-container">
                        ${this.problem.statementHtml}
                    </section>
                    <vscode-divider></vscode-divider>
                    <section id="testcases" class="component-container">
                        ${testcases}
                    </section>
                    <script type="module" nonce="${nonce}" src="${scriptUri}"></script>
                </body>
            </html>
        `
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
