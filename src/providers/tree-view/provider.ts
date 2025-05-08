import * as vscode from "vscode"

import { BriefProblem } from "@/jutge_api_client"
import { ConfigService } from "@/services/config"
import { JutgeTreeItem } from "./item"
import { JutgeService } from "@/services/jutge"

const _error = (msg: string) => console.error(`[TreeViewProvider] ${msg}`)

export class TreeViewProvider implements vscode.TreeDataProvider<JutgeTreeItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<JutgeTreeItem | undefined | null | void> =
        new vscode.EventEmitter<JutgeTreeItem | undefined | null | void>()

    readonly onDidChangeTreeData: vscode.Event<JutgeTreeItem | undefined | null | void> =
        this._onDidChangeTreeData.event

    refresh(item?: JutgeTreeItem): void {
        this._onDidChangeTreeData.fire(item)
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
            return this._getListsFromCourseNm(element)
        } else if (element.contextValue === "list") {
            return this._getProblemsFromListNm(element)
        }
        return []
    }

    private async _getEnrolledCourseList(): Promise<JutgeTreeItem[]> {
        try {
            const result = JutgeService.getCoursesSWR()
            const courses = result.data || {}
            result.onUpdate = () => this.refresh() // all

            return Object.entries(courses).map(
                ([key, course]) => new JutgeTreeItem(course.course_nm, "collapsed", key, "course")
            )
        } catch (error) {
            console.error(error)
            vscode.window.showErrorMessage("Failed to get enrolled courses")
            return []
        }
    }

    private async _getListsFromCourseNm(courseElem: JutgeTreeItem): Promise<JutgeTreeItem[]> {
        try {
            const courseRes = JutgeService.getCourseSWR(courseElem.itemKey)
            courseRes.onUpdate = () => this.refresh(courseElem)

            const course = courseRes.data
            if (course === undefined) {
                return []
            }

            return course.lists.map((list) => {
                return new JutgeTreeItem(list.title || list.list_nm, "collapsed", list.list_nm, "list")
            })
            //
        } catch (error) {
            console.error(error)
            vscode.window.showErrorMessage(`Failed to get lists from course: ${courseElem.itemKey}`)
            return []
        }
    }

    private async _getProblemsFromListNm(listElem: JutgeTreeItem): Promise<JutgeTreeItem[]> {
        try {
            console.debug(`[TreeViewProvider] Getting Problems for list '${listElem.itemKey}'`)

            const problemsRes = JutgeService.getAbstractProblemsInListSWR(listElem.itemKey)
            problemsRes.onUpdate = () => this.refresh(listElem)

            const statusRes = JutgeService.getAllStatusesSWR()

            if (problemsRes.data === undefined || statusRes.data === undefined) {
                throw new Error(`_getProblemsFromListNm: Error loading problems + statuses`)
            }

            const problems = problemsRes.data
            const allStatuses = statusRes.data

            const items: JutgeTreeItem[] = []

            for (const abstractProblem of problems) {
                const nm = abstractProblem.problem_nm
                const problemItem = new JutgeTreeItem(nm, "none", nm, "problem")
                const langCode = ConfigService.getPreferredLangId()
                const preferredId = `${nm}_${langCode}`

                let problem: BriefProblem | undefined = undefined
                if (preferredId in abstractProblem.problems) {
                    problem = abstractProblem.problems[preferredId]
                } else {
                    problem = Object.values(abstractProblem.problems)[0]
                }

                // Get status for this problem
                const status = allStatuses[nm]?.status

                problemItem.label = `${this._getIconForStatus(status)} ${problem.title}`
                problemItem.command = {
                    command: "jutge-vscode.showProblem",
                    title: "Open Problem",
                    arguments: [nm],
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
