import * as vscode from "vscode"

import { AbstractProblem, AbstractStatus, BriefProblem } from "@/jutge_api_client"
import { ConfigService } from "@/services/config"
import { JutgeService } from "@/services/jutge"
import {
    getIconForStatus,
    IconStatus,
    OnVeredictMaker,
    status2Icon,
    status2IconStatus,
} from "@/types"
import { join } from "path"
import { CourseItemType, CourseTreeElement, TreeItemCollapseState } from "./element"
import { CourseTreeItem } from "./item"

const _error = (msg: unknown) => console.error(`[TreeViewProvider] ${msg}`)
const _info = (msg: unknown) => console.info(`[TreeViewProvider] ${msg}`)

export class JutgeCourseTreeProvider
    implements vscode.TreeDataProvider<CourseTreeElement>
{
    private _emitter: vscode.EventEmitter<CourseTreeElement | undefined | null | void> =
        new vscode.EventEmitter<CourseTreeElement | undefined | null | void>()

    // This member is for VSCode, so that we can signal changes in the tree
    readonly onDidChangeTreeData: vscode.Event<
        CourseTreeElement | undefined | null | void
    > = this._emitter.event

    // FIXME: Is there any better way to do this? I'm storing all references to
    // problemNms because I want to know the correspondence from problemNms to items... :\
    private problemNm2item: Map<string, CourseTreeItem> = new Map()

    private globalState: vscode.Memento
    private iconPrefixUri: vscode.Uri

    constructor(context: vscode.ExtensionContext) {
        this.globalState = context.globalState
        this.iconPrefixUri = vscode.Uri.joinPath(context.extensionUri, "resources")
    }

    // Get TreeItem representation of the element (part of the TreeDataProvider interface).
    getTreeItem(element: CourseTreeElement): CourseTreeItem {
        const item = element.toTreeItem(this.iconPrefixUri)
        this.problemNm2item.set(element.key, item) // keep the item in a map, by problemNm (itemKey)
        return item
    }

    /**
     * Get children of an element.
     * If an empty list is returned, a welcome view is shown.
     * viewsWelcome are defined in `package.json`.
     */
    async getChildren(parent?: CourseTreeElement): Promise<CourseTreeElement[]> {
        if (!(await JutgeService.isUserAuthenticated())) {
            return []
        } else if (!parent) {
            return JutgeService.isExamMode()
                ? this.getExam_()
                : this.getEnrolledCourseList_()
        } else if (parent.type === "exam") {
            return this.getExamProblems_(parent)
        } else if (parent.type === "course") {
            return this.getListsFromCourseNm_(parent)
        } else if (parent.type === "list") {
            return this.getProblemsFromListNm_(parent)
        }
        return []
    }

    private makeTreeElement(
        type: CourseItemType,
        key: string,
        label: string,
        iconStatus: IconStatus,
        parent?: CourseTreeElement
    ) {
        const defaultState = type === "problem" ? "none" : "collapsed"
        const state: TreeItemCollapseState =
            this.globalState.get(`itemState:${type}:${key}`) || defaultState
        const newElem = new CourseTreeElement(type, key, label, state, iconStatus)
        if (parent) {
            newElem.parent = parent
        }
        return newElem
    }

    public refresh(item?: CourseTreeElement): void {
        this._emitter.fire(item)
    }

    private onVeredictMaker_(problemNm: string): (status: IconStatus) => void {
        return (status: IconStatus) => {
            const item = this.problemNm2item.get(problemNm)
            if (!item) {
                _error(`onVeredictChange: problem ${problemNm} not found in map.`)
                return
            }
            _info(`Refreshing problem ${problemNm}`)
            this.refresh(item.element)
        }
    }

    get onVeredictMaker(): OnVeredictMaker {
        return this.onVeredictMaker_.bind(this)
    }

    private async getExamProblems_(
        examElement: CourseTreeElement
    ): Promise<CourseTreeElement[]> {
        try {
            const swrExam = JutgeService.getExamSWR()
            swrExam.onUpdate = () => this.refresh(examElement)

            const exam = swrExam.data
            if (!exam) {
                return []
            }

            const problem_nms = exam.problems.map((p) => p.problem_nm)

            const swrProblems = JutgeService.getAbstractProblemsSWR(problem_nms)
            swrProblems.onUpdate = () => this.refresh(examElement)

            const swrStatus = JutgeService.getAllStatusesSWR()
            swrStatus.onUpdate = () => this.refresh(examElement)

            if (swrProblems.data === undefined || swrStatus.data === undefined) {
                return []
            }

            const abstractProblems = swrProblems.data
            const allStatuses = swrStatus.data

            const items: CourseTreeElement[] = []
            for (const abstractProblem of abstractProblems) {
                const problemItem = this.abstractProblemToItem_(
                    abstractProblem,
                    allStatuses
                )
                problemItem.parent = examElement
                items.push(problemItem)
            }
            examElement.children = items
            return items
            //
        } catch (error) {
            _error(error)
            vscode.window.showErrorMessage("Failed ot get exam problems")
            return []
        }
    }

    private async getExam_(): Promise<CourseTreeElement[]> {
        try {
            const swrExam = JutgeService.getExamSWR()
            swrExam.onUpdate = () => this.refresh()

            const exam = swrExam.data
            if (!exam) {
                return []
            }
            return [this.makeTreeElement("exam", "exam", exam.title, IconStatus.NONE)]
        } catch (error) {
            _error(error)
            vscode.window.showErrorMessage("Failed ot get exam")
            return []
        }
    }

    private async getEnrolledCourseList_(): Promise<CourseTreeElement[]> {
        try {
            const swrCourse = JutgeService.getCoursesSWR()
            const courses = swrCourse.data || {}
            swrCourse.onUpdate = () => this.refresh() // all

            return Object.entries(courses).map(([key, { course_nm }]) =>
                this.makeTreeElement("course", key, course_nm, IconStatus.NONE)
            )
        } catch (error) {
            console.error(error)
            vscode.window.showErrorMessage("Failed to get enrolled courses")
            return []
        }
    }

    private async getListsFromCourseNm_(
        courseElem: CourseTreeElement
    ): Promise<CourseTreeElement[]> {
        try {
            const swrCourse = JutgeService.getCourseSWR(courseElem.key)
            swrCourse.onUpdate = () => this.refresh(courseElem)

            const course = swrCourse.data
            if (course === undefined) {
                return []
            }

            const lists = course.lists.map(({ list_nm, title }) => {
                let item = this.makeTreeElement(
                    "list",
                    list_nm,
                    title || list_nm,
                    IconStatus.NONE,
                    courseElem
                )
                item.parent = courseElem
                return item
            })
            courseElem.children = lists

            return lists
            //
        } catch (error) {
            console.error(error)
            vscode.window.showErrorMessage(
                `Failed to get lists from course: ${courseElem.key}`
            )
            return []
        }
    }

    private abstractProblemToItem_(
        abstractProblem: AbstractProblem,
        allStatuses: Record<string, AbstractStatus>
    ): CourseTreeElement {
        const nm = abstractProblem.problem_nm
        const langCode = ConfigService.getPreferredLangId()
        const preferredId = `${nm}_${langCode}`

        let problem: BriefProblem | undefined = undefined
        if (preferredId in abstractProblem.problems) {
            problem = abstractProblem.problems[preferredId]
        } else {
            problem = Object.values(abstractProblem.problems)[0]
        }

        // Get status for this problem
        const iconStatus = status2IconStatus[allStatuses[nm]?.status || ""]
        const problemItem = this.makeTreeElement("problem", nm, problem.title, iconStatus)

        problemItem.command = {
            command: "jutge-vscode.showProblem",
            title: "Open Problem",
            arguments: [nm],
        }

        return problemItem
    }

    private async getProblemsFromListNm_(
        listElem: CourseTreeElement
    ): Promise<CourseTreeElement[]> {
        try {
            console.debug(
                `[TreeViewProvider] Getting Problems for list '${listElem.key}'`
            )

            const swrProblems = JutgeService.getAbstractProblemsInListSWR(listElem.key)
            swrProblems.onUpdate = () => this.refresh(listElem)

            const swrStatus = JutgeService.getAllStatusesSWR()
            swrStatus.onUpdate = () => this.refresh(listElem)

            if (swrProblems.data === undefined || swrStatus.data === undefined) {
                return []
            }

            const problems = swrProblems.data
            const allStatuses = swrStatus.data

            const items: CourseTreeElement[] = []
            for (const abstractProblem of problems) {
                const item = this.abstractProblemToItem_(abstractProblem, allStatuses)
                item.parent = listElem
                items.push(item)
            }

            return items
            //
        } catch (error) {
            console.error("Error getting problems from list:", error)
            return []
        }
    }
}
