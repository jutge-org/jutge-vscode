import * as vscode from "vscode"

import { BriefProblem } from "@/jutge_api_client"
import { AuthService } from "@/services/auth"
import { ConfigService } from "@/services/config"
import { JutgeTreeItem } from "./item"
import { JutgeService } from "@/services/jutge"

const _error = (msg: string) => console.error(`[TreeViewProvider] ${msg}`)

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
        if (!(await JutgeService.isUserAuthenticated())) {
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
            const courses = await JutgeService.getCourses()
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
                JutgeService.getCourse(courseKey),
                JutgeService.getAllLists(),
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
            console.debug(`[TreeViewProvider] Getting Problems for list '${listKey}'`)

            const [problemsResult, allStatusesResult] = await Promise.allSettled([
                JutgeService.getAbstractProblemsInList(listKey),
                JutgeService.getAllStatuses(),
            ])

            if (problemsResult.status === "rejected") {
                _error(`Could not load list of problems`)
                return []
            }
            if (allStatusesResult.status === "rejected") {
                _error(`Could not load the statuses`)
                return []
            }

            const problems = problemsResult.value
            const allStatuses = allStatusesResult.value

            const items: JutgeTreeItem[] = []

            for (const [problem_nm, abstractProblem] of Object.entries(problems)) {
                if (problem_nm === null) {
                    items.push(new JutgeTreeItem("Problem name unavailable", vscode.TreeItemCollapsibleState.None))
                    continue
                }

                const problemItem = new JutgeTreeItem(problem_nm, vscode.TreeItemCollapsibleState.None)
                const langCode = ConfigService.getPreferredLangCode()
                const preferredId = `${problem_nm}_${langCode}`

                let problem: BriefProblem | undefined = undefined
                if (preferredId in abstractProblem.problems) {
                    problem = abstractProblem.problems[preferredId]
                } else {
                    problem = Object.values(abstractProblem.problems)[0]
                }

                // Get status for this problem
                const status = allStatuses[problem_nm]?.status

                problemItem.contextValue = "problem"
                problemItem.itemKey = problem_nm
                problemItem.label = `${this._getIconForStatus(status)} ${problem.title}`
                problemItem.command = {
                    command: "jutge-vscode.showProblem",
                    title: "Open Problem",
                    arguments: [problem_nm],
                }
                items.push(problemItem)
            }

            return items
            //
        } catch (error) {
            console.error("Error getting problems from list:", error)
            return []
        }
    }

    private _getIconForStatus(status: string | undefined): string {
        switch (status) {
            case "":
                return ""
            case "accepted":
                return "🟢"
            case "rejected":
                return "🔴"
            default:
                return "⚪"
        }
    }
}
