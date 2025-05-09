import * as vscode from "vscode"

import { WebviewPanelRegistry } from "@/providers/problem/webview-panel-registry"
import { runAllTestcases } from "@/runners/problem"
import { getLangInfoFromExtension } from "@/utils/helpers"
import { Problem, SubmissionStatus, VSCodeToWebviewCommand } from "@/utils/types"
import { waitMilliseconds } from "@/webview/utils"
import { readFile } from "fs/promises"
import { basename, extname } from "path"
import { JutgeService } from "./jutge"

export class SubmissionService {
    private static MONITOR_INTERVAL_MS = 5000

    private static _info(msg: string) {
        console.info(`[${this.name}]: ${msg}`)
    }
    private static _debug(msg: string) {
        console.debug(`[${this.name}]: ${msg}`)
    }

    /**
     * Submits the currently open file to Jutge.
     * Before submitting, it runs all testcases to ensure correctness.
     *
     * @param problem The problem to which the file is being submitted.
     * @param filePath Path to the file being submitted
     */
    public static async submitProblem(problem: Problem, filePath: string): Promise<void> {
        vscode.window.withProgress(
            {
                location: vscode.ProgressLocation.Notification,
                title: `Submitting ${problem.problem_nm}`,
                cancellable: false,
            },
            async (progress) => {
                const { problem_nm, problem_id } = problem

                this._info(`Preparing to submit problem ${problem_id} from file ${filePath}`)

                const { compiler_id, mimeType } = getLangInfoFromExtension(extname(filePath))
                this._debug(`Using compiler ID: ${compiler_id}`)

                this._info(`Running all testcases before submission`)
                progress.report({ message: "Running all testcases before submission" })

                const allTestsPassed = await runAllTestcases(problem, filePath)
                if (!allTestsPassed) {
                    console.warn(`Some testcases failed, submission aborted`)
                    vscode.window.showErrorMessage("Some testcases failed. Fix them before submitting to Jutge.")
                    return
                }

                this._info(`All testcases passed, proceeding with submission`)
                progress.report({ message: "Submitting..." })
                this._sendStatusUpdate(problem_nm, SubmissionStatus.PENDING)

                const nowDate = new Date().toLocaleDateString()
                const nowTime = new Date().toLocaleTimeString()

                try {
                    this._debug(`Reading file content`)
                    const code = await readFile(filePath)
                    const file = new File([code], basename(filePath), { type: mimeType })

                    this._info(`Submitting to Jutge.org`)
                    const { submission_id } = await JutgeService.submit(file, {
                        problem_id,
                        compiler_id,
                        annotation: `Sent through VSCode on ${nowDate} at ${nowTime}`,
                    })

                    this._info(`Submission successful (${submission_id})`)
                    progress.report({ message: `Submission successful (${submission_id})` })

                    const verdict = await this._waitForVerdictLoop(problem, submission_id, progress)

                    this._showNotification(problem, submission_id, verdict)

                    //
                } catch (err) {
                    console.error(`Error submitting to Jutge: ${err}`)
                    vscode.window.showErrorMessage("Error submitting to Jutge: " + err)
                }
            }
        )
    }

    private static async _waitForVerdictLoop(
        problem: Problem,
        submission_id: string,
        progress: vscode.Progress<{
            message?: string
            increment?: number
        }>
    ) {
        const { problem_nm, problem_id } = problem
        let times = 1

        let verdict: SubmissionStatus = SubmissionStatus.PENDING

        while (verdict === SubmissionStatus.PENDING) {
            try {
                const response = await JutgeService.getSubmission({ problem_id, submission_id })
                verdict = response.veredict as SubmissionStatus
            } catch (error) {
                vscode.window.showErrorMessage("Error getting submission status: " + error)
            }
            progress.report({ message: `Waiting (${times}) ...` })
            times++
            await waitMilliseconds(this.MONITOR_INTERVAL_MS)
        }

        this._sendStatusUpdate(problem_nm, verdict)
        return verdict
    }

    private static async _showNotification(problem: Problem, submission_id: string, verdict: string) {
        const icon = verdict ? this._verdictIcon.get(verdict) : "❓"

        const selection = await vscode.window.showInformationMessage(
            `${icon} ${verdict}`,
            {
                modal: true,
                detail: `Problem: ${problem.problem_nm}\nVerdict: ${verdict}\n`,
            },
            { title: "View in jutge.org" },
            { title: "Ok", isCloseAffordance: true }
        )

        if (selection && selection.title == "View in jutge.org") {
            const path = `/${problem.problem_id}/submissions/${submission_id}`
            vscode.env.openExternal(vscode.Uri.parse(`https://jutge.org/problems${path}`))
        }
    }

    private static _sendStatusUpdate(problemNm: string, status: SubmissionStatus) {
        WebviewPanelRegistry.sendMessage(problemNm, {
            command: VSCodeToWebviewCommand.UPDATE_SUBMISSION_STATUS,
            data: { status },
        })
    }

    private static _verdictIcon: Map<string, string> = new Map([
        ["AC", "🟢"],
        ["WA", "🔴"],
        ["EE", "💣"],
        ["CE", "🛠"],
        ["IE", "🔥"],
        ["Pending", "⏳"],
    ])
}
