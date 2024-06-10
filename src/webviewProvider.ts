import * as vscode from "vscode"
import { MyProblemsService } from "./client"
import { createNewFileForProblem, showFileInColumn } from "./fileManager"
import { isUserAuthenticated } from "./jutgeAuth"
import { submitProblemToJutge } from "./jutgeSubmission"
import { runAllTestcases, runSingleTestcase } from "./problemRunner"
import { Problem, Testcase, VSCodeToWebviewMessage, WebviewToVSCodeCommand, WebviewToVSCodeMessage } from "./types"
import * as utils from "./utils"
import { Button } from "./webview/components/Button"
import { generateTestcasePanels } from "./webview/components/testcasePanels"

/**
 * Registers commands to control the webview.
 *
 * @param context Provides access to utilities to manage the extension's lifecycle.
 */
export function registerWebviewCommands(context: vscode.ExtensionContext) {
    context.subscriptions.push(
        vscode.commands.registerCommand("jutge-vscode.showProblem", async (problemNm: string | undefined) => {
            if (!(await isUserAuthenticated())) {
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
        if (!(await utils.isProblemValidAndAccessible(problemNm))) {
            vscode.window.showErrorMessage("Problem not valid or accessible.")
            return
        }

        const column = this._getColumn()

        // If we already have a panel, show it.
        if (this.createdPanels.has(problemNm)) {
            let panel = this.createdPanels.get(problemNm) as ProblemWebviewPanel
            panel.panel.reveal(column, true)
            return this.createdPanels.get(problemNm)
        }

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

        // Get the problem info
        this._getProblemInfo().then(() => {
            // Set the webview's initial html content
            this._updateWebviewContents(problemNm)
        })

        // Listen for when the panel is disposed
        // This happens when the user closes the panel or when the panel is closed programmatically
        this.panel.onDidDispose(() => this.dispose(), null, this._disposables)

        // Handle messages from the webview
        this.panel.webview.onDidReceiveMessage(
            (message) => {
                this._handleMessage(message)
            },
            null,
            this._disposables
        )
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
            const abstractProblem = await MyProblemsService.getAbstractProblem({
                problemNm: this.problem.problem_nm,
            })
            const langProblems = abstractProblem.problems
            const availableLangIds = langProblems.reduce((acc: { [key: string]: any }, problem) => {
                acc[problem.language_id] = problem
                return acc
            }, {})

            const preferredLang = vscode.workspace
                .getConfiguration("jutge-vscode")
                .get("problem.preferredLang") as string
            const preferredLangId = utils.preferredLangToLangId[preferredLang]

            let finalProblem
            if (availableLangIds[preferredLangId]) {
                finalProblem = availableLangIds[preferredLangId]
            } else {
                console.log("Preferred language not available. Trying with fallback languages.")
                for (const langId of utils.fallbackLangOrder) {
                    if (availableLangIds[langId]) {
                        finalProblem = availableLangIds[langId]
                        break
                    }
                }
            }
            this.problem.problem_id = finalProblem.problem_id
            this.problem.title = finalProblem.title
            this.problem.language_id = finalProblem.language_id
        } catch (error) {
            console.error("Error getting problem info: ", error)
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
            const problemStatement = (await MyProblemsService.getTextStatement({
                problemNm: this.problem.problem_nm,
                problemId: this.problem.problem_id,
            })) as string
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
            const problemExtras = (await MyProblemsService.getProblemExtras({
                problemNm: this.problem.problem_nm,
                problemId: this.problem.problem_id,
            })) as { handler: { handler: string; source_modifier: string } }
            this.problem.handler = problemExtras.handler.handler

            const problemTestcases = (await MyProblemsService.getSampleTestcases({
                problemNm: this.problem.problem_nm,
                problemId: this.problem.problem_id,
            })) as Testcase[]
            this.problem.testcases = problemTestcases
            return problemTestcases
        } catch (error) {
            console.error("Error getting problem testcases: ", error)
            return []
        }
    }

    /**
     * Gets the html content for the webview panel.
     *
     * @param problemText The problem text.
     * @returns The html content for the webview panel.
     */
    private async _getHtmlForWebview(): Promise<string> {
        const webview = this.panel.webview
        const scriptUri = utils.getUri(webview, this._extensionUri, ["dist", "webview", "main.js"])
        const styleUri = utils.getUri(webview, this._extensionUri, ["src", "webview", "styles", "style.css"])
        const codiconUri = utils.getUri(webview, this._extensionUri, ["src", "webview", "styles", "codicon.css"])
        const nonce = utils.getNonce() // Use a nonce to only allow specific scripts to be run

        const problemStatement = await this._getProblemStatement()
        const problemTestcases = await this._getProblemTestcases()

        const testcasePanels = generateTestcasePanels(problemTestcases, this.problem.handler)

        return `
        <!DOCTYPE html>
			<html lang="en">
			<head>
				<meta charset="UTF-8">
				<!--
					Use a content security policy to only allow loading images from https or from our extension directory,
					and only allow scripts that have a specific nonce.
				-->
				<meta http-equiv="Content-Security-Policy" 
                      content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; img-src ${webview.cspSource} https:; script-src 'nonce-${nonce}'; font-src ${webview.cspSource};">

				<link rel="stylesheet" href="${styleUri}">
                <link rel="stylesheet" href="${codiconUri}">
	
				<meta name="viewport" content="width=device-width, initial-scale=1.0">
                <style>body { font-size: 1rem; }</style>
			</head>
			<body>	
                <section id="header" class="component-container">
                    <h2 id="problem-nm" class="flex-grow-1">
                        ${this.problem.problem_nm + " - " + this.problem.title}
                    </h2>
                    
                    ${Button("New File", "codicon-new-file")}
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
        console.log("Received message from webview: ", message)

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
                submitProblemToJutge(this.problem, submit_editor.document.uri.fsPath)
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
                const fileUri = await createNewFileForProblem(this.problem)
                if (!fileUri) {
                    return
                }
                await showFileInColumn(fileUri, vscode.ViewColumn.One)
                this.panel.reveal(vscode.ViewColumn.Beside, true)
        }
    }
}
