import * as os from "os"
import * as vscode from "vscode"

import { AboutTreeProvider, aboutTreeViewType } from "@/providers/about-view/provider"
import {
    ExamDocumentsTreeProvider,
    examDocumentsTreeViewType,
} from "@/providers/exam-documents-view/provider"
import {
    ExamPropertiesTreeProvider,
    examPropertiesTreeViewType,
} from "@/providers/exam-properties-view/provider"
import {
    RankingPanel,
    RankingTreeProvider,
    rankingTreeViewType,
} from "@/providers/ranking-view/provider"
import { DashboardPanel } from "@/providers/dashboard-view/provider"
import { TimerWebviewViewProvider, timerWebviewViewType } from "@/providers/timer-view/provider"
import { JutgeCourseTreeProvider } from "@/providers/course-view/provider"
import {
    JutgeStatsTreeProvider,
    jutgeStatsTreeViewType,
} from "@/providers/jutge-stats-view/provider"
import { JutgeApiTreeProvider, jutgeApiTreeViewType } from "@/providers/jutge-api-view/provider"
import { ProfileTreeProvider, profileTreeViewType } from "@/providers/profile-view/provider"
import { ConfigService } from "@/services/config"
import { JutgeExamsTreeProvider } from "./providers/exam-view/provider"
import { ProblemViewPanel } from "./providers/problem-view/panel"
import { WebviewPanelRegistry } from "./providers/problem-view/panel-registry"
import { ProblemViewPanelSerializer } from "./providers/problem-view/panel-serializer"
import {
    SignInWebviewViewProvider,
    signInWebviewViewType,
} from "./providers/sign-in-view/provider"
import { CourseTreeElement } from "./providers/course-view/element"
import { ApiMode, jutgeClient, JutgeService } from "./services/jutge"
import { SubmissionService } from "./services/submission"
import { findCodeFilenameForProblem, showCodeDocument } from "./utils"
import * as path from "path"

export const setJutgeApiURL = ({ mode, useDevApi }: { mode: ApiMode; useDevApi: boolean }) => {
    const apiBaseByMode: Record<ApiMode, string> = {
        normal: "api.jutge.org/api",
        exam: "exam.api.jutge.org/api",
        contest: "contest.api.jutge.org/api",
    }
    const devApiBaseByMode: Record<ApiMode, string> = {
        normal: "dev.api.jutge.org/api",
        exam: "dev.exam.api.jutge.org/api",
        contest: "dev.contest.api.jutge.org/api",
    }
    const apiBase = useDevApi ? devApiBaseByMode[mode] : apiBaseByMode[mode]
    jutgeClient.JUTGE_API_URL = `https://${apiBase}`
    console.log(`[Extension]: JUTGE_API_URL = '${jutgeClient.JUTGE_API_URL}'`)
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

/// Keep a global copy of the context for the whole extension to use
/// (Could this be wrong? We assume that the context is the same object all the time)

let context_: vscode.ExtensionContext | undefined = undefined

const setContext_ = (context: vscode.ExtensionContext) => {
    context_ = context
}

export const getContext = (): vscode.ExtensionContext => {
    if (!context_) {
        throw new Error(`Context is undefined!!!`)
    }
    return context_
}

export async function whenWorkspaceFolder(
    bodyFunc: (workspace: vscode.WorkspaceFolder) => Promise<void>
) {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0]
    if (workspaceFolder) {
        await bodyFunc(workspaceFolder)
    }
}

export function getWorkspaceFolder(): vscode.WorkspaceFolder | undefined {
    return vscode.workspace.workspaceFolders?.[0]
}

export async function getWorkspaceFolderOrPickOne(): Promise<
    vscode.WorkspaceFolder | undefined
> {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0]
    if (workspaceFolder) {
        return workspaceFolder
    }
    const selection = await vscode.window.showInformationMessage(
        "You need to have an open folder to create source files.",
        { title: "Open Folder" }
    )
    if (selection && selection.title === "Open Folder") {
        console.log(`[Extension]: User chose to open folder`)
        vscode.commands.executeCommand("vscode.openFolder")
    }

    return undefined
}

export const getIconUri = (theme: "dark" | "light", filename: string) =>
    vscode.Uri.joinPath(getContext().extensionUri, "resources", theme, filename)

export const globalStateGet = (key: string): string | undefined =>
    getContext().globalState.get(key)

export const globalStateUpdate = (key: string, value: string) =>
    getContext().globalState.update(key, value)

