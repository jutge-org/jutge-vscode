import * as vscode from 'vscode';

import { MyProblemsService } from "./client/services/MyProblemsService"

import { getNonce, getUri, isProblemValidAndAccessible } from './utils';
import { generateTestcasePanels } from './webview/components/testcasePanel'
import { runSingleTestcase, runAllTestcases, submitProblemToJutge } from './problemRunner';
import { isUserAuthenticated } from './jutgeAuth';

import {
	Problem,
	Testcase,
	VSCodeToWebviewMessage,
	WebviewToVSCodeCommand,
	WebviewToVSCodeMessage,
} from './types'

/**
 * Registers commands to control the webview.
 *
 * @param context Provides access to utilities to manage the extension's lifecycle.
 */
export function registerWebviewCommands(context: vscode.ExtensionContext) {
	context.subscriptions.push(vscode.commands.registerCommand('jutge-vscode.showProblem', async (problemNm: string | undefined) => {
		if (!await isUserAuthenticated()) {
			vscode.window.showErrorMessage('You need to sign in to Jutge.org to use this feature.')
			return
		}

		// If the command is called from the command palette, ask for the problem number.
		if (!problemNm) {
			const inputProblemNm = await vscode.window.showInputBox({
				title: "Jutge Problem",
				placeHolder: "P12345",
				prompt: "Please write the problem number.",
				value: "",
			})
			if (!inputProblemNm) {
				return
			}
			problemNm = inputProblemNm
		}
		WebviewPanelHandler.createOrShow(context.extensionUri, problemNm);
	}));
}

/**
 * Get the webview options for the webview panel.
 *
 * @param extensionUri The uri of the extension.
 * @returns The webview options.
 */
export function getWebviewOptions(extensionUri: vscode.Uri): vscode.WebviewOptions {
	return {
		// Enable javascript in the webview
		enableScripts: true,

		// Restrict the webview to only loading content from the extension's `webview` directory.
		localResourceRoots: [vscode.Uri.joinPath(extensionUri, 'src', 'webview'), vscode.Uri.joinPath(extensionUri, 'out')],
	};
}

export class WebviewPanelHandler {
	private static createdPanels: Map<string, ProblemWebviewPanel> = new Map();

	/**
	 * Creates a new problem webview panel.
	 *
	 * @param extensionUri The uri of the extension.
	 * @param problemNm The problem number.
	 */
	public static createOrShow(extensionUri: vscode.Uri, problemNm: string) {
		// TODO: ProblemId needs to be set up in the config.
		if (!isProblemValidAndAccessible(problemNm, problemNm + '_ca')) {
			vscode.window.showErrorMessage("Problem not valid or accessible.");
			return;
		}

		// TODO: Use same column as existing panels if there are.
		const column = vscode.ViewColumn.Beside;

		// If we already have a panel, show it.
		if (this.createdPanels.has(problemNm)) {
			let panel = this.createdPanels.get(problemNm) as ProblemWebviewPanel;
			panel.panel.reveal(column, true);
			return this.createdPanels.get(problemNm);
		}

		const panel = vscode.window.createWebviewPanel(
			ProblemWebviewPanel.viewType,
			problemNm,
			{ viewColumn: column, preserveFocus: true },
			getWebviewOptions(extensionUri),
		);

		this.createdPanels.set(problemNm, new ProblemWebviewPanel(panel, extensionUri, problemNm));
		return this.createdPanels.get(problemNm);
	}

	public static getPanel(problemNm: string) {
		return this.createdPanels.get(problemNm);
	}

	public static removePanel(problemNm: string) {
		this.createdPanels.delete(problemNm);
	}

	public static sendMessageToPanel(problemNm: string, message: VSCodeToWebviewMessage) {
		const panel = this.createdPanels.get(problemNm);
		if (panel) {
			panel.panel.webview.postMessage(message);
		} else {
			console.error(`Panel ${problemNm} not found.`);
		}
	}
}

export class ProblemWebviewPanel {
	public static readonly viewType = 'problemWebview';
	public readonly panel: vscode.WebviewPanel;

	public problem: Problem;

	private readonly _extensionUri: vscode.Uri;
	private _disposables: vscode.Disposable[] = [];

