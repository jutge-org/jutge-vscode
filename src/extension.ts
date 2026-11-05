import os from "os"
import vscode from "vscode"

import { AboutTreeProvider, aboutTreeViewType } from "@/providers/about-view/provider"
import { JutgeCourseTreeProvider } from "@/providers/course-view/provider"
import { DashboardPanel } from "@/providers/dashboard-view/provider"
import {
    ExamDocumentsTreeProvider,
    examDocumentsTreeViewType,
} from "@/providers/exam-documents-view/provider"
import { JUTGE_STATS_ID, JutgeStatsTreeProvider } from "@/providers/jutge-stats-view/provider"
import {
    ProfileWebviewViewProvider,
    profileWebviewViewType,
} from "@/providers/profile-view/provider"
import {
    RankingPanel,
    RankingTreeProvider,
    rankingTreeViewType,
} from "@/providers/ranking-view/provider"
import { ConfigService } from "@/services/config"
import { CourseTreeElement } from "./providers/course-view/element"
import {
    examsWebviewViewType,
    JutgeExamsWebviewViewProvider,
} from "./providers/exam-view/provider"
import { ProblemViewPanel } from "./providers/problem-view/panel"
import { WebviewPanelRegistry } from "./providers/problem-view/panel-registry"
import { ProblemViewPanelSerializer } from "./providers/problem-view/panel-serializer"
import {
    SignInWebviewViewProvider,
    signInWebviewViewType,
} from "./providers/sign-in-view/provider"
import { ProblemAutoOpener } from "./services/auto-open"
import { DocumentService } from "./services/documents"
import { JutgeService } from "./services/jutge"
import { ProblemLinkProvider } from "./services/links"
import { SubmissionService } from "./services/submission"
import { findCodeFilenameForProblem, showCodeDocument, splitProblemNm } from "./utils"
import { InfoError } from "./jutge_api_client"

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

export const isDevelopmentMode = () => {
    return context_?.extensionMode === vscode.ExtensionMode.Development
}

/// Workspace folder

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
    console.info(`Development:       ${isDevelopmentMode()}`)
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

const initHomeTreeView = () => {
    const jutgeStatsTreeProvider = new JutgeStatsTreeProvider()
    jutgeStatsView = vscode.window.createTreeView(JUTGE_STATS_ID, {
        showCollapseAll: false,
        treeDataProvider: jutgeStatsTreeProvider,
    })
    return { jutgeStatsTreeProvider, jutgeStatsView }
}