const registerCommand = (command: string, callback: (...args: any[]) => any) => {
    const disposable = vscode.commands.registerCommand(command, callback)
    getContext().subscriptions.push(disposable)
}

const registerWebviewPanelSerializer = (
    viewType: string,
    serializer: vscode.WebviewPanelSerializer
) => {
    const disposable = vscode.window.registerWebviewPanelSerializer(viewType, serializer)
    getContext().subscriptions.push(disposable)
}

const showExtensionInfo = () => {
    const extension = vscode.extensions.getExtension("jutge.jutge-vscode")
    const extensionVersion = extension?.packageJSON.version || "unknown"

    console.info("=== jutge-vscode initialization ===")
    console.info(`Extension Version: ${extensionVersion}`)
    console.info(`VS Code Version:   ${vscode.version}`)
    console.info(`Operating System:  ${os.type()} ${os.release()} ${os.arch()}`)
    console.info(`Node.js Version:   ${process.version}`)
    console.info(`Date:              ${new Date().toISOString()}`)
    console.info(`MODE:              ${process.env.MODE}`)
    console.info(`JUTGE_API_URL:     ${jutgeClient.JUTGE_API_URL}`)
    console.info("===================================")
}

export let coursesView: vscode.TreeView<CourseTreeElement> | null = null
export let jutgeStatsView: vscode.TreeView<any> | null = null

const initCoursesTreeView = () => {
    const courseTreeProvider = new JutgeCourseTreeProvider()

    coursesView = vscode.window.createTreeView("jutge-courses", {
        showCollapseAll: true,
        treeDataProvider: courseTreeProvider,
    })

    // Store the collapsed state of the "folders" in the tree (courses, lists and exams)
    // so that on reload, the tree looks exactly the same as the last time
    coursesView.onDidExpandElement(({ element }) =>
        globalStateUpdate(`itemState:${element.getId()}`, "expanded")
    )
    coursesView.onDidCollapseElement(({ element }) =>
        globalStateUpdate(`itemState:${element.getId()}`, "collapsed")
    )
    SubmissionService.onDidReceiveVeredict((veredict) => {
        courseTreeProvider.refreshProblem(veredict)
    })

    return { courseTreeProvider, coursesView }
}

const initExamsTreeView = () => {
    const examsTreeProvider = new JutgeExamsTreeProvider()

    const examsTreeView = vscode.window.createTreeView("jutge-exams", {
        showCollapseAll: true,
        treeDataProvider: examsTreeProvider,
    })

    return { examsTreeProvider }
}

const initHomeTreeView = () => {
    const jutgeStatsTreeProvider = new JutgeStatsTreeProvider()
    jutgeStatsView = vscode.window.createTreeView(jutgeStatsTreeViewType, {
        showCollapseAll: false,
        treeDataProvider: jutgeStatsTreeProvider,
    })
    return { jutgeStatsTreeProvider, jutgeStatsView }
}

const initApiTreeView = () => {
    const jutgeApiTreeProvider = new JutgeApiTreeProvider()
    const jutgeApiView = vscode.window.createTreeView(jutgeApiTreeViewType, {
        showCollapseAll: false,
        treeDataProvider: jutgeApiTreeProvider,
    })
    return { jutgeApiTreeProvider, jutgeApiView }
}

const initAboutTreeView = () => {
    const aboutTreeProvider = new AboutTreeProvider()
    const aboutViewProvider = vscode.window.registerTreeDataProvider(
        aboutTreeViewType,
        aboutTreeProvider
    )
    return { aboutViewProvider }
}

const initExamPropertiesTreeView = () => {
    const examPropertiesTreeProvider = new ExamPropertiesTreeProvider()
    const examPropertiesView = vscode.window.createTreeView(examPropertiesTreeViewType, {
        showCollapseAll: true,
        treeDataProvider: examPropertiesTreeProvider,
    })
    return { examPropertiesTreeProvider, examPropertiesView }
}

const initProfileTreeView = () => {
    const profileTreeProvider = new ProfileTreeProvider()
    const profileView = vscode.window.createTreeView(profileTreeViewType, {
        showCollapseAll: true,
        treeDataProvider: profileTreeProvider,
    })
    return { profileTreeProvider, profileView }
}

