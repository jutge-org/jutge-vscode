import * as vscode from 'vscode';
import * as fs from 'fs';
import FormData = require('form-data');

import { MyProblemsService } from './client/services/MyProblemsService';
import { MySubmissionsService } from './client';

import { WebviewPanelHandler } from './webviewProvider';
import { getLanguageRunnerFromExtension } from './languageRunner';
import { getCompilerIdFromExtension } from './utils';

import { Testcase, TestcaseStatus, VSCodeToWebviewCommand, Problem } from './types';

/**
	* Sends a message to the webview to update the status of a testcase.
	*
	* @param problemNm The number of the problem.
	* @param testcaseId The id of the testcase with respect to the UI. 1-indexed.
	* @param status Testcase status.
	* @param output The output of the testcase run (if any).
	*/
function sendUpdateTestcaseMessage(problemNm: string, testcaseId: number, status: TestcaseStatus, output: string | undefined) {
	const message = {
		command: VSCodeToWebviewCommand.UPDATE_TESTCASE,
		data: {
			testcaseId: testcaseId,
			status: status,
			output: output
		}
	};
	WebviewPanelHandler.sendMessageToPanel(problemNm, message);
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
export function runTestcase(testcase_input: string, filePath: string): string | undefined {
	if (!fs.existsSync(filePath)) {
		vscode.window.showErrorMessage("File does not exist.");
		return;
	}

	const fileExtension = filePath.split('.').pop();
	if (!fileExtension) {
		vscode.window.showErrorMessage("File has no extension.");
		return;
	}

	const languageRunner = getLanguageRunnerFromExtension(fileExtension);
	try {
		const output = languageRunner.run(filePath, testcase_input);
		return output;
	} catch (error) {
		console.error("Error running testcase: ", error);
		return;
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
async function getProblemTestcases(problem: Problem): Promise<Testcase[] | undefined> {
	if (problem.testcases) {
		return problem.testcases;
	}
	try {
		const problemTestcases = await MyProblemsService.getSampleTestcases(problem.problem_nm, problem.problem_id) as Testcase[];
		return problemTestcases;
	} catch (error) {
		console.error("Error getting problem testcases: ", error);
		return;
	}
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
	const testcaseNm = testcaseId - 1; // Testcases are 1-indexed to be consistent with the UI.
	const testcases = await getProblemTestcases(problem);
	if (!testcases || testcases.length === 0) {
		vscode.window.showErrorMessage("No testcases found for this problem.");
		return false;
	}
	const input = Buffer.from(testcases[testcaseNm].input_b64, 'base64').toString('utf-8');
	const expected = Buffer.from(testcases[testcaseNm].correct_b64, 'base64').toString('utf-8');

	sendUpdateTestcaseMessage(problem.problem_nm, testcaseId, TestcaseStatus.RUNNING, "");
	const output = runTestcase(input, filePath);
	if (output === expected) {
		sendUpdateTestcaseMessage(problem.problem_nm, testcaseId, TestcaseStatus.PASSED, output);
		return true;
	}
	else {
		sendUpdateTestcaseMessage(problem.problem_nm, testcaseId, TestcaseStatus.FAILED, output);
		return false;
	}
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
	let allPassed = true;

	const testcases = await getProblemTestcases(problem);
	if (!testcases || testcases.length === 0) {
		vscode.window.showErrorMessage("No testcases found for this problem.");
		return false;
	}

	for (let i = 0; i < testcases.length; i++) {
		const input = Buffer.from(testcases[i].input_b64, 'base64').toString('utf-8');
		const expected = Buffer.from(testcases[i].correct_b64, 'base64').toString('utf-8');

		sendUpdateTestcaseMessage(problem.problem_nm, i + 1, TestcaseStatus.RUNNING, "");
		const output = runTestcase(input, filePath);
		if (output === expected) {
			sendUpdateTestcaseMessage(problem.problem_nm, i + 1, TestcaseStatus.PASSED, output);
		} else {
			sendUpdateTestcaseMessage(problem.problem_nm, i + 1, TestcaseStatus.FAILED, output);
			allPassed = false;
		}
	}

	return allPassed;
}

/**
	* Submits the currently open file to Jutge. 
	* Before submitting, it runs all testcases to ensure correctness.
	*
	* @param problem The problem to which the file is being submitted.
	* 
	* @returns The id of the submission if successful, undefined otherwise.
	*/
export async function submitProblemToJutge(problem: Problem, filePath: string): Promise<string | undefined> {
	if (vscode.window.visibleTextEditors.length === 0) {
		vscode.window.showErrorMessage("No file is open to be submitted.");
		return;
	}

	const fileExtension = filePath.split('.').pop() || "";
	const compilerId = getCompilerIdFromExtension(fileExtension);

	const allTestsPassed = await runAllTestcases(problem, filePath);
	if (allTestsPassed) {
		const request_body = new FormData();
		request_body.append('compiler_id', compilerId);
		request_body.append('annotation', "")
		request_body.append('file', fs.createReadStream(filePath));

		vscode.window.showInformationMessage("All testcases passed! Submitting to Jutge...");
		const response = await MySubmissionsService.submit(problem.problem_nm, problem.problem_id, request_body);
		return response.submission_id;
	} else {
		vscode.window.showErrorMessage("Some testcases failed. Fix them before submitting to Jutge.");
	}
}

