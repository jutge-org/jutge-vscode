import * as vscode from "vscode"

import { jutgeClient } from "@/extension"
import { runAllTestcases } from "@/runners/problem"
import { getCompilerIdFromExtension } from "@/utils/helpers"
import { Problem, SubmissionStatus, VSCodeToWebviewCommand } from "@/utils/types"
import { readFile } from "fs/promises"
import { WebviewPanelRegistry } from "@/providers/problem/webview-panel-registry"

export class SubmissionService {
    /**
     * Submits the currently open file to Jutge.
     * Before submitting, it runs all testcases to ensure correctness.
     *
     * @param problem The problem to which the file is being submitted.
     * @param filePath Path to the file being submitted
     */
    public static async submitProblem(problem: Problem, filePath: string): Promise<void> {
        console.info(`[SubmissionService] Preparing to submit problem ${problem.problem_id} from file ${filePath}`)

        const fileExtension = filePath.split(".").pop() || ""
        const compilerId = getCompilerIdFromExtension(fileExtension)
        console.debug(`[SubmissionService] Using compiler ID: ${compilerId}`)

        console.info(`[SubmissionService] Running all testcases before submission`)
        const allTestsPassed = await runAllTestcases(problem, filePath)
        if (allTestsPassed) {
            console.info(`[SubmissionService] All testcases passed, proceeding with submission`)
            SubmissionService.sendUpdateSubmissionStatus(problem.problem_nm, SubmissionStatus.PENDING)

            try {
                console.debug(`[SubmissionService] Reading file content`)
                const code = await readFile(filePath)
                const file = new File([code], filePath.split("/").pop() || "", { type: "text/x-c" })
                const codeString = await file.text()
                const nowDate = new Date().toLocaleDateString()
                const nowTime = new Date().toLocaleTimeString()

                const submission = {
                    problem_id: problem.problem_id,
                    compiler_id: compilerId,
                    code: codeString,
                    annotation: `Sent through the API on ${nowDate} at ${nowTime}`,
                }

                console.info(`[SubmissionService] Submitting to Jutge.org`)
                const submission_id = await jutgeClient.student.submissions.submit(submission)
                console.info(`[SubmissionService] Submission successful, ID: ${submission_id}`)

                vscode.window.showInformationMessage("All testcases passed! Submitting to Jutge...")
                SubmissionService.monitorSubmissionStatus(problem, submission_id)
            } catch (err) {
                console.error(`[SubmissionService] Error submitting to Jutge: ${err}`)
                vscode.window.showErrorMessage("Error submitting to Jutge: " + err)
            }
        } else {
            console.warn(`[SubmissionService] Some testcases failed, submission aborted`)
            vscode.window.showErrorMessage("Some testcases failed. Fix them before submitting to Jutge.")
        }
    }

    private static async monitorSubmissionStatus(problem: Problem, submissionId: string): Promise<void> {
        try {
            const response = await jutgeClient.student.submissions.get({
                problem_id: problem.problem_id,
                submission_id: submissionId,
            })

            if (response.veredict === SubmissionStatus.PENDING) {
                setTimeout(() => {
                    SubmissionService.monitorSubmissionStatus(problem, submissionId)
                }, 5000)
            } else {
                SubmissionService.sendUpdateSubmissionStatus(problem.problem_nm, response.veredict as SubmissionStatus)
                SubmissionService.showSubmissionNotification(problem, response)
            }
        } catch (error) {
            vscode.window.showErrorMessage("Error getting submission status: " + error)
        }
    }

    private static showSubmissionNotification(problem: Problem, response: any) {
        const detail = `
Problem: ${problem.problem_nm}
Veredict: ${response.veredict} 
`
        vscode.window
            .showInformationMessage(
                SubmissionService.getVerdict(response.veredict!) + " " + response.veredict,
                { modal: true, detail },
                { title: "View in jutge.org" }
            )
            .then((selection) => {
                if (selection?.title === "View in jutge.org") {
                    vscode.env.openExternal(
                        vscode.Uri.parse(
                            `https://jutge.org/problems/${problem.problem_id}/submissions/${response.submission_id}`
                        )
                    )
                }
            })
    }

    private static sendUpdateSubmissionStatus(problemNm: string, status: SubmissionStatus) {
        const message = {
            command: VSCodeToWebviewCommand.UPDATE_SUBMISSION_STATUS,
            data: { status },
        }
        WebviewPanelRegistry.sendMessage(problemNm, message)
    }

    private static _verdictIcon: Map<string, string> = new Map([
        ["AC", "🟢"],
        ["WA", "🔴"],
        ["EE", "💣"],
        ["CE", "🛠"],
        ["IE", "🔥"],
        ["Pending", "⏳"],
    ])

    private static getVerdict(verdict: string): string {
        return SubmissionService._verdictIcon.get(verdict) || "❓"
    }
}
