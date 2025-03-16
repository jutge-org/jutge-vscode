import * as vscode from "vscode"

import { FileService } from "@/services/FileService"
import { SubmissionService } from "@/services/SubmissionService"
import { AuthService } from "@/services/AuthService"
import { BriefProblem } from "@/jutge_api_client"

import { jutgeClient } from "@/extension"
import { runAllTestcases, runSingleTestcase } from "@/runners/ProblemRunner"

import { Problem, VSCodeToWebviewMessage, WebviewToVSCodeCommand, WebviewToVSCodeMessage } from "@/utils/types"
import * as utils from "@/utils/helpers"

import { Button } from "@/webview/components/Button"
import { generateTestcasePanels } from "@/webview/components/testcasePanels"

/**
 * Registers commands to control the webview.
 *
 * @param context Provides access to utilities to manage the extension's lifecycle.
 */
export function registerWebviewCommands(context: vscode.ExtensionContext) {
    context.subscriptions.push(
        vscode.commands.registerCommand("jutge-vscode.showProblem", async (problemNm: string | undefined) => {
            if (!(await AuthService.isUserAuthenticated())) {
                vscode.window.showErrorMessage("You need to sign in to Jutge.org to use this feature.")
                return
            }

            // If the command is called from the command palette, ask for the problem number.
            if (!problemNm) {
                const inputProblemNm = await vscode.window.showInputBox({
                    title: "Jutge Problem",
                    placeHolder: "P12345",
                    prompt: "Please write the problem number.",
                    value: "",
                })
                if (!inputProblemNm) {
                    return
                }
                problemNm = inputProblemNm
            }
            WebviewPanelHandler.createOrShow(context.extensionUri, problemNm)
        })
    )

    vscode.window.registerWebviewPanelSerializer(
        ProblemWebviewPanel.viewType,
        new ProblemWebviewPanelSerializer(context.extensionUri)
    )
}

/**
 * Get the webview options for the webview panel.
 *
 * @param extensionUri The uri of the extension.
 * @returns The webview options.
 */
export function getWebviewOptions(extensionUri: vscode.Uri): vscode.WebviewOptions {
    return {
        // Enable javascript in the webview
        enableScripts: true,

        // Restrict the webview to only loading content from the extension's `webview` directory.
        localResourceRoots: [
            vscode.Uri.joinPath(extensionUri, "src", "webview"),
            vscode.Uri.joinPath(extensionUri, "dist"),
        ],
    }
}

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

        const column = this._getColumn()

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

    // Returns column beside or the column of an existing panel.
    private static _getColumn() {
        if (WebviewPanelHandler.createdPanels.size === 0) {
            return vscode.ViewColumn.Beside
        } else {
            return WebviewPanelHandler.createdPanels.values().next().value.panel.viewColumn
        }
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

    private async _getProblemInfo(problemNm: string): Promise<Problem> {
        const problem_id = utils.getDefaultProblemId(problemNm)
        const problem = await jutgeClient.problems.getProblem(problem_id)
        const statementHtml = await jutgeClient.problems.getHtmlStatement(problem_id)

        return {
            problem_id: problem_id,
            problem_nm: problemNm,
            title: problem.title,
            language_id: problem.language_id,
            statementHtml: statementHtml,
            testcases: null,
            handler: null,
        }
    }

    public static registerPanel(problemNm: string, panel: ProblemWebviewPanel) {
        this.createdPanels.set(problemNm, panel)
    }
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
    public constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri, problemNm: string) {
        this.panel = panel
        this._extensionUri = extensionUri
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

        // Clean up resources when panel is closed
        this.panel.onDidDispose(
            () => {
                this.dispose()
            },
            null,
            this._disposables
        )

        // Handle webview messages
        this.panel.webview.onDidReceiveMessage(this._handleMessage.bind(this), null, this._disposables)
    }

    /**
     * Disposes of the problem webview panel.
     * This method is called when the panel is closed (either by the user or programmatically).
     */
    public dispose() {
        WebviewPanelHandler.removePanel(this.problem.problem_nm)

        this.panel.dispose()

        while (this._disposables.length) {
            const x = this._disposables.pop()
            if (x) {
                x.dispose()
            }
        }
    }

    /**
     * Gets the problem info.
     */
    private async _getProblemInfo(): Promise<void> {
        try {
            const abstractProblem = await jutgeClient.problems.getAbstractProblem(this.problem.problem_nm)
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
                console.warn("[WebviewPanel] Preferred language not available. Trying with fallback languages.")
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
            console.error("[WebviewPanel] Error getting problem info: ", error)
        }
    }

    /**
     * Sets the content of the webview panel.
     *
     * @param problemNm The problem number.
     */
    private async _updateWebviewContents(problemNm: string) {
        this.panel.title = problemNm
        this.panel.webview.html = await this._getHtmlForWebview()
    }

    private async _getProblemStatement() {
        if (this.problem.statementHtml) {
            return this.problem.statementHtml
        }
        try {
            const problemStatement = await jutgeClient.problems.getHtmlStatement(this.problem.problem_id)
            this.problem.statementHtml = problemStatement
            return problemStatement
        } catch (error) {
            console.error("Error getting problem statement: ", error)
            return "<p>Error getting problem statement.</p>"
        }
    }

    private async _getProblemTestcases() {
        if (this.problem.testcases) {
            return this.problem.testcases
        }
        try {
            const [problemExtras, problemTestcases] = await Promise.all([
                jutgeClient.problems.getProblemSuppl(this.problem.problem_id),
                jutgeClient.problems.getSampleTestcases(this.problem.problem_id),
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
                    content="default-src 'none';
                            style-src ${this.panel.webview.cspSource} 'unsafe-inline' data:;
                            script-src 'nonce-${nonce}' ${this.panel.webview.cspSource} https://cdn.jsdelivr.net/npm/mathjax@3/;
                            img-src ${this.panel.webview.cspSource} https: data:;
                            font-src ${this.panel.webview.cspSource} https://cdn.jsdelivr.net/npm/mathjax@3/;">
                <link rel="stylesheet" href="${styleUri}" />
                <style>body { font-size: 1rem; }</style>
            </head>
            <body>
                <section id="header" class="component-container">
                    <h2 id="problem-nm" class="flex-grow-1">
                        ${this.problem.problem_nm} - ${this.problem.title}
                    </h2>
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
        console.debug(`[WebviewPanel] Received message from webview: ${message.command}`)

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
        }
    }
}

class ProblemWebviewPanelSerializer implements vscode.WebviewPanelSerializer {
    private readonly _extensionUri: vscode.Uri

    constructor(extensionUri: vscode.Uri) {
        this._extensionUri = extensionUri
    }

    async deserializeWebviewPanel(webviewPanel: vscode.WebviewPanel, state: any) {
        try {
            console.debug(`[WebviewPanel] Deserializing webview panel with state: ${state}`)
            if (!state?.problemNm) {
                console.warn("[WebviewPanel] No problem number found in state")
                webviewPanel.dispose()
                return
            }

            const panel = new ProblemWebviewPanel(webviewPanel, this._extensionUri, state.problemNm)
            WebviewPanelHandler.registerPanel(state.problemNm, panel)
        } catch (error) {
            console.error("[WebviewPanel] Error deserializing webview panel: ", error)
            webviewPanel.dispose()
        }
    }
}
