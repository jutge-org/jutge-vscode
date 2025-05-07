import * as vscode from "vscode"

import { BriefProblem } from "@/jutge_api_client"
import { runAllTestcases, runSingleTestcase } from "@/runners/problem"
import { FileService } from "@/services/file"
import { SubmissionService } from "@/services/submission"
import * as utils from "@/utils/helpers"
import { Problem, WebviewToVSCodeCommand, WebviewToVSCodeMessage } from "@/utils/types"
import { Button } from "@/webview/components/button"
import { generateTestcasePanels } from "@/webview/components/testcases"
import { WebviewPanelRegistry } from "./webview-panel-registry"
import { JutgeService } from "@/services/jutge"

const _info = (msg: string) => {
    console.info(`${Date.now()} [ProblemWebviewPanel] ${msg}`)
}

export class ProblemWebviewPanel {
    public static readonly viewType = "problemWebview"

    public readonly panel: vscode.WebviewPanel
    public problem: Problem
    private readonly _extensionUri: vscode.Uri
    private _disposables: vscode.Disposable[] = []

    /**
     * Constructor for the problem webview panel.
     * Sets up the panel and its listeners.
     *
     * @param panel The webview panel.
     * @param extensionUri The uri of the extension.
     * @param problemNm The problem number.
     * @returns The problem webview panel.
     */
    public constructor(panel: vscode.WebviewPanel, context: vscode.ExtensionContext, problemNm: string) {
        _info(`Constructing a webview panel for problem ${problemNm} (${context.extensionUri})`)
        this.panel = panel
        this._extensionUri = context.extensionUri

        this.problem = {
            problem_id: utils.getDefaultProblemId(problemNm),
            problem_nm: problemNm,
            title: "",
            language_id: null,
            statementHtml: null,
            testcases: null,
            handler: null,
        }

        // Initialize problem info and update webview
        this._getProblemInfo()
            .then(() => this._updateWebviewContents(problemNm))
            .catch((error) => {
                console.error("Failed to initialize problem:", error)
                vscode.window.showErrorMessage("Failed to load problem information")
            })

        // Handle webview messages
        this.panel.webview.onDidReceiveMessage(this._handleMessage, this, this._disposables)

        // Clean up resources when panel is closed
        this.panel.onDidDispose(() => this.dispose(), null, this._disposables)
    }

    /**
     * Disposes of the problem webview panel.
     * This method is called when the panel is closed (either by the user or programmatically).
     */
    public dispose() {
        WebviewPanelRegistry.remove(this.problem.problem_nm)
        this.panel.dispose()
        this._disposables.forEach((x) => x.dispose())
    }

    /**
     * Gets the problem info.
     */
    private async _getProblemInfo(): Promise<void> {
        _info(`Getting problem info for ${this.problem.problem_nm}`)
        try {
            const abstractProblem = await JutgeService.getAbstractProblem(this.problem.problem_nm)
            const langProblems = abstractProblem.problems
            const availableLangIds = Object.values(langProblems).reduce(
                (acc: Record<string, BriefProblem>, problem: BriefProblem) => {
                    acc[problem.language_id] = problem
                    return acc
                },
                {} as Record<string, BriefProblem>
            )

            const preferredLang = vscode.workspace
                .getConfiguration("jutge-vscode")
                .get("problem.preferredLang") as string
            const preferredLangId = utils.preferredLangToLangId[preferredLang]

            let finalProblem
            if (availableLangIds[preferredLangId]) {
                finalProblem = availableLangIds[preferredLangId]
            } else {
                console.warn("[ProblemWebviewPanel] Preferred language not available. Trying with fallback languages.")
                for (const langId of utils.fallbackLangOrder) {
                    if (availableLangIds[langId]) {
                        finalProblem = availableLangIds[langId]
                        break
                    }
                }
            }
            if (!finalProblem) {
                throw new Error("No problem found in any language.")
            }
            this.problem.problem_id = finalProblem.problem_id
            this.problem.title = finalProblem.title
            this.problem.language_id = finalProblem.language_id
        } catch (error) {
            console.error("[ProblemWebviewPanel] Error getting problem info: ", error)
        }
    }

    /**
     * Sets the content of the webview panel.
     *
     * @param problemNm The problem number.
     */
    private async _updateWebviewContents(problemNm: string) {
        _info(`Updating webview contents for ${problemNm}`)
        this.panel.title = problemNm
        this.panel.webview.html = await this._getHtmlForWebview()
    }

