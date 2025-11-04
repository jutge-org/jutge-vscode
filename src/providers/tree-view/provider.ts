import * as vscode from "vscode"

import { AbstractProblem, AbstractStatus, BriefProblem } from "@/jutge_api_client"
import { ConfigService } from "@/services/config"
import { JutgeService } from "@/services/jutge"
import { IconStatus, status2IconStatus } from "@/types"
import { CourseItemType, CourseTreeElement } from "./element"
import { CourseTreeItem } from "./item"
import { Veredict } from "@/services/submission"
import { Logger } from "@/loggers"

export class JutgeCourseTreeProvider
    extends Logger
    implements vscode.TreeDataProvider<CourseTreeElement>
{
    private emitter_: vscode.EventEmitter<CourseTreeElement | undefined | null | void> =
        new vscode.EventEmitter<CourseTreeElement | undefined | null | void>()

    // This member is for VSCode, so that we can signal changes in the tree
    readonly onDidChangeTreeData: vscode.Event<CourseTreeElement | undefined | null | void> =
        this.emitter_.event

    // FIXME: Is there any better way to do this? I'm storing all references to
    // problemNms because I want to know the correspondence from problemNms to items... :\
    private problemName2TreeItem: Map<string, CourseTreeItem> = new Map()

    getTreeItem(element: CourseTreeElement): CourseTreeItem {
        const item = new CourseTreeItem(element)
        if (item.element.type === "problem") {
            item.command = {
                command: "jutge-vscode.showProblem",
                title: "Open Problem",
                arguments: [item.element.key, item.element.order],
            }
        }
        this.problemName2TreeItem.set(element.key, item) // keep the item in a map, by problemNm (itemKey)
        return item
    }

    getParent(element: CourseTreeElement): vscode.ProviderResult<CourseTreeElement> {
        return element.parent
    }

    async getChildren(parent?: CourseTreeElement): Promise<CourseTreeElement[]> {
        if (!(await JutgeService.isUserAuthenticated())) {
            return []
        } else if (!parent) {
            return JutgeService.isExamMode() ? this.getExam_() : this.getEnrolledCourseList_()
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
        order?: number,
        parent?: CourseTreeElement
    ) {
        const newElem = new CourseTreeElement(type, key, label, iconStatus)
        if (parent) {
            if (order === undefined || order === -1) {
                throw new Error(`Order is wrong! (order = ${order})`)
            }
            newElem.order = order
            newElem.parent = parent
        }
        return newElem
    }

    public refreshProblem({ problem_nm, status }: Veredict) {
        this.log.info(`Refresh Problem ${problem_nm}`)
        const item = this.problemName2TreeItem.get(problem_nm)
        if (!item) {
            console.error(`Received 'refresh' call for unknown problem '${problem_nm}'`)
        } else {
            this.log.info(`Status ${item.element.iconStatus} -> ${status}`)
            item.element.updateIconStatus(status)
            this.refresh_(item.element)
        }
    }

    public refresh_(element?: CourseTreeElement): void {
        this.emitter_.fire(element)
    }

    get refresh() {
        return this.refresh_.bind(this)
    }

    private async getExamProblems_(
        examElement: CourseTreeElement
    ): Promise<CourseTreeElement[]> {
        try {
            const swrExam = JutgeService.getExamSWR()
            swrExam.onUpdate = () => this.refresh_(examElement)

            const exam = swrExam.data
            if (!exam) {
                return []
            }

            const problem_nms = exam.problems.map((p) => p.problem_nm)

            const swrProblems = JutgeService.getAbstractProblemsSWR(problem_nms)
            swrProblems.onUpdate = () => this.refresh_(examElement)

            const swrStatus = JutgeService.getAllStatusesSWR()
            swrStatus.onUpdate = () => this.refresh_(examElement)

            if (swrProblems.data === undefined || swrStatus.data === undefined) {
                return []
            }

            const abstractProblems = swrProblems.data
            const allStatuses = swrStatus.data

            const items: CourseTreeElement[] = []
            let order: number = 1
            for (const abstractProblem of abstractProblems) {
                const problemItem = this.abstractProblemToElement_(abstractProblem, allStatuses)
                problemItem.parent = examElement
                problemItem.order = order
                order++
                items.push(problemItem)
            }
            examElement.children = items
            return items
            //
        } catch (error) {
            this.log.error(error)
            vscode.window.showErrorMessage("Failed to get exam problems")
            return []
        }
    }

    private async getExam_(): Promise<CourseTreeElement[]> {
        try {
            const swrExam = JutgeService.getExamSWR()
            swrExam.onUpdate = () => this.refresh_()

            const exam = swrExam.data
            if (!exam) {
                return []
            }
            return [this.makeTreeElement("exam", "exam", exam.title, IconStatus.NONE)]
        } catch (error) {
            this.log.error(error)
            vscode.window.showErrorMessage("Failed to get exam")
            return []
        }
    }

    private async getEnrolledCourseList_(): Promise<CourseTreeElement[]> {
        try {
            const swrCourse = JutgeService.getCoursesSWR()
            const courses = swrCourse.data || {}
            swrCourse.onUpdate = () => this.refresh_() // all

            return Object.entries(courses).map(([key, { title, course_nm }]) =>
                this.makeTreeElement("course", key, title || course_nm, IconStatus.NONE)
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
            swrCourse.onUpdate = () => this.refresh_(courseElem)

            const course = swrCourse.data
            if (course === undefined) {
                return []
            }

            const lists = course.lists.map(({ list_nm, title }, index) => {
                let item = this.makeTreeElement(
                    "list",
                    list_nm,
                    title || list_nm,
                    IconStatus.NONE,
                    index + 1,
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
            vscode.window.showErrorMessage(`Failed to get lists from course: ${courseElem.key}`)
            return []
        }
    }

    private separatorToElement_(key: string, description: string): CourseTreeElement {
        return this.makeTreeElement("separator", key, description, IconStatus.NONE)
    }

    private abstractProblemToElement_(
        abstractProblem: AbstractProblem,
        allStatuses: Record<string, AbstractStatus>
    ): CourseTreeElement {
        const { problem_nm, problems } = abstractProblem
        const langCode = ConfigService.getPreferredLangId()
        const preferredId = `${problem_nm}_${langCode}`

        let problem: BriefProblem | undefined = undefined
        if (preferredId in problems) {
            problem = problems[preferredId]
        } else {
            problem = Object.values(problems)[0]
        }

        // Get status for this problem
        const iconStatus = (allStatuses[problem_nm]?.status || "none") as IconStatus
        const element = this.makeTreeElement("problem", problem_nm, problem.title, iconStatus)

        return element
    }

    private async getProblemsFromListNm_(
        listElem: CourseTreeElement
    ): Promise<CourseTreeElement[]> {
        try {
            console.debug(`[TreeViewProvider] Getting Problems for list '${listElem.key}'`)

            const swrProblems = JutgeService.getAbstractProblemsInListSWR(listElem.key)
            swrProblems.onUpdate = () => this.refresh_(listElem)

            const swrStatus = JutgeService.getAllStatusesSWR()
            swrStatus.onUpdate = () => this.refresh_(listElem)

            if (swrProblems.data === undefined || swrStatus.data === undefined) {
                return []
            }

            const problems = swrProblems.data
            const allStatuses = swrStatus.data

            let sepIndex = 1
            let order = 1
            const items: CourseTreeElement[] = []
            for (const problemOrSeparator of problems) {
                let item: CourseTreeElement
                if (typeof problemOrSeparator === "string") {
                    const separator = problemOrSeparator
                    item = this.separatorToElement_(
                        `${listElem.key}:separator${sepIndex}`,
                        separator
                    )
                    sepIndex++
                } else {
                    const problem_nm = problemOrSeparator
                    item = this.abstractProblemToElement_(problem_nm, allStatuses)
                    item.order = order
                    order++
                }
                item.parent = listElem
                items.push(item)
            }
            listElem.children = items

            return items
            //
        } catch (error) {
            console.error("Error getting problems from list:", error)
            return []
        }
    }
}
