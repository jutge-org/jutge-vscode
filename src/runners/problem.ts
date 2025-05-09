import * as fs from "fs"
import * as vscode from "vscode"

import { getLangIdFromFilePath, getLangRunnerFromLangId } from "@/runners/language/languages"
import { Problem, TestcaseStatus, VSCodeToWebviewCommand } from "@/utils/types"
import { Testcase } from "@/jutge_api_client"
import { WebviewPanelRegistry } from "@/providers/problem/webview-panel-registry"
import { JutgeService } from "@/services/jutge"

/**
 * Sends a message to the webview to update the status of a testcase.
 *
 * @param problemNm The number of the problem.
 * @param testcaseId The id of the testcase with respect to the UI. 1-indexed.
 * @param status Testcase status.
 * @param output The output of the testcase run (if any).
 */
function sendUpdateTestcaseMessage(
    problemNm: string,
    testcaseId: number,
    status: TestcaseStatus,
    output: string | null
) {
    const message = {
        command: VSCodeToWebviewCommand.UPDATE_TESTCASE,
        data: { testcaseId, status, output },
    }
    WebviewPanelRegistry.sendMessage(problemNm, message)
}

/**
 * Runs a testcase on the currently open file.
 *
 * @param testcase_input The input of the testcase.
 * @param filePath The path of the file to run the testcase on.
 *
 * @returns The output of the testcase.
 *
 * @throws If the file has no extension.
 * @throws If the language is not supported.
 * @throws If the language runner fails.
 */
export function runTestcase(testcase_input: string, filePath: string): string | null {
    console.debug(`[ProblemRunner] Running testcase on file ${filePath}`)

    if (!fs.existsSync(filePath)) {
        console.error(`[ProblemRunner] File ${filePath} does not exist`)
        vscode.window.showErrorMessage("File does not exist.")
        return null
    }

    const languageRunner = getLangRunnerFromLangId(getLangIdFromFilePath(filePath))
    try {
        const document = vscode.workspace.textDocuments.find((doc) => doc.uri.fsPath === filePath)
        if (!document) {
            console.error(`[ProblemRunner] File ${filePath} not found in workspace documents`)
            vscode.window.showErrorMessage("File not found in the workspace.")
            return null
        }

        // Run the test - terminal will only show if there are errors
        console.debug(`[ProblemRunner] Executing code with ${languageRunner.constructor.name}`)
        const output = languageRunner.run(filePath, testcase_input, document)
        console.debug(`[ProblemRunner] Code execution completed`)
        return output
    } catch (err) {
        // Show error message in notification
        console.error(`[ProblemRunner] Error running testcase: ${err}`)
        vscode.window.showErrorMessage(`Error running testcase: ${err}`)
        console.error("Error running testcase: ", err)
        return null
    }
}

/**
 * Gets the testcases for a problem.
 * If the problem already has testcases, it returns them.
 * Otherwise, it fetches the testcases from Jutge.
 *
 * @param problem The problem for which to get the testcases.
 *
 * @returns The testcases for the problem.
 */
async function getProblemTestcases(problem: Problem): Promise<Testcase[] | null> {
    if (problem.testcases) {
        return problem.testcases
    }
    return new Promise((resolve, reject) => {
        try {
            const problemTestcasesRes = JutgeService.getSampleTestcasesSWR(problem.problem_id)
            if (problemTestcasesRes.data) {
                resolve(problemTestcasesRes.data)
            }
            problemTestcasesRes.onUpdate = (data) => resolve(data)
        } catch (error) {
            console.error("Error getting problem testcases: ", error)
            reject(error)
        }
    })
}

/**
 * Runs a single testcase on the currently open file.
 *
 * @param testcaseId The id of the testcase to run.
 * @param problem The problem to which the testcase belongs.
 *
 * @returns True if the testcase passed, false otherwise.
 */
export async function runSingleTestcase(testcaseId: number, problem: Problem, filePath: string): Promise<boolean> {
    const testcaseNm = testcaseId - 1 // Testcases are 1-indexed to be consistent with the UI.
    const testcases = await getProblemTestcases(problem)
    if (!testcases || testcases.length === 0) {
        vscode.window.showErrorMessage("No testcases found for this problem.")
        return false
    }

    sendUpdateTestcaseMessage(problem.problem_nm, testcaseId, TestcaseStatus.RUNNING, "")

    const input = Buffer.from(testcases[testcaseNm].input_b64, "base64").toString("utf-8")
    const expected = Buffer.from(testcases[testcaseNm].correct_b64, "base64").toString("utf-8")

    const output = runTestcase(input, filePath)

    const passed = output !== null && output === expected
    const status = passed ? TestcaseStatus.PASSED : TestcaseStatus.FAILED

    sendUpdateTestcaseMessage(problem.problem_nm, testcaseId, status, output)

    return passed
}

/**
 * Runs all testcases for a problem on the currently open file.
 *
 * @param problem The problem to which the testcases belong.
 * @param filePath Filepath of the file with the code
 *
 * @returns True if all testcases passed, false otherwise.
 */
export async function runAllTestcases(problem: Problem, filePath: string): Promise<boolean> {
    console.debug(`[ProblemRunner] Running all testcases for problem ${problem.problem_id}`)

    try {
        const testcases = await getProblemTestcases(problem)
        console.debug(`[ProblemRunner] Found ${testcases?.length} testcases for problem ${problem.problem_nm}`)
        if (!testcases || testcases.length === 0) {
            vscode.window.showErrorMessage("No testcases found for this problem.")
            console.error(`[ProblemRunner] No testcases found for problem ${problem.problem_nm}`)
            return false
        }

        let allCorrect = true

        for (let i = 0; i < testcases.length; i++) {
            console.debug(`[ProblemRunner] Running testcase ${i + 1}`)
            const result = await runSingleTestcase(i + 1, problem, filePath)
            if (!result) {
                allCorrect = false
            }
        }

        return allCorrect
    } catch (error) {
        console.error(`[ProblemRunner] Error running all testcases: ${error}`)
        vscode.window.showErrorMessage(`Error running all testcases: ${error}`)
        return false
    }
}
