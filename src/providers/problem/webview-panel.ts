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
        this._getProblemHandler()
        this._getProblemTestcases()
        this._getProblemHTMLStatement()

        this.panel.title = `${this.problem.problem_nm} - ${this.problem.title}`
        // this.panel.iconPath = this._getUri("dist", "webview", "icon.png")

        this._updateHtmlForWebview()
    }

    private async _getConcreteProblem(): Promise<void> {
        const __getConcreteProblem = (problemNm: string, langId: string, absProb: AbstractProblem) => {
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

        _info(`Getting problem info for ${this.problem.problem_nm}`)
        try {
            const absProblem = await JutgeService.getAbstractProblem(this.problem.problem_nm)
            if (absProblem === undefined) {
                throw new Error(`_getConcreteProblem: Data is undefined`)
            }

            const langId = ConfigService.getPreferredLangId()
            const problem = __getConcreteProblem(this.problem.problem_nm, langId, absProblem)

            this.problem.problem_id = problem.problem_id
            this.problem.title = problem.title
            this.problem.language_id = problem.language_id
            //
        } catch (error) {
            console.error("[ProblemWebviewPanel] Error getting problem info: ", error)
        }
    }

    private _getProblemHTMLStatement() {
        _info(`Getting problem statement for ${this.problem.problem_nm}`)
        if (!this.problem.statementHtml) {
            try {
                const htmlRes = JutgeService.getHtmlStatementSWR(this.problem.problem_id)
                htmlRes.onUpdate = (html) => {
                    this.problem.statementHtml = html
                    this._updateHtmlForWebview()
                }
                this.problem.statementHtml = htmlRes.data!
            } catch (error) {
                console.error("Error getting problem statement: ", error)
                this.problem.statementHtml = "<p>Error getting problem statement.</p>"
            }
        }
    }

    private _getProblemHandler() {
        _info(`Getting problem handler for ${this.problem.problem_nm}`)
        if (!this.problem.handler) {
            try {
                const supplRes = JutgeService.getProblemSupplSWR(this.problem.problem_id)
                supplRes.onUpdate = (data) => {
                    this.problem.handler = data.handler.handler
                    this._updateHtmlForWebview()
                }
                this.problem.handler = supplRes.data?.handler.handler
            } catch (error) {
                console.error("Error getting problem handler: ", error)
            }
        }
    }

    private _getProblemTestcases() {
        _info(`Getting problem testcases for ${this.problem.problem_nm}`)
        if (!this.problem.testcases) {
            try {
                const testcasesRes = JutgeService.getSampleTestcasesSWR(this.problem.problem_id)
                testcasesRes.onUpdate = (testcases) => {
                    this.problem.testcases = testcases
                    this._updateHtmlForWebview()
                }
                this.problem.testcases = testcasesRes.data!
            } catch (error) {
                console.error("Error getting problem testcases: ", error)
                return []
            }
        }
    }

    private _getUri(...path: string[]) {
        const uri = vscode.Uri.joinPath(this.context_.extensionUri, ...path)
        return this.panel.webview.asWebviewUri(uri)
    }

    private _generateTestcase(testcase: Testcase, index: number): string {
        const inputDecoded = Buffer.from(testcase.input_b64, "base64").toString("utf-8")
        const correctDecoded = Buffer.from(testcase.correct_b64, "base64").toString("utf-8")

        const inputDisplayed = makeSpecialCharsVisible(inputDecoded)
        const correctDisplayed = makeSpecialCharsVisible(correctDecoded)

        return /*html*/ `
        <div class="case" id="testcase-${index + 1}">
            <div class="testcase-metadata">
                <div class="toggle-minimize">
                    <span class="case-number case-title">
                        <span class="icon">
                            <i class="codicon codicon-chevron-up"></i>
                        </span>
                        Testcase ${index + 1}
                    </span>
                    <span class="running-text"></span>
                </div>
                <div className="time">
                    ${Button("", "run-again", `run-testcase-${index + 1}`, "Run Again")}
                </div>
            </div>

            <div class="testcase-content">
                <div class="textarea-container input-div">
                    Input:
                    <div class="clipboard" title="Copy to clipboard">Copy</div>
                    <div id="input" class="selectable case-textarea">
                        <pre data-original-text="${inputDecoded}">${inputDisplayed}</pre>
                    </div>
                </div>
                <div class="textarea-container expected-div">
                    Expected Output:
                    <div class="clipboard" title="Copy to clipboard">Copy</div>
                    <div id="expected" class="selectable case-textarea">
                        <pre data-original-text="${correctDecoded}">${correctDisplayed}</pre>
                    </div>
                </div>
                <div class="textarea-container received-div">
                    Received Output:
                    <div class="clipboard" title="Copy to clipboard">Copy</div>
                    <div class="compare-diff" title="Compare with expected">Compare</div>
                    <div id="received" class="selectable case-textarea"><pre></pre></div>
                </div>
            </div>
        </div>
    `
    }

    private _generateAllTestcases(problemTestcases: Testcase[], handler: string | null): string {
        if (handler !== "std") {
            return /*html*/ `
            <div class="testcase-header">
                <h2 class="flex-grow-1">Testcases</h2>
            </div>
            <div class="warning">
                ${warningIcon()}
                <span>Local testcase running is not supported for this problem.</span>
            </div>
      `
        }
        if (problemTestcases.length === 0) {
            return /*html*/ `
            <div class="testcase-header">
                <h2 class="flex-grow-1">Testcases</h2>
                No testcases found.
            </div>
        `
        }
        return /*html*/ `
        <div class="testcase-header">
            <h2 class="flex-grow-1">Testcases</h2>
            ${Button("Run All", "run-all", "run-all-testcases")}
            ${Button("Submit to Jutge", "submit", "submit-to-jutge")}
        </div>
        <div class="testcase-panels">
            ${problemTestcases.map(this._generateTestcase).join("")}
        </div>
    `
    }

    private _updateHtmlForWebview(): void {
        _info(`Updating HTML for ${this.problem.problem_nm}`)

        this.panel.title = `${this.problem.problem_nm} - ${this.problem.title}`

        const data = {
            problemNm: this.problem.problem_nm,
            title: this.problem.title,
        }

        const testcases = this._generateAllTestcases(this.problem.testcases!, this.problem.handler)
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
