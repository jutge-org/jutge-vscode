import { getContext, getWorkspaceFolderWithErrorMessage } from "@/extension"
import { AbstractProblem } from "@/jutge_api_client"
import { Logger } from "@/loggers"
import { ConfigService } from "@/services/config"
import { FileService } from "@/services/file"
import { JutgeService } from "@/services/jutge"
import { ProblemHandler } from "@/services/problem-handler"
import {
    CustomTestcase,
    Problem,
    VSCodeToWebviewCommand,
    WebviewToVSCodeCommand,
    WebviewToVSCodeMessage,
} from "@/types"
import * as utils from "@/utils"
import { existsSync } from "node:fs"
import * as vscode from "vscode"
import { htmlWebview } from "./html"
import { WebviewPanelRegistry } from "./panel-registry"
import { showCodeDocument } from "@/utils"

type ProblemWebviewState = {
    problemNm: string
    title?: string
}

export class ProblemWebviewPanel extends Logger {
    public static readonly viewType = "problemWebview"

    public readonly panel: vscode.WebviewPanel
    public problem: Problem
    public problemHandler: ProblemHandler | null = null
    public customTestcases: CustomTestcase[] | null = null

    public constructor(
        panel: vscode.WebviewPanel,
        { problemNm, title }: ProblemWebviewState
    ) {
        super()

        const context = getContext()

        this.log.info(`New panel for problem ${problemNm} (${context.extensionUri})`)

        this.panel = panel

        context.subscriptions.push(
            panel.onDidDispose(() => this.dispose(), null, context.subscriptions),
            panel.webview.onDidReceiveMessage(
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
        this._loadProblem()
    }

    public dispose() {
        WebviewPanelRegistry.remove(this.problem.problem_nm)
        this.panel.dispose()
    }

    public async updateCustomTestcases() {
        this.customTestcases = await FileService.loadCustomTestcases(this.problem)
        await this.panel.webview.postMessage({
            command: VSCodeToWebviewCommand.UPDATE_CUSTOM_TESTCASES,
            data: { customTestcases: this.customTestcases },
        })
    }

    get handler(): ProblemHandler {
        if (this.problemHandler === null) {
            throw new Error(`Handler is null!`)
        }
        return this.problemHandler
    }

    async addNewTestcase() {
        this.log.info(`Adding new test case`)

        const workspaceFolder = getWorkspaceFolderWithErrorMessage()
        if (!workspaceFolder) {
            return
        }
        const fileUri = await FileService.createNewTestcaseFile(this.problem)
        if (!fileUri) {
            return
        }
        const document = await vscode.workspace.openTextDocument(fileUri)
        await showCodeDocument(document)

        await this.updateCustomTestcases()
        this.panel.reveal(vscode.ViewColumn.Beside, true)
    }

    async editTestcaseByIndex(index: number) {
        const workspaceFolder = getWorkspaceFolderWithErrorMessage()
        if (!workspaceFolder) {
            return
        }
        const filename = FileService.makeTestcaseFilename(this.problem, index)
        const fileUri = vscode.Uri.joinPath(workspaceFolder.uri, filename)
        if (!existsSync(fileUri.fsPath)) {
            return
        }
        const document = await vscode.workspace.openTextDocument(fileUri)
        await showCodeDocument(document)
        this.panel.reveal(vscode.ViewColumn.Beside, true)
    }

    private async _handleMessage(message: WebviewToVSCodeMessage) {
        console.debug(
            `[ProblemWebviewPanel] Received message from webview: ${message.command}`
        )

        const { command, data } = message
        switch (command) {
            case WebviewToVSCodeCommand.OPEN_FILE:
                return this.handler.openExistingFile(this.panel)

            case WebviewToVSCodeCommand.NEW_FILE:
                return this.handler.createNewFile(this.panel)

            case WebviewToVSCodeCommand.ADD_NEW_TESTCASE:
                return this.addNewTestcase()

            case WebviewToVSCodeCommand.RUN_ALL_TESTCASES:
                return this.handler.runTestcaseAll()

            case WebviewToVSCodeCommand.SUBMIT_TO_JUTGE:
                return this.handler.submitToJudge()

            case WebviewToVSCodeCommand.RUN_TESTCASE:
                return this.handler.runTestcaseByIndex(data.testcaseId)

            case WebviewToVSCodeCommand.EDIT_TESTCASE:
                return this.editTestcaseByIndex(data.testcaseId)

            case WebviewToVSCodeCommand.RUN_CUSTOM_TESTCASE:
                return this.handler.runCustomTestcaseByIndex(data.testcaseId)

            case WebviewToVSCodeCommand.SHOW_DIFF:
                return this._showDiff(data)

            default:
                console.warn(
                    `[ProblemWebviewPanel] Don't know how to handle message: ${message.command}`
                )
        }
    }

    private async _loadProblem() {
        const updateWebview = async () => {
            this.log.info(`Updating HTML for ${this.problem.problem_nm}`)

            this.panel.webview.html = htmlWebview({
                problemId: this.problem.problem_id,
                problemNm: this.problem.problem_nm,
                problemTitle: this.problem.title,
                statementHtml: this.problem.statementHtml || "",
                testcases: this.problem.testcases || [],
                customTestcases: this.customTestcases || [],
                handler: this.problem.handler || null,
                fileExists: await this.handler.sourceFileExists(),

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

                    this.log.info(`Updating webview contents for ${problemNm}`)

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
                    const _loadCustomTestcases = async () => {
                        this.customTestcases = await FileService.loadCustomTestcases(
                            this.problem
                        )
                        progress.report({
                            increment: 10,
                            message: "Loaded Custom testcases",
                        })
                    }

                    progress.report({ message: "Loading..." })
                    await Promise.allSettled([
                        _loadHandler(),
                        _loadTestcases(),
                        _loadStatementHtml(),
                        _loadCustomTestcases(),
                    ])

                    // Once everything is loaded, we create a problem handler
                    // which will take care of all operations
                    this.problemHandler = new ProblemHandler(this, this.problem)
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
        const context = getContext()
        const uri = vscode.Uri.joinPath(context.extensionUri, ...path)
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
