import * as vscode from "vscode"

import { AuthService } from "@/services/AuthService"
import { getDefaultProblemId } from "@/utils/helpers"
import { jutgeClient } from "@/extension"

export function registerTreeViewCommands(context: vscode.ExtensionContext) {
    const treeViewProvider = new TreeViewProvider()
    context.subscriptions.push(vscode.window.registerTreeDataProvider("jutgeTreeView", treeViewProvider))
    context.subscriptions.push(
        vscode.commands.registerCommand("jutge-vscode.refreshTree", () => treeViewProvider.refresh())
    )
}

class JutgeTreeItem extends vscode.TreeItem {
    // API-related ID for the tree item (courseKey, listKey, or problemNm).
    public itemKey?: string

    constructor(label: string, collapsibleState: vscode.TreeItemCollapsibleState) {
        super(label, collapsibleState)
    }
}

export class TreeViewProvider implements vscode.TreeDataProvider<JutgeTreeItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<JutgeTreeItem | undefined | null | void> =
        new vscode.EventEmitter<JutgeTreeItem | undefined | null | void>()
    readonly onDidChangeTreeData: vscode.Event<JutgeTreeItem | undefined | null | void> =
        this._onDidChangeTreeData.event

    refresh(): void {
        this._onDidChangeTreeData.fire()
    }

    // Get TreeItem representation of the element (part of the TreeDataProvider interface).
    getTreeItem(element: JutgeTreeItem): JutgeTreeItem {
        return element
    }

    /**
     * Get children of an element.
     * If an empty list is returned, a welcome view is shown.
     * viewsWelcome are defined in `package.json`.
     */
    async getChildren(element?: JutgeTreeItem): Promise<JutgeTreeItem[]> {
        if (!(await AuthService.isUserAuthenticated())) {
            return []
        }
        if (!element) {
            return this._getEnrolledCourseList()
        } else if (element.contextValue === "course") {
            return this._getListsFromCourseNm(element.itemKey as string)
        } else if (element.contextValue === "list") {
            return this._getProblemsFromListNm(element.itemKey as string)
        }
        return []
    }

    private async _getEnrolledCourseList(): Promise<JutgeTreeItem[]> {
        try {
            const courses = await jutgeClient.student.courses.indexEnrolled()
            return Object.keys(courses).map((courseKey) => {
                const course = courses[courseKey]
                const courseItem = new JutgeTreeItem(course.course_nm, vscode.TreeItemCollapsibleState.Collapsed)
                courseItem.contextValue = "course"
                courseItem.itemKey = courseKey
                return courseItem
            })
        } catch (error) {
            console.error(error)
            vscode.window.showErrorMessage("Failed to get enrolled courses")
            return []
        }
    }

    private async _getListsFromCourseNm(courseKey: string): Promise<JutgeTreeItem[]> {
        try {
            const [course_info, all_lists] = await Promise.all([
                jutgeClient.student.courses.getEnrolled(courseKey),
                jutgeClient.student.lists.getAll(),
            ])
            const lists = course_info.lists

            return lists.map((listKey) => {
                const list = all_lists[listKey]
                if (!list) {
                    console.warn(`List with key ${listKey} not found in all_lists`)
                    return new JutgeTreeItem(listKey, vscode.TreeItemCollapsibleState.None)
                }

                const listTitle = list.title || listKey
                const listItem = new JutgeTreeItem(listTitle, vscode.TreeItemCollapsibleState.Collapsed)
                listItem.contextValue = "list"
                listItem.itemKey = listKey
                return listItem
            })
        } catch (error) {
            console.error(error)
            vscode.window.showErrorMessage("Failed to get lists from course: " + courseKey)
            return []
        }
    }

    private async _getProblemsFromListNm(listKey: string): Promise<JutgeTreeItem[]> {
        try {
            const [list_info, all_statuses] = await Promise.all([
                jutgeClient.student.lists.get(listKey),
                jutgeClient.student.statuses.getAll(),
            ])

            const promises = list_info.items.map(async (problem) => {
                const { problem_nm } = problem
                if (problem_nm === null) {
                    return new JutgeTreeItem("Problem name unavailable", vscode.TreeItemCollapsibleState.None)
                }

                const problemItem = new JutgeTreeItem(problem_nm, vscode.TreeItemCollapsibleState.None)
                const problem_id = getDefaultProblemId(problem_nm)
                const problemInfo = await jutgeClient.problems.getProblem(problem_id)

                // Get status for this problem
                const status = all_statuses[problem_nm]?.status

                problemItem.contextValue = "problem"
                problemItem.itemKey = problem_nm
                problemItem.label = `${this._getIconForStatus(status)} ${problemInfo.title}`
                problemItem.command = {
                    command: "jutge-vscode.showProblem",
                    title: "Open Problem",
                    arguments: [problem_nm],
                }
                return problemItem
            })

            return Promise.all(promises)
        } catch (error) {
            console.error("Error getting problems from list:", error)
            return []
        }
    }

    private _getIconForStatus(status: string | undefined): string {
        if (status === "") {
            return ""
        }
        switch (status) {
            case "accepted":
                return "🟢"
            case "rejected":
                return "🔴"
            default:
                return "⚪"
        }
    }
}
