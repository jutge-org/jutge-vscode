// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode'

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "jutge-vscode" is now active!')

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
	let disposable = vscode.commands.registerCommand('jutge-vscode.hello', () => {
		// The code you place here will be executed every time your command is executed
		// Display a message box to the user
		vscode.window.showInformationMessage('Hello from Jutge.org!')
	})

	context.subscriptions.push(disposable)

	disposable = vscode.commands.registerCommand('jutge-vscode.about', async () => {
		const header = "Visual Studio Code extension for Jutge.org"

		const detail = `
		Alex Serrano
		Pau Fernández
		Jordi Petit
		`

		vscode.window.showInformationMessage(header, { detail: detail, modal: true })
	})

	context.subscriptions.push(disposable)

	disposable = vscode.commands.registerCommand('jutge-vscode.statistics', async () => {
		const response = await fetch('https://api.jutge.org/statistics/home')
		const stats = await response.json() as any
		const text = `
		Users: ${stats.number_of_users}
		Problems: ${stats.number_of_problems}
		Submissions: ${stats.number_of_submissions}
		`
		vscode.window.showInformationMessage(text)
	})

	context.subscriptions.push(disposable)
}

// This method is called when your extension is deactivated
export function deactivate() { }