    private async _getProblemStatement() {
        _info(`Getting problem statement for ${this.problem.problem_nm}`)
        if (this.problem.statementHtml) {
            return this.problem.statementHtml
        }
        try {
            const problemStatement = await JutgeService.getHtmlStatement(this.problem.problem_id)
            this.problem.statementHtml = problemStatement
            return problemStatement
        } catch (error) {
            console.error("Error getting problem statement: ", error)
            return "<p>Error getting problem statement.</p>"
        }
    }

    private async _getProblemTestcases() {
        _info(`Getting problem testcases for ${this.problem.problem_nm}`)
        if (this.problem.testcases) {
            return this.problem.testcases
        }
        try {
            const [problemExtras, problemTestcases] = await Promise.all([
                JutgeService.getProblemSuppl(this.problem.problem_id),
                JutgeService.getSampleTestcases(this.problem.problem_id),
            ])
            this.problem.handler = problemExtras.handler.handler
            this.problem.testcases = problemTestcases
            return problemTestcases
        } catch (error) {
            console.error("Error getting problem testcases: ", error)
            return []
        }
    }

    private _getUri(...path: string[]) {
        const uri = vscode.Uri.joinPath(this._extensionUri, ...path)
        return this.panel.webview.asWebviewUri(uri)
    }

    /**
     * Gets the html content for the webview panel.
     *
     * @param problemText The problem text.
     * @returns The html content for the webview panel.
     */
    private async _getHtmlForWebview(): Promise<string> {
        _info(`Getting HTML for ${this.problem.problem_nm}`)
        const styleUri = this._getUri("dist", "webview", "main.css")
        const scriptUri = this._getUri("dist", "webview", "main.js")
        const nonce = utils.getNonce()

        const [problemStatement, problemTestcases] = await Promise.all([
            this._getProblemStatement(),
            this._getProblemTestcases(),
        ])
        const testcasePanels = generateTestcasePanels(problemTestcases, this.problem.handler)

        return `
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
                    <section id="header" class="component-container">
                        <h2 id="problem-nm" class="font-normal flex-grow-1">${this.problem.problem_nm}</h2>
                        ${Button("New File", "add", "new-file")}
                    </section>
                    <section id="statement" class="component-container">
                        ${problemStatement}
                    </section>
                    <vscode-divider></vscode-divider>
                    <section id="testcases" class="component-container">
                        ${testcasePanels}
                    </section>
                    <script type="module" nonce="${nonce}" src="${scriptUri}"></script>
                </body>
            </html>
        `
    }

    private async _handleMessage(message: WebviewToVSCodeMessage) {
        console.debug(`[ProblemWebviewPanel] Received message from webview: ${message.command}`)

        switch (message.command) {
            case WebviewToVSCodeCommand.RUN_ALL_TESTCASES:
                let all_test_editor = await utils.chooseFromEditorList(vscode.window.visibleTextEditors)
                if (!all_test_editor) {
                    vscode.window.showErrorMessage("No text editor open.")
                    return
                }
                runAllTestcases(this.problem, all_test_editor.document.uri.fsPath)
                return

            case WebviewToVSCodeCommand.SUBMIT_TO_JUTGE:
                let submit_editor = await utils.chooseFromEditorList(vscode.window.visibleTextEditors)
                if (!submit_editor) {
                    vscode.window.showErrorMessage("No text editor open.")
                    return
                }
                SubmissionService.submitProblem(this.problem, submit_editor.document.uri.fsPath)
                return

            case WebviewToVSCodeCommand.RUN_TESTCASE:
                let test_editor = await utils.chooseFromEditorList(vscode.window.visibleTextEditors)
                if (!test_editor) {
                    vscode.window.showErrorMessage("No text editor open.")
                    return
                }
                runSingleTestcase(message.data.testcaseId, this.problem, test_editor.document.uri.fsPath)
                return

            case WebviewToVSCodeCommand.NEW_FILE:
                const fileUri = await FileService.createNewFileForProblem(this.problem)
                if (!fileUri) {
                    return
                }
                await FileService.showFileInColumn(fileUri, vscode.ViewColumn.One)
                this.panel.reveal(vscode.ViewColumn.Beside, true)
                return

            case WebviewToVSCodeCommand.SHOW_DIFF:
                const { testcaseId, expected, received } = message.data

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
                            editor.document.uri.scheme === "jutge-diff" &&
                            editor.document.uri.path.includes(`/${testcaseId}/`)
                    )

                    if (!isStillOpen) {
                        registration.dispose()
                        disposable.dispose()
                    }
                })
                return

            default:
                console.warn(`[ProblemWebviewPanel] Don't know how to handle message: {message.command}`)
        }
    }
}
