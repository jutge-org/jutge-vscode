import { getContext, getWorkspaceFolderOrPickOne } from "@/extension"
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
import { htmlProblemView } from "./html"
import { WebviewPanelRegistry } from "./panel-registry"
import { showCodeDocument, sourceFileExists } from "@/utils"

type ProblemViewState = {
    problemNm: string
    order: number
    title?: string
    fileExists?: boolean
}

export class ProblemViewPanel extends Logger {
    public static readonly viewType = "problemView"

    public readonly panel: vscode.WebviewPanel
    public problem: Problem
    public order: number
    public fileExists: boolean
    public problemHandler: ProblemHandler | null = null
    public customTestcases: CustomTestcase[] | null = null

    public constructor(
        panel: vscode.WebviewPanel,
        { problemNm, title, order, fileExists }: ProblemViewState
    ) {
        super()

        this.problem = {
            problem_id: utils.getDefaultProblemId(problemNm),
            problem_nm: problemNm,
            title: title || "",
            language_id: null,
            handler: null,
            statementHtml: null,
            testcases: null,
        }
        this.order = order
        this.fileExists = fileExists || false

        this.panel = panel

        const context = getContext()
        context.subscriptions.push(
            panel.onDidDispose(() => this.dispose(), null, context.subscriptions),
            panel.webview.onDidReceiveMessage(this._handleMessage, this, context.subscriptions)
        )

        this.log.info(`New panel for problem ${problemNm} (${context.extensionUri})`)
        this._loadProblem()
    }

    public dispose() {
        WebviewPanelRegistry.remove(this.problem.problem_nm)
        this.panel.dispose()
    }

    public async notifyProblemFilesChanges() {
        this.fileExists = await sourceFileExists(this.problem, this.order)
        this.customTestcases = await FileService.loadCustomTestcases(this.problem)
        await this.panel.webview.postMessage({
            command: VSCodeToWebviewCommand.UPDATE_PROBLEM_FILES,
            data: {
                fileExists: this.fileExists,
                customTestcases: this.customTestcases,
            },
        })
        this.log.info(
            `Post message: NOTIFY_PROBLEM_FILES_CHANGES` +
                ` (${this.customTestcases.length} custom testcases, fileExists = ${this.fileExists})`
        )
    }

    get handler(): ProblemHandler {
        if (this.problemHandler === null) {
            throw new Error(`Handler is null!`)
        }
        return this.problemHandler
    }

    async addNewTestcase() {
        const workspaceFolder = await getWorkspaceFolderOrPickOne()
        if (!workspaceFolder) {
            return
        }
        const fileUri = await FileService.createNewTestcaseFile(this.problem)
        if (!fileUri) {
            return
        }
        const document = await vscode.workspace.openTextDocument(fileUri)
        await showCodeDocument(document)
        this.panel.reveal(vscode.ViewColumn.Beside, true)
        await this.notifyProblemFilesChanges()
    }

    async editTestcaseByIndex(index: number) {
        const workspaceFolder = await getWorkspaceFolderOrPickOne()
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
        console.debug(`[ProblemViewPanel] Received message from webview: ${message.command}`)
        const { command, data } = message
        switch (command) {
            case WebviewToVSCodeCommand.OPEN_EXISTING_FILE:
                return this.handler.openExistingFile(this.panel)
            case WebviewToVSCodeCommand.NEW_FILE:
                await this.handler.createNewFile(this.panel)
                return this.notifyProblemFilesChanges()
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
                    `[ProblemViewPanel] Don't know how to handle message: ${message.command}`
                )
        }
    }

    private async _loadProblem() {
        this.fileExists = await sourceFileExists(this.problem, this.order)
        const updateWebview = async () => {
            const problemUrl = JutgeService.isExamMode()
                ? `https://exam.jutge.org/problems/${this.problem.problem_id}`
                : `https://jutge.org/problems/${this.problem.problem_id}`

            this.panel.webview.html = htmlProblemView({
                problemUrl,
                problemId: this.problem.problem_id,
                problemNm: this.problem.problem_nm,
                order: this.order,
                problemTitle: this.problem.title,
                fileExists: this.fileExists,
                statementHtml: this.problem.statementHtml || "",
                testcases: this.problem.testcases || [],
                customTestcases: this.customTestcases || [],
                handler: this.problem.handler || null,
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
                        progress.report({ increment: 20, message: "Loaded HTML statement" })
                    }
                    const _loadCustomTestcases = async () => {
                        this.customTestcases = await FileService.loadCustomTestcases(
                            this.problem
                        )
                        progress.report({ increment: 10, message: "Loaded Custom testcases" })
                    }
                    await Promise.allSettled([
                        _loadHandler(),
                        _loadTestcases(),
                        _loadStatementHtml(),
                        _loadCustomTestcases(),
                    ])
                    this.problemHandler = new ProblemHandler(this, this.problem, this.order)
                } catch (e) {
                    console.error(e)
                }
                await updateWebview()
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
            console.warn(
                "[ProblemViewPanel] Preferred language not available. Trying with fallback languages."
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

    private async _showDiff(data: { testcaseId: number; expected: string; received: string }) {
        const { testcaseId, expected, received } = data
        const diffTitle = `Testcase ${testcaseId}: Expected vs. Received Output`
        const expectedUri = vscode.Uri.parse(`jutge-diff://${testcaseId}/expected.txt`)
        const receivedUri = vscode.Uri.parse(`jutge-diff://${testcaseId}/received.txt`)
        const contentProvider = new (class implements vscode.TextDocumentContentProvider {
            onDidChangeEmitter = new vscode.EventEmitter<vscode.Uri>()
            onDidChange = this.onDidChangeEmitter.event
            private _content = new Map<string, string>([
                [expectedUri.toString(), expected],
                [receivedUri.toString(), received],
            ])
            provideTextDocumentContent(uri: vscode.Uri): string {
                return this._content.get(uri.toString()) || ""
            }
        })()
        const registration = vscode.workspace.registerTextDocumentContentProvider(
            "jutge-diff",
            contentProvider
        )
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
        const disposable = vscode.window.onDidChangeVisibleTextEditors((editors) => {
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
