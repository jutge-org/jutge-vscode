import * as vscode from "vscode"
import * as fs from "fs"

import { WebviewPanelHandler } from "@/providers/WebviewProvider"
import { getCompilerIdFromExtension } from "@/utils/helpers"
import { Problem, SubmissionStatus, VSCodeToWebviewCommand } from "@/utils/types"
import { runAllTestcases } from "@/runners/ProblemRunner"
import * as j from "@/jutgeClient"

export class SubmissionService {
    /**
     * Submits the currently open file to Jutge.
     * Before submitting, it runs all testcases to ensure correctness.
     *
     * @param problem The problem to which the file is being submitted.
     * @param filePath Path to the file being submitted
     */
    public static async submitProblem(problem: Problem, filePath: string): Promise<void> {
        const fileExtension = filePath.split(".").pop() || ""
        const compilerId = getCompilerIdFromExtension(fileExtension)

        const allTestsPassed = await runAllTestcases(problem, filePath)
        if (allTestsPassed) {
            SubmissionService.sendUpdateSubmissionStatus(problem.problem_nm, SubmissionStatus.PENDING)

            try {
                // Create a File object from the file stream
                const fileStream = fs.readFileSync(filePath)
                const file = new File([fileStream], filePath.split("/").pop() || "", {
                    type: "application/octet-stream",
                })

                const response = await j.student.submissions.submit(
                    {
                        problem_id: problem.problem_id,
                        compiler_id: compilerId,
                        annotation: "",
                    },
                    file
                )

                vscode.window.showInformationMessage("All testcases passed! Submitting to Jutge...")
                SubmissionService.monitorSubmissionStatus(problem, response.submission_id)
            } catch (error) {
                vscode.window.showErrorMessage("Error submitting to Jutge: " + error)
            }
        } else {
            vscode.window.showErrorMessage("Some testcases failed. Fix them before submitting to Jutge.")
        }
    }

    private static async monitorSubmissionStatus(problem: Problem, submissionId: string): Promise<void> {
        try {
            const response = await j.student.submissions.get({
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
                "View in jutge.org"
            )
            .then((selection) => {
                if (selection === "View in jutge.org") {
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
            data: {
                status: status,
            },
        }
        WebviewPanelHandler.sendMessageToPanel(problemNm, message)
    }

    private static getVerdict(verdict: string): string {
        switch (verdict) {
            case "AC":
                return "🟢"
            case "WA":
                return "🔴"
            case "EE":
                return "💣"
            case "CE":
                return "🛠"
            case "IE":
                return "🔥"
            case "Pending":
                return "⏳"
            default:
                return "🔴"
        }
    }
}