	/**
	* Constructor for the problem webview panel.
	* Sets up the panel and its listeners.
	*
	* @param panel The webview panel.
	* @param extensionUri The uri of the extension.
	* @param problemNm The problem number.
	* @returns The problem webview panel.
	*/
	public constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri, problemNm: string) {
		this.panel = panel;
		this._extensionUri = extensionUri;
		this.problem = {
			problem_id: problemNm + '_ca',
			problem_nm: problemNm,
			title: "",
			language_id: null,
			statementHtml: null,
			testcases: null
		};

		// Get the problem info
		this._getProblemInfo();

		// Set the webview's initial html content
		this._update(problemNm);

		// Listen for when the panel is disposed
		// This happens when the user closes the panel or when the panel is closed programmatically
		this.panel.onDidDispose(() => this.dispose(), null, this._disposables);

		// Handle messages from the webview
		this.panel.webview.onDidReceiveMessage(
			message => {
				this._handleMessage(message);
			},
			null,
			this._disposables
		);
	}

	/**
	* Disposes of the problem webview panel.
	* This method is called when the panel is closed (either by the user or programmatically).
	*/
	public dispose() {
		WebviewPanelHandler.removePanel(this.problem.problem_nm);

		this.panel.dispose();

		while (this._disposables.length) {
			const x = this._disposables.pop();
			if (x) {
				x.dispose();
			}
		}
	}

	/**
	 * Gets the problem info.
	 */
	private _getProblemInfo() {
		MyProblemsService.getProblem(this.problem.problem_nm, this.problem.problem_id).then((problem) => {
			this.problem.title = problem.title;
			this.problem.language_id = problem.language_id;
		}).catch((error) => {
			console.error("Error getting problem info: ", error);
			vscode.window.showErrorMessage("Error getting problem info.");
		});
	}

	/**
	* Sets the content of the webview panel.
	* 
	* @param problemNm The problem number.
	*/
	private async _update(problemNm: string) {
		this.panel.title = problemNm;
		this.panel.webview.html = await this._getHtmlForWebview();
	}

	private async _getProblemStatement() {
		if (this.problem.statementHtml) {
			return this.problem.statementHtml;
		}
		try {
			const problemStatement = await MyProblemsService.getTextStatement(this.problem.problem_nm, this.problem.problem_id);
			this.problem.statementHtml = problemStatement;
			return problemStatement;
		} catch (error) {
			console.error("Error getting problem statement: ", error);
			return "<p>Error getting problem statement.</p>";
		}
	}

	private async _getProblemTestcases() {
		if (this.problem.testcases) {
			return this.problem.testcases;
		}
		try {
			const problemTestcases = await MyProblemsService.getSampleTestcases(this.problem.problem_nm, this.problem.problem_id) as Testcase[];
			this.problem.testcases = problemTestcases;
			return problemTestcases;
		} catch (error) {
			console.error("Error getting problem testcases: ", error);
			return [];
		}
	}

	/**
		* Gets the html content for the webview panel.
		*
		* @param problemText The problem text.
		* @returns The html content for the webview panel.
		*/
	private async _getHtmlForWebview(): Promise<string> {
		const webview = this.panel.webview;
		const scriptUri = getUri(webview, this._extensionUri, ['out', 'webview', 'main.js']);
		// TODO: Move them to the out folder (automatically, esbuild-copy-plugin)
		const styleUri = getUri(webview, this._extensionUri, ["src", "webview", "styles", "style.css"]);
		const codiconUri = getUri(webview, this._extensionUri, ["src", "webview", "styles", "codicon.css"]);
		const nonce = getNonce(); // Use a nonce to only allow specific scripts to be run

		const problemStatement = await this._getProblemStatement();
		const problemTestcases = await this._getProblemTestcases();

		const testcasePanels = generateTestcasePanels(problemTestcases);

		return `<!DOCTYPE html>
			<html lang="en">
			<head>
				<meta charset="UTF-8">

				<!--
					Use a content security policy to only allow loading images from https or from our extension directory,
					and only allow scripts that have a specific nonce.
				-->
				<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; img-src ${webview.cspSource} https:; script-src 'nonce-${nonce}'; font-src ${webview.cspSource};">

				<link rel="stylesheet" href="${styleUri}">
        <link rel="stylesheet" href="${codiconUri}">
	
				<meta name="viewport" content="width=device-width, initial-scale=1.0">
			</head>
			<body>	
				<h2 id="problem-nm">${this.problem.problem_nm + ' - ' + this.problem.title}</h2>

				<section id="statement" class="component-container">
					${problemStatement}
				</section>

				<vscode-divider></vscode-divider>

				<section id="testcases" class="component-container">
					<div class="testcase-header">
						<h2 class="flex-grow-1">Testcases</h2>
						<vscode-button id="run-all-testcases">
							Run All
							<span slot="start" class="codicon codicon-run-all"></span>
						</vscode-button>
						<vscode-button id="submit-to-jutge">
							Submit to Jutge
							<span slot="start" class="codicon codicon-cloud-upload"></span>
						</vscode-button>
					</div>
					${testcasePanels}
				</section>

				<script type="module" nonce="${nonce}" src="${scriptUri}"></script>
			</body>
			</html>`;
	}

	private async _handleMessage(message: WebviewToVSCodeMessage) {
		console.log("Received message from webview: ", message)

		// TODO: Handle multiple open text editors
		if (!vscode.window.visibleTextEditors) {
			vscode.window.showErrorMessage("No open text editor.");
			return;
		}
		const defaultEditor = vscode.window.visibleTextEditors[0];

		switch (message.command) {
			case WebviewToVSCodeCommand.RUN_ALL_TESTCASES:
				runAllTestcases(this.problem, defaultEditor.document.uri.fsPath);
				return;
			case WebviewToVSCodeCommand.SUBMIT_TO_JUTGE:
				submitProblemToJutge(this.problem, defaultEditor.document.uri.fsPath);
				return;
			case WebviewToVSCodeCommand.RUN_TESTCASE:
				runSingleTestcase(message.data.testcaseId, this.problem, defaultEditor.document.uri.fsPath);
				return;
		}
	}

}

