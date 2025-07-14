import * as vscode from "vscode"

import { AbstractProblem, AbstractStatus, BriefProblem } from "@/jutge_api_client"
import { ConfigService } from "@/services/config"
import { JutgeTreeItem } from "./item"
import { JutgeService } from "@/services/jutge"
import { IconStatus, OnVeredictMaker } from "@/types"

const _error = (msg: unknown) => {
    console.error(`[TreeViewProvider] ${msg}`)
}
const _info = (msg: unknown) => {
    console.info(`[TreeViewProvider] ${msg}`)
}

export class JutgeCourseTreeProvider implements vscode.TreeDataProvider<JutgeTreeItem> {
    // FIXME: Is there any better way to do this? I'm storing all references to
    // problemNms because I want to know the correspondence from problemNms to items... :\
    private problemNm2item: Map<string, JutgeTreeItem> = new Map()

    private _onDidChangeTreeData: vscode.EventEmitter<JutgeTreeItem | undefined | null | void> =
        new vscode.EventEmitter<JutgeTreeItem | undefined | null | void>()

    readonly onDidChangeTreeData: vscode.Event<JutgeTreeItem | undefined | null | void> =
        this._onDidChangeTreeData.event

    private context_: vscode.ExtensionContext

    constructor(context: vscode.ExtensionContext) {
        this.context_ = context
    }

    refresh(item?: JutgeTreeItem): void {
        this._onDidChangeTreeData.fire(item)
    }

    private _onVeredictMaker(problemNm: string): (status: IconStatus) => void {
        return (status: IconStatus) => {
            const item = this.problemNm2item.get(problemNm)
            if (!item) {
                _error(`onVeredictChange: problem ${problemNm} not found in map.`)
                return
            }
            let label = item.label
            if (label && typeof label === "string") {
                label = label.slice(3) // Skip icon (2 bytes) and space
            }
            const newIcon = this._getIconForStatus(status)
            item.label = `${newIcon} ${label}`
            _info(`Refreshing problem ${problemNm}`)
            this.refresh(item)
        }
    }

    get onVeredictMaker(): OnVeredictMaker {
        return this._onVeredictMaker.bind(this)
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
        if (!element && JutgeService.isExamMode()) {
            return this._getExam()
        } else if (!element) {
            return this._getEnrolledCourseList()
        } else if (element.contextValue === "exam") {
            return this._getExamProblems(element)
        } else if (element.contextValue === "course") {
            return this._getListsFromCourseNm(element)
        } else if (element.contextValue === "list") {
            return this._getProblemsFromListNm(element)
        }
        return []
    }

    private async _getExamProblems(element: JutgeTreeItem): Promise<JutgeTreeItem[]> {
        try {
            const swrExam = JutgeService.getExamSWR()
            swrExam.onUpdate = () => this.refresh(element)

            const exam = swrExam.data
            if (!exam) {
                return []
            }

            const problem_nms = exam.problems.map((p) => p.problem_nm)

            const swrProblems = JutgeService.getAbstractProblemsSWR(problem_nms)
            swrProblems.onUpdate = () => this.refresh(element)

            const swrStatus = JutgeService.getAllStatusesSWR()
            swrStatus.onUpdate = () => this.refresh(element)

            if (swrProblems.data === undefined || swrStatus.data === undefined) {
                return []
            }

            const abstractProblems = swrProblems.data
            const allStatuses = swrStatus.data

            const items: JutgeTreeItem[] = []
            for (const abstractProblem of abstractProblems) {
                items.push(this._abstractProblemToItem(abstractProblem, allStatuses))
            }
            return items
            //
        } catch (error) {
            _error(error)
            vscode.window.showErrorMessage("Failed ot get exam problems")
            return []
        }
    }

    private async _getExam(): Promise<JutgeTreeItem[]> {
        try {
            const swrExam = JutgeService.getExamSWR()
            swrExam.onUpdate = () => this.refresh()

            const exam = swrExam.data
            if (!exam) {
                return []
            }
            const state = this.context_.globalState.get<"collapsed" | "expanded" | "none">(`itemState:exam`)
            return [this.makeTreeItem(exam.title, state || "collapsed", "exam", "exam")]
        } catch (error) {
            _error(error)
            vscode.window.showErrorMessage("Failed ot get exam")
            return []
        }
    }

    private async _getEnrolledCourseList(): Promise<JutgeTreeItem[]> {
        try {
            const result = JutgeService.getCoursesSWR()
            const courses = result.data || {}
            result.onUpdate = () => this.refresh() // all

            return Object.entries(courses).map(([key, course]) => {
                const state = this.context_.globalState.get<"collapsed" | "expanded" | "none">(`itemState:${key}`)
                return this.makeTreeItem(course.course_nm, state || "collapsed", key, "course")
            })
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
                const key = list.list_nm
                const state = this.context_.globalState.get<"collapsed" | "expanded" | "none">(`itemState:${key}`)
                return this.makeTreeItem(list.title || list.list_nm, state || "collapsed", key, "list")
            })
            //
        } catch (error) {
            console.error(error)
            vscode.window.showErrorMessage(`Failed to get lists from course: ${courseElem.itemKey}`)
            return []
        }
    }

    private makeTreeItem(
        label: string,
        state: "collapsed" | "expanded" | "none",
        problemNm: string,
        contextValue: string
    ) {
        const newItem = new JutgeTreeItem(label, state, problemNm, contextValue)
        // keep the item in a map, by problemNm (itemKey)
        this.problemNm2item.set(problemNm, newItem)
        return newItem
    }

    private _abstractProblemToItem(
        abstractProblem: AbstractProblem,
        allStatuses: Record<string, AbstractStatus>
    ): JutgeTreeItem {
        const nm = abstractProblem.problem_nm
        const problemItem = this.makeTreeItem(nm, "none", nm, "problem")
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
        let iconStatus: IconStatus | undefined
        if (status === "accepted") {
            iconStatus = IconStatus.ACCEPTED
        } else if (status === "rejected") {
            iconStatus = IconStatus.REJECTED
        }

        problemItem.label = `${this._getIconForStatus(iconStatus)} ${problem.title}`
        problemItem.command = {
            command: "jutge-vscode.showProblem",
            title: "Open Problem",
            arguments: [nm],
        }

        return problemItem
    }

    private async _getProblemsFromListNm(listElem: JutgeTreeItem): Promise<JutgeTreeItem[]> {
        try {
            console.debug(`[TreeViewProvider] Getting Problems for list '${listElem.itemKey}'`)

            const swrProblems = JutgeService.getAbstractProblemsInListSWR(listElem.itemKey)
            swrProblems.onUpdate = () => this.refresh(listElem)

            const swrStatus = JutgeService.getAllStatusesSWR()
            swrStatus.onUpdate = () => this.refresh(listElem)

            if (swrProblems.data === undefined || swrStatus.data === undefined) {
                return []
            }

            const problems = swrProblems.data
            const allStatuses = swrStatus.data

            const items: JutgeTreeItem[] = []
            for (const abstractProblem of problems) {
                items.push(this._abstractProblemToItem(abstractProblem, allStatuses))
            }

            return items
            //
        } catch (error) {
            console.error("Error getting problems from list:", error)
            return []
        }
    }

    private _getIconForStatus(status: IconStatus | undefined): string {
        switch (status) {
            case IconStatus.ACCEPTED:
                return "🟢"
            case IconStatus.REJECTED:
                return "🔴"
            default:
                return "⚪"
        }
    }
}
