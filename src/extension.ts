import * as os from "os"
import * as vscode from "vscode"

import { JutgeCourseTreeProvider } from "@/providers/course-view/provider"
import { ConfigService } from "@/services/config"
import * as commands from "./commands"
import { setContext_ as setContext } from "./context"
import { CourseTreeElement } from "./providers/course-view/element"
import { ExamTreeElement } from "./providers/exam-view/element"
import { JutgeExamsTreeProvider } from "./providers/exam-view/provider"
import { ProblemWebviewPanel } from "./providers/problem-webview/panel"
import { WebviewPanelRegistry } from "./providers/problem-webview/panel-registry"
import { ProblemWebviewPanelSerializer } from "./providers/problem-webview/panel-serializer"
import { jutgeClient, JutgeService, setJutgeApiURL } from "./services/jutge"
import { SubmissionService } from "./services/submission"
import { globalStateUpdate, registerCommands, registerWebviewPanelSerializer } from "./utils"

export class JutgeVSCodeExtension {
    coursesTreeProvider: JutgeCourseTreeProvider
    coursesTreeView: vscode.TreeView<CourseTreeElement>

    examsTreeProvider: JutgeExamsTreeProvider
    examsTreeView: vscode.TreeView<ExamTreeElement>

    static singleton: JutgeVSCodeExtension

    constructor() {
        this.coursesTreeProvider = new JutgeCourseTreeProvider()

        this.coursesTreeView = vscode.window.createTreeView("jutge-courses", {
            showCollapseAll: true,
            treeDataProvider: this.coursesTreeProvider,
        })

        // Store the collapsed state of the "folders" in the tree (courses, lists and exams)
        // so that on reload, the tree looks exactly the same as the last time
        this.coursesTreeView.onDidExpandElement(({ element }) =>
            globalStateUpdate(`itemState:${element.getId()}`, "expanded")
        )
        this.coursesTreeView.onDidCollapseElement(({ element }) =>
            globalStateUpdate(`itemState:${element.getId()}`, "collapsed")
        )
        SubmissionService.onDidReceiveVeredict((veredict) => {
            this.coursesTreeProvider.refreshProblem(veredict)
        })

        this.examsTreeProvider = new JutgeExamsTreeProvider()

        this.examsTreeView = vscode.window.createTreeView("jutge-exams", {
            showCollapseAll: true,
            treeDataProvider: this.examsTreeProvider,
        })

        SubmissionService.onDidReceiveVeredict((veredict) => {
            this.examsTreeProvider.refreshProblem(veredict)
        })
    }

    refreshCourses() {
        this.coursesTreeProvider.refresh()
    }

    refreshExams() {
        this.examsTreeProvider.refresh()
    }

    logDebugInfo() {
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
}

/**
 * Works as entrypoint when the extension is activated.
 * It is responsible for registering commands and other extension components.
 *
 * @param context Provides access to utilities to manage the extension's lifecycle.
 */
export async function activate(context: vscode.ExtensionContext) {
    setContext(context)

    const isDevMode = process.env.MODE === "development"
    await vscode.commands.executeCommand("setContext", "jutge-vscode.isDevMode", isDevMode)

    // Set JUTGE_API_URL from the start
    setJutgeApiURL({ examMode: false })

    JutgeVSCodeExtension.singleton = new JutgeVSCodeExtension()
    JutgeVSCodeExtension.singleton.logDebugInfo()

    await JutgeService.initialize(context)
    ConfigService.initialize()

    registerWebviewPanelSerializer(
        ProblemWebviewPanel.viewType,
        new ProblemWebviewPanelSerializer(context)
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
        ["jutge-vscode.signIn", commands.signIn],
        ["jutge-vscode.signOut", commands.signOut],

        ["jutge-vscode.signInExam", commands.examSignIn],
        ["jutge-vscode.signOutExam", commands.examSignOut],

        ["jutge-vscode.refreshCoursesTree", commands.refreshCourses],
        ["jutge-vscode.refreshExamsTree", commands.refreshExams],

        ["jutge-vscode.showProblem", commands.showProblem],

        ["jutge-vscode.invalidateToken", commands.invalidateToken],
    ])

    console.info("[Extension] jutge-vscode is now active")
}