const initExamDocumentsTreeView = () => {
    const examDocumentsTreeProvider = new ExamDocumentsTreeProvider()
    const examDocumentsView = vscode.window.createTreeView(examDocumentsTreeViewType, {
        showCollapseAll: false,
        treeDataProvider: examDocumentsTreeProvider,
    })
    return { examDocumentsTreeProvider, examDocumentsView }
}

const initRankingTreeView = () => {
    const rankingTreeProvider = new RankingTreeProvider()
    const rankingView = vscode.window.createTreeView(rankingTreeViewType, {
        showCollapseAll: false,
        treeDataProvider: rankingTreeProvider,
    })
    return { rankingTreeProvider, rankingView }
}

const registerCommands = (commands: [string, (...args: any[]) => any][]) => {
    for (const [command, callback] of commands) {
        registerCommand(command, callback)
    }
}

//// Commands

const commandShowProblem = async (problemNm: string | undefined, order: number) => {
    console.debug(`[commandShowProblem] Problem ${problemNm} (order = ${order})`)

    if (!JutgeService.isSignedIn()) {
        vscode.window.showErrorMessage("You need to sign in to Jutge.org to use this feature.")
        return
    }

    // If the command is called from the command palette, ask for the problem number.
    if (problemNm === undefined) {
        if (JutgeService.isExamMode()) {
            vscode.window.showErrorMessage(
                "In exam mode you can only see problems from the exam"
            )
            return
        }

        problemNm = await vscode.window.showInputBox({
            title: "Jutge Problem ID",
            placeHolder: "P12345",
            prompt: "Please write the problem ID.",
            value: "",
        })
        if (!problemNm) {
            return
        }
    }

    // Check that the problem really exists
    if (!(await JutgeService.problemExists(problemNm))) {
        vscode.window.showErrorMessage(`Problem ${problemNm} does not exist`)
        return
    }

    await whenWorkspaceFolder(async (workspace) => {
        const fileUri = await findCodeFilenameForProblem(workspace, problemNm)
        if (fileUri) {
            const document = await vscode.workspace.openTextDocument(fileUri)
            await showCodeDocument(document)
        }
    })

    await WebviewPanelRegistry.createOrReveal(problemNm, order)
    // Force update on "Open Existing File" button + custom testcases
    await WebviewPanelRegistry.notifyProblemFilesChanges(problemNm)
}

const commandOpenExamDocument = async (
    documentNm: string | undefined,
    displayTitle?: string
) => {
    if (!JutgeService.isSignedInExam()) {
        vscode.window.showErrorMessage("You need to be signed in to an exam or contest.")
        return
    }

    if (!documentNm) {
        vscode.window.showErrorMessage("Missing document name.")
        return
    }

    try {
        const download = await jutgeClient.student.exam.getDocumentPdf(documentNm)
        const baseName = download.name?.trim() || `${documentNm}.pdf`
        const fileName =
            path.extname(baseName).toLowerCase() === ".pdf" ? baseName : `${baseName}.pdf`
        const sanitizedDocumentNm = documentNm.replace(/[^a-zA-Z0-9._-]/g, "_")
        const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_")
        const docsDirUri = vscode.Uri.file(path.join(os.tmpdir(), "jutge-vscode-documents"))
        await vscode.workspace.fs.createDirectory(docsDirUri)
        const uri = vscode.Uri.joinPath(
            docsDirUri,
            `${sanitizedDocumentNm}-${sanitizedFileName}`
        )

        await vscode.workspace.fs.writeFile(uri, download.data)
        try {
            await vscode.commands.executeCommand("vscode.openWith", uri, "pdf.preview")
        } catch {
            const opened = await vscode.env.openExternal(uri)
            if (!opened) {
                await vscode.commands.executeCommand("vscode.open", uri)
            }
        }
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        vscode.window.showErrorMessage(
            `Could not open document "${displayTitle || documentNm}": ${message}`
        )
    }
}

/**
 * Works as entrypoint when the extension is activated.
 * It is responsible for registering commands and other extension components.
 *
 * @param context Provides access to utilities to manage the extension's lifecycle.
 */
