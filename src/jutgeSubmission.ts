import * as vscode from "vscode"
import * as fs from "fs"
import axios from "axios"
import FormData = require("form-data")

import { MySubmissionsService } from "./client"

import { WebviewPanelHandler } from "./webviewProvider"
import { getCompilerIdFromExtension } from "./utils"
import { runAllTestcases } from "./problemRunner"

import { Problem, SubmissionStatus, VSCodeToWebviewCommand } from "./types"

/**
 * Submits the currently open file to Jutge.
 * Before submitting, it runs all testcases to ensure correctness.
 *
 * @param problem The problem to which the file is being submitted.
 *
 * @returns The id of the submission if successful, undefined otherwise.
 */
export async function submitProblemToJutge(problem: Problem, filePath: string): Promise<void> {
    const fileExtension = filePath.split(".").pop() || ""
    const compilerId = getCompilerIdFromExtension(fileExtension)

    const allTestsPassed = await runAllTestcases(problem, filePath)
    if (allTestsPassed) {
        sendUpdateSubmissionStatus(problem.problem_nm, SubmissionStatus.PENDING)
        const request_body = new FormData()
        request_body.append("compiler_id", compilerId)
        request_body.append("annotation", "")
        request_body.append("file", fs.createReadStream(filePath))

        // HACK: The client does not autogenerate the correct headers for form-data.
        const response = await axios.post(
            `/my/submissions/${problem.problem_nm}/${problem.problem_id}/submit`,
            request_body
        )
        vscode.window.showInformationMessage("All testcases passed! Submitting to Jutge...")
        monitorSubmissionStatus(problem, response.data.submission_id)
    } else {
        vscode.window.showErrorMessage("Some testcases failed. Fix them before submitting to Jutge.")
    }
}

async function monitorSubmissionStatus(problem: Problem, submissionId: string): Promise<any> {
    try {
        const response = await MySubmissionsService.getSubmission({
            problemNm: problem.problem_nm,
            problemId: problem.problem_id,
            submissionId: submissionId,
        })

        if (response.veredict === SubmissionStatus.PENDING) {
            setTimeout(() => {
                monitorSubmissionStatus(problem, submissionId)
            }, 5000)
        } else {
            sendUpdateSubmissionStatus(problem.problem_nm, response.veredict as SubmissionStatus)
            showSubmissionNotification(problem, response)
        }
    } catch (error) {
        vscode.window.showErrorMessage("Error getting submission status: " + error)
        return
    }
}

function showSubmissionNotification(problem: Problem, response: any) {
    const detail = `
  Problem: ${problem.problem_nm}
  Veredict: ${response.veredict} 
  `
    vscode.window
        .showInformationMessage(
            sign(response.veredict!) + " " + response.veredict,
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

function sendUpdateSubmissionStatus(problemNm: string, status: SubmissionStatus) {
    const message = {
        command: VSCodeToWebviewCommand.UPDATE_SUBMISSION_STATUS,
        data: {
            status: status,
        },
    }
    WebviewPanelHandler.sendMessageToPanel(problemNm, message)
}

function sign(verdict: string): string {
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
