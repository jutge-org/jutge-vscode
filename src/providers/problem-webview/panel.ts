import { AbstractProblem } from "@/jutge_api_client"
import { ConfigService } from "@/services/config"
import { JutgeService } from "@/services/jutge"
import { makeProblemHandler, ProblemHandler } from "@/services/problem-handler"
import { Problem, WebviewToVSCodeCommand, WebviewToVSCodeMessage } from "@/types"
import * as utils from "@/utils"
import * as vscode from "vscode"
import { htmlForAllTestcases, htmlForWebview } from "./html"
import { WebviewPanelRegistry } from "./panel-registry"

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
    public problemHandler: ProblemHandler | null = null

    public constructor(
        panel: vscode.WebviewPanel,
        context: vscode.ExtensionContext,
        { problemNm, title }: ProblemWebviewState
    ) {
        _info(
            `Constructing a webview panel for problem ${problemNm} (${context.extensionUri})`
        )

        this.context_ = context

        this.panel = panel
        context.subscriptions.push(
            this.panel.onDidDispose(() => this.dispose(), null, context.subscriptions),
            this.panel.webview.onDidReceiveMessage(
                this._handleMessage,
                this,
                context.subscriptions
            )
        )

        this.problem = {
            problem_id: utils.getDefaultProblemId(problemNm),
            problem_nm: problemNm,
            title: title || "",
            language_id: null,
            handler: null,
            statementHtml: null,
            testcases: null,
        }

        // Initialize problem info and update webview
        this._loadProblemAndShow()
    }

    public dispose() {
        WebviewPanelRegistry.remove(this.problem.problem_nm)
        this.panel.dispose()
    }

    get handler(): ProblemHandler {
        if (this.problemHandler === null) {
            throw new Error(`Handler is null!`)
        }
        return this.problemHandler
    }

    private async _handleMessage(message: WebviewToVSCodeMessage) {
        console.debug(
            `[ProblemWebviewPanel] Received message from webview: ${message.command}`
        )

        const { command, data } = message
        switch (command) {
            case WebviewToVSCodeCommand.OPEN_FILE:
                await this.handler.openExistingFile()
                this.panel.reveal(vscode.ViewColumn.Beside, true)
                return

            case WebviewToVSCodeCommand.NEW_FILE:
                await this.handler.createStarterCode()
                this.panel.reveal(vscode.ViewColumn.Beside, true)
                return

            case WebviewToVSCodeCommand.RUN_ALL_TESTCASES:
                return this.handler.runTestcaseAll()

            case WebviewToVSCodeCommand.SUBMIT_TO_JUTGE:
                return this.handler.submitToJudge()

            case WebviewToVSCodeCommand.RUN_TESTCASE:
                return this.handler.runTestcaseByIndex(data.testcaseId)

            case WebviewToVSCodeCommand.SHOW_DIFF:
                return this._showDiff(data)

            default:
                console.warn(
                    `[ProblemWebviewPanel] Don't know how to handle message: ${message.command}`
                )
        }
    }

    private async _loadProblemAndShow() {
        const updateWebview = async () => {
            _info(`Updating HTML for ${this.problem.problem_nm}`)

            this.panel.webview.html = htmlForWebview({
                problemId: this.problem.problem_id,
                problemNm: this.problem.problem_nm,
                problemTitle: this.problem.title,
                statementHtml: this.problem.statementHtml || "",
                testcasesHtml: htmlForAllTestcases(
                    this.problem.testcases || [],
                    this.problem.handler
                ),
                handler: this.problem.handler,
                fileExists: await this.handler.suggestedFileExists(),

                nonce: utils.getNonce(),
                styleUri: this._getUri("dist", "webview", "main.css"),
                scriptUri: this._getUri("dist", "webview", "main.js"),
                cspSource: this.panel.webview.cspSource,
            })
        }

        vscode.window.withProgress(
            {
                location: vscode.ProgressLocation.Notification,
                title: `Loading ${this.problem.problem_nm}`,
                cancellable: false,
            },
            async (progress) => {
                const problemNm = this.problem.problem_nm

                try {
                    progress.report({ increment: 0, message: "Loading..." })

                    _info(`Updating webview contents for ${problemNm}`)

                    progress.report({
                        increment: 20,
                        message: "Getting concrete problem...",
                    })
                    const absProb = await JutgeService.getAbstractProblem(problemNm)
                    const { problem_id, title } = this.__chooseConcreteProblem(
                        problemNm,
                        absProb
                    )
                    this.problem.title = title
                    this.problem.problem_id = problem_id

                    this.panel.title = `${this.problem.problem_nm} - ${title}`

                    const _loadHandler = async () => {
                        const suppl = await JutgeService.getProblemSuppl(problem_id)
                        this.problem.handler = suppl.handler
                        progress.report({ increment: 20, message: "Loaded handler" })
                    }
                    const _loadTestcases = async () => {
                        this.problem.testcases =
                            await JutgeService.getSampleTestcases(problem_id)
                        progress.report({ increment: 20, message: "Loaded testcases" })
                    }
                    const _loadStatementHtml = async () => {
                        this.problem.statementHtml =
                            await JutgeService.getHtmlStatement(problem_id)
                        progress.report({
                            increment: 20,
                            message: "Loaded HTML statement",
                        })
                    }

                    progress.report({ message: "Loading..." })
                    await Promise.allSettled([
                        _loadHandler(),
                        _loadTestcases(),
                        _loadStatementHtml(),
                    ])

                    // Once everything is loaded, we create a problem handler
                    // which will take care of all operations
                    this.problemHandler = await makeProblemHandler(this.problem)
                    //
                } catch (e) {
                    console.error(e)
                }

                await updateWebview()
            }
        )
    }

    private __chooseConcreteProblem(problemNm: string, absProb: AbstractProblem) {
        const langId = ConfigService.getPreferredLangId()
        console.info(`Preferred language is: ${langId}`)
        const concreteProblems = absProb.problems
        let problem
        let id = `${problemNm}_${langId}`
        if (concreteProblems[id]) {
            problem = concreteProblems[id]
        } else {
            console.warn(
                "[ProblemWebviewPanel] Preferred language not available. Trying with fallback languages."
            )
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

    private async _showDiff(data: {
        testcaseId: number
        expected: string
        received: string
    }) {
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
        const registration = vscode.workspace.registerTextDocumentContentProvider(
            "jutge-diff",
            contentProvider
        )

        // Open the diff editor with our virtual documents
        await vscode.commands.executeCommand(
            "vscode.diff",
            expectedUri,
            receivedUri,
            diffTitle,
            {
                viewColumn: vscode.ViewColumn.Beside,
                preview: true,
            }
        )

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
    }
}