const initAboutTreeView = () => {
    const aboutTreeProvider = new AboutTreeProvider()
    const aboutViewProvider = vscode.window.registerTreeDataProvider(
        aboutTreeViewType,
        aboutTreeProvider
    )
    return { aboutViewProvider }
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

    if (!JutgeService.isState("signed-in") && !JutgeService.isState("signed-in-exam")) {
        vscode.window.showErrorMessage("You need to sign in to Jutge.org to use this feature.")
        return
    }

    // If the command is called from the command palette, ask for the problem number.
    if (problemNm === undefined) {
        if (JutgeService.isMode("exam")) {
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

    // Handle non-abstract problem_nms
    const split = splitProblemNm(problemNm)
    problemNm = split.problemNm
    const language = split.language

    try {
        // Check that the problem really exists
        if (!(await JutgeService.problemExists(problemNm))) {
            vscode.window.showErrorMessage(`Problem ${problemNm} does not exist`)
            return
        }
    } catch (e: unknown) {
        if (e instanceof InfoError) {
            vscode.window.showErrorMessage(`Could not get problem: ${e.message}`)
        }
    }

    await whenWorkspaceFolder(async (workspace) => {
        const fileUri = await findCodeFilenameForProblem(workspace, problemNm)
        if (fileUri) {
            // This command opens the panel itself, so don't let the auto-opener
            // do it again (with a default `order`) when the file becomes active.
            ProblemAutoOpener.markSeen(fileUri)
            const document = await vscode.workspace.openTextDocument(fileUri)
            await showCodeDocument(document)
        }
    })

    await WebviewPanelRegistry.createOrReveal(problemNm, order, language)
    // Force update on "Open Existing File" button + custom testcases
    await WebviewPanelRegistry.notifyProblemFilesChanges(problemNm)
}

/**
 * Opens the problem panel for a `jutge://problems/<problem_id>` link (see
 * `ProblemLinkProvider`). Unlike `commandShowProblem`, it does not open or
 * focus the code file, so clicking a link in a file header does not move the
 * user away from the editor they are working in.
 */
const commandOpenProblemForLink = async (problemNm: string | undefined) => {
    console.debug(`[commandOpenProblemForLink] Problem ${problemNm}`)

    if (!problemNm) {
        return
    }

    if (!JutgeService.isState("signed-in") && !JutgeService.isState("signed-in-exam")) {
        vscode.window.showErrorMessage("You need to sign in to Jutge.org to use this feature.")
        return
    }

    const { problemNm: problemId, language } = splitProblemNm(problemNm)
    await WebviewPanelRegistry.createOrReveal(problemId, -1, language)
}

/**
 * Works as entrypoint when the extension is activated.
 * It is responsible for registering commands and other extension components.
 *
 * @param context Provides access to utilities to manage the extension's lifecycle.
 */
export async function activate(context: vscode.ExtensionContext) {
    setContext_(context)
    showExtensionInfo()

    // Initialize sign-in context keys to concrete values so VS Code can
    // evaluate the `when` clauses for the views from the very first frame
    // (otherwise they stay undefined until the user signs in/out, which can
    // hide the sign-in view on first activation).
    vscode.commands.executeCommand("setContext", "jutge-vscode.isSignedIn.Courses", false)
    vscode.commands.executeCommand("setContext", "jutge-vscode.isSignedIn.Exam", false)
    vscode.commands.executeCommand("setContext", "jutge-vscode.isSignedIn.PreExam", false)
    vscode.commands.executeCommand("setContext", "jutge-vscode.isContestMode", false)

    ConfigService.initialize()
    await JutgeService.initialize(context)

    // Register webview view providers synchronously, before any await, so the
    // sign-in and timer views render immediately on the first activation.
    // Otherwise the Jutge container can appear empty until the user switches
    // to another view and back, because VS Code tries to resolve the views
    // before the providers are registered.
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(
            signInWebviewViewType,
            new SignInWebviewViewProvider(context.extensionUri)
        )
    )
    const profileWebviewViewProvider = new ProfileWebviewViewProvider()
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(
            profileWebviewViewType,
            profileWebviewViewProvider
        )
    )
    const examsWebviewViewProvider = new JutgeExamsWebviewViewProvider(context.extensionUri)
    context.subscriptions.push(examsWebviewViewProvider)
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(
            examsWebviewViewType,
            examsWebviewViewProvider
        )
    )
    SubmissionService.onDidReceiveVeredict((verdict) => {
        examsWebviewViewProvider.refreshProblem(verdict)
    })

    const { courseTreeProvider, coursesView } = initCoursesTreeView()
    const { examDocumentsTreeProvider, examDocumentsView } = initExamDocumentsTreeView()
    const { rankingTreeProvider, rankingView } = initRankingTreeView()
    const { jutgeStatsTreeProvider, jutgeStatsView } = initHomeTreeView()
    const { aboutViewProvider } = initAboutTreeView()

    context.subscriptions.push(coursesView)
    context.subscriptions.push(jutgeStatsView)
    context.subscriptions.push(examDocumentsView)
    context.subscriptions.push(rankingView)
    context.subscriptions.push(rankingTreeProvider)
    context.subscriptions.push(aboutViewProvider)

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
        ["jutge-vscode.signOut", JutgeService.signOut.bind(JutgeService)],
        ["jutge-vscode.signOutExam", JutgeService.signOutExam.bind(JutgeService)],

        ["jutge-vscode.refreshCoursesTree", courseTreeProvider.refresh],
        ["jutge-vscode.refreshExamsTree", examsWebviewViewProvider.refresh],
        [
            "jutge-vscode.refreshProfileTree",
            profileWebviewViewProvider.refresh.bind(profileWebviewViewProvider),
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
            "jutge-vscode.refreshHomeTree",
            jutgeStatsTreeProvider.refresh.bind(jutgeStatsTreeProvider),
        ],
        ["jutge-vscode.showProblem", commandShowProblem],
        ["jutge-vscode.openProblemForLink", commandOpenProblemForLink],
        ["jutge-vscode.openExamDocument", DocumentService.commandOpenExamDocument],

        ["jutge-vscode.invalidateToken", JutgeService.invalidateToken.bind(JutgeService)],
    ])

    // Make `jutge://problems/<problem_id>` links in generated file headers open
    // the problem panel (see `ProblemLinkProvider`).
    context.subscriptions.push(
        vscode.languages.registerDocumentLinkProvider(
            [{ scheme: "file" }, { scheme: "untitled" }],
            new ProblemLinkProvider()
        )
    )

    await vscode.commands.executeCommand(
        "setContext",
        "jutge-vscode.isDevMode",
        isDevelopmentMode()
    )
    if (isDevelopmentMode()) {
        await vscode.commands.executeCommand("workbench.view.extension.jutge")
    }

    await JutgeService.resumeFromStorage()

    // Registered last, so that the sign-in state is already restored when the
    // first editor event arrives.
    ProblemAutoOpener.register(context)

    console.info("[Extension] jutge-vscode is now active")
}
