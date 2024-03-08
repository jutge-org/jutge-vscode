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

	disposable = vscode.commands.registerCommand('jutge-vscode.information', async () => {
		const panel = vscode.window.createWebviewPanel(
			'jutgeStatistics',
			'Jutge.org - Statistics',
			vscode.ViewColumn.One,
			{} // Webview options.
		)
		panel.webview.html = await getInformationHtml()
	})

	context.subscriptions.push(disposable)

	async function getInformationHtml() {
		const response = await fetch('https://api.jutge.org/statistics/home')
		const stats = await response.json() as any

		return `
		<!DOCTYPE html>
		<html lang="en">
		<head>
			<meta charset="UTF-8">
			<meta name="viewport" content="width=device-width, initial-scale=1.0">
			<title>Jutge.org - Information</title>
		</head>
		<body>
			<h1>Jutge.org</h1>
			<p>The Virtual Learning Environment for Computer Programming</p>
			<img src="https://jutge.org/ico/welcome/jutge.png" width="200" />

			<h2>Statistics</h1>
			<table>
			<tr>
				<td>Users</td>
				<td>${stats.number_of_users}</td>
			</tr>
			<tr>
				<td>Problems</td>
				<td>${stats.number_of_problems}</td>
			</tr>
			<tr>
				<td>Submissions</td>
				<td>${stats.number_of_submissions}</td>
			</tr>
			</table>
		</body>
		</html>
		`
	}


	disposable = vscode.commands.registerCommand('jutge-vscode.login', async () => {

		const email = await vscode.window.showInputBox({
			placeHolder: "your email",
			prompt: "Jutge.org email",
			value: "",
		})
		if (!email) {
			return
		}

		const password = await vscode.window.showInputBox({
			placeHolder: "your password",
			prompt: "Jutge.org password",
			value: "",
			password: true,
		})
		if (!password) {
			return
		}

		let formData = new FormData()
		formData.append('username', email)
		formData.append('password', password)

		const response = await fetch('https://api.jutge.org/auth/login', {
			method: 'POST',
			body: formData,
		})

		if (response.status !== 200) {
			vscode.window.showErrorMessage('Jutge.org: Invalid credentials at sign in.')
			return
		}

		const data = await response.json() as { access_token: string, token_type: string }
		// vscode.window.showInformationMessage('token: ' + data.access_token)

		await context.secrets.store("access_token", data.access_token)

		vscode.window.showInformationMessage('Jutge.org: You have signed in.')

	})

	context.subscriptions.push(disposable)




	disposable = vscode.commands.registerCommand('jutge-vscode.logout', async () => {

		await context.secrets.store("access_token", "")

		vscode.window.showInformationMessage('Jutge.org: You have signed out.')

	})

	context.subscriptions.push(disposable)



	disposable = vscode.commands.registerCommand('jutge-vscode.showToken', async () => {

		const token = await context.secrets.get("access_token")

		if (token) {
			vscode.window.showInformationMessage(`Token: ${token}`)
		} else {
			vscode.window.showErrorMessage('No token')
		}

	})

	context.subscriptions.push(disposable)
}

// This method is called when your extension is deactivated
export function deactivate() { }