export async function activate(context: vscode.ExtensionContext) {
    setContext_(context)
    const isDevelopmentMode = context.extensionMode === vscode.ExtensionMode.Development

    // Set JUTGE_API_URL from the start
    setJutgeApiURL({ mode: "normal", useDevApi: false })

    showExtensionInfo()

    await JutgeService.initialize(context)
    ConfigService.initialize()

    const { courseTreeProvider } = initCoursesTreeView()
    const { examsTreeProvider } = initExamsTreeView()
    const { examPropertiesTreeProvider, examPropertiesView } = initExamPropertiesTreeView()
    const { profileTreeProvider, profileView } = initProfileTreeView()
    const { examDocumentsTreeProvider, examDocumentsView } = initExamDocumentsTreeView()
    const { rankingTreeProvider, rankingView } = initRankingTreeView()
    const { jutgeStatsTreeProvider, jutgeStatsView } = initHomeTreeView()
    const { jutgeApiTreeProvider, jutgeApiView } = initApiTreeView()
    const { aboutViewProvider } = initAboutTreeView()
    context.subscriptions.push(jutgeStatsView)
    context.subscriptions.push(jutgeApiView)
    context.subscriptions.push(profileView)
    context.subscriptions.push(examPropertiesView)
    context.subscriptions.push(examDocumentsView)
    context.subscriptions.push(rankingView)
    context.subscriptions.push(rankingTreeProvider)
    context.subscriptions.push(aboutViewProvider)

    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(
            signInWebviewViewType,
            new SignInWebviewViewProvider(context.extensionUri, isDevelopmentMode)
        )
    )
    const timerWebviewViewProvider = new TimerWebviewViewProvider(context.extensionUri)
    context.subscriptions.push(timerWebviewViewProvider)
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(
            timerWebviewViewType,
            timerWebviewViewProvider
        )
    )
    registerWebviewPanelSerializer(
        ProblemViewPanel.viewType,
        new ProblemViewPanelSerializer(context)
    )

    // Update custom testcases whenever the user deletes a test file
    vscode.workspace.onDidDeleteFiles((event) => {
        WebviewPanelRegistry.updatePanelsOnChangedFiles(event.files)
    })
    vscode.workspace.onDidCreateFiles((event) => {
        WebviewPanelRegistry.updatePanelsOnChangedFiles(event.files)
    })
    vscode.workspace.onDidSaveTextDocument((event) => {
        WebviewPanelRegistry.updatePanelsOnChangedFiles([event.uri])
    })

    registerCommands([
        ["jutge-vscode.signIn", JutgeService.signIn.bind(JutgeService)],
        ["jutge-vscode.signOut", JutgeService.signOut.bind(JutgeService)],

        ["jutge-vscode.signInExam", JutgeService.signInExam.bind(JutgeService)],
        ["jutge-vscode.signOutExam", JutgeService.signOutExam.bind(JutgeService)],

        ["jutge-vscode.refreshCoursesTree", courseTreeProvider.refresh],
        ["jutge-vscode.refreshExamsTree", examsTreeProvider.refresh],
        [
            "jutge-vscode.refreshExamPropertiesTree",
            examPropertiesTreeProvider.refresh.bind(examPropertiesTreeProvider),
        ],
        [
            "jutge-vscode.refreshProfileTree",
            profileTreeProvider.refresh.bind(profileTreeProvider),
        ],
        ["jutge-vscode.openDashboardPanel", DashboardPanel.openOrReveal],
        [
            "jutge-vscode.refreshExamDocumentsTree",
            examDocumentsTreeProvider.refresh.bind(examDocumentsTreeProvider),
        ],
        [
            "jutge-vscode.refreshRankingTree",
            rankingTreeProvider.refresh.bind(rankingTreeProvider),
        ],
        ["jutge-vscode.openRankingPanel", RankingPanel.openOrReveal],
        [
            "jutge-vscode.refreshClockView",
            timerWebviewViewProvider.forceRefresh.bind(timerWebviewViewProvider),
        ],
        [
            "jutge-vscode.refreshHomeTree",
            jutgeStatsTreeProvider.refresh.bind(jutgeStatsTreeProvider),
        ],
        [
            "jutge-vscode.refreshApiTree",
            jutgeApiTreeProvider.refresh.bind(jutgeApiTreeProvider),
        ],

        ["jutge-vscode.showProblem", commandShowProblem],
        ["jutge-vscode.openExamDocument", commandOpenExamDocument],

        ["jutge-vscode.invalidateToken", JutgeService.invalidateToken.bind(JutgeService)],
    ])

    console.info("[Extension] jutge-vscode is now active")

    await vscode.commands.executeCommand(
        "setContext",
        "jutge-vscode.isDevMode",
        process.env.MODE === "development"
    )

    if (isDevelopmentMode) {
        await vscode.commands.executeCommand("workbench.view.extension.jutge")
    }
}
