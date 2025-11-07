import * as vscode from "vscode"

import { AbstractProblem, AbstractStatus, BriefProblem } from "@/jutge_api_client"
import { Logger } from "@/loggers"
import { ConfigService } from "@/services/config"
import { JutgeService } from "@/services/jutge"
import { Veredict } from "@/services/submission"
import { IconStatus } from "@/types"
import { ExamTreeElement } from "./element"
import { CourseTreeItem } from "./item"

export class JutgeExamsTreeProvider
    extends Logger
    implements vscode.TreeDataProvider<ExamTreeElement>
{
    private emitter_: vscode.EventEmitter<ExamTreeElement | undefined | null | void> =
        new vscode.EventEmitter<ExamTreeElement | undefined | null | void>()

    // This member is for VSCode, so that we can signal changes in the tree
    readonly onDidChangeTreeData: vscode.Event<ExamTreeElement | undefined | null | void> =
        this.emitter_.event

    // FIXME: Is there any better way to do this? I'm storing all references to
    // problemNms because I want to know the correspondence from problemNms to items... :\
    private problemName2TreeItem: Map<string, CourseTreeItem> = new Map()

    getTreeItem(element: ExamTreeElement): CourseTreeItem {
        const item = new CourseTreeItem(element)
        item.command = {
            command: "jutge-vscode.showProblem",
            title: "Open Problem",
            arguments: [item.element.key, item.element.order],
        }
        this.problemName2TreeItem.set(element.key, item) // keep the item in a map, by problemNm (itemKey)
        return item
    }

    getParent(element: ExamTreeElement): vscode.ProviderResult<ExamTreeElement> {
        return null
    }

    async getChildren(parent?: ExamTreeElement): Promise<ExamTreeElement[]> {
        if (!JutgeService.isSignedInExam()) {
            return []
        }
        return this.getExamProblems_()
    }

    private makeTreeElement(
        key: string,
        label: string,
        iconStatus: IconStatus,
        options?: {
            order?: number
            description?: string
        }
    ) {
        const newElem = new ExamTreeElement(key, label, iconStatus, options?.description)
        newElem.order = options?.order || -1
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

    public refresh_(element?: ExamTreeElement): void {
        this.emitter_.fire(element)
    }

    get refresh() {
        return this.refresh_.bind(this)
    }

    private async getExamProblems_(): Promise<ExamTreeElement[]> {
        try {
            const swrExam = JutgeService.getExamSWR()
            swrExam.onUpdate = () => this.refresh_()

            const exam = swrExam.data
            if (!exam) {
                return []
            }

            const problem_nms = exam.problems.map((p) => p.problem_nm)

            const swrProblems = JutgeService.getAbstractProblemsSWR(problem_nms)
            swrProblems.onUpdate = () => this.refresh_()

            const swrStatus = JutgeService.getAllStatusesSWR()
            swrStatus.onUpdate = () => this.refresh_()

            if (swrProblems.data === undefined || swrStatus.data === undefined) {
                return []
            }

            const abstractProblems = swrProblems.data
            const allStatuses = swrStatus.data

            const elems: ExamTreeElement[] = []
            let order: number = 1
            for (const abstractProblem of abstractProblems) {
                const problemElem = this.abstractProblemToElement_(abstractProblem, allStatuses)
                problemElem.order = order

                // Add caption and points to each problem, taken from the exam data
                const examProblem = exam.problems[order - 1]
                const caption = examProblem?.caption || ""
                const weight = examProblem?.weight || 1.0
                problemElem.label = `${caption}:\t${problemElem.label}`
                problemElem.description = `${weight} points`

                order++
                elems.push(problemElem)
            }
            return elems
            //
        } catch (error) {
            this.log.error(error)
            vscode.window.showErrorMessage("Failed to get exam problems")
            return []
        }
    }

    private abstractProblemToElement_(
        abstractProblem: AbstractProblem,
        allStatuses: Record<string, AbstractStatus>
    ): ExamTreeElement {
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
        return this.makeTreeElement(problem_nm, problem.title, iconStatus)
    }
}
