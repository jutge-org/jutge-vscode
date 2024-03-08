import * as vscode from 'vscode'

import { SidebarProvider } from "./SidebarProvider"


// This method is called when extension is activated

export function activate(context: vscode.ExtensionContext) {

	console.log('Congratulations, your extension "jutge-vscode" is now active!')

	const helloCmd = vscode.commands.registerCommand('jutge-vscode.hello',
		() => {
			vscode.window.showInformationMessage('Hello from Jutge.org!')
		}
	)

	context.subscriptions.push(helloCmd)

	const aboutCmd = vscode.commands.registerCommand('jutge-vscode.about',
		async () => {
			const header = "Visual Studio Code extension for Jutge.org"

			const detail = `
		Alex Serrano
		Pau Fernández
		Jordi Petit
		`

			vscode.window.showInformationMessage(header, { detail: detail, modal: true })
		})

	context.subscriptions.push(aboutCmd)

	const informationCmd = vscode.commands.registerCommand('jutge-vscode.information',
		async () => {

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

			const panel = vscode.window.createWebviewPanel(
				'jutgeStatistics',
				'Jutge.org - Statistics',
				vscode.ViewColumn.One,
				{} // Webview options.
			)
			panel.webview.html = await getInformationHtml()
		})

	context.subscriptions.push(informationCmd)


	const loginCmd = vscode.commands.registerCommand('jutge-vscode.login',
		async () => {

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

	context.subscriptions.push(loginCmd)




	const logoutCmd = vscode.commands.registerCommand('jutge-vscode.logout',
		async () => {

			const token = await context.secrets.get("access_token")

			if (!token) {
				vscode.window.showErrorMessage('No token')
				return
			}

			await fetch('https://api.jutge.org/auth/login', {
				method: 'POST',
				headers: new Headers({
					'Authorization': `bearer ${token}`,
				}),
			})
			await context.secrets.store("access_token", "")

			vscode.window.showInformationMessage('Jutge.org: You have signed out.')

		})

	context.subscriptions.push(logoutCmd)



	const showTokenCmd = vscode.commands.registerCommand('jutge-vscode.showToken',
		async () => {

			const token = await context.secrets.get("access_token")

			if (!token) {
				vscode.window.showErrorMessage('No token')
				return
			}
			vscode.window.showInformationMessage(`Token: ${token}`)
		})

	context.subscriptions.push(showTokenCmd)

	const profileCmd = vscode.commands.registerCommand('jutge-vscode.profile',
		async () => {

			const token = await context.secrets.get("access_token")

			if (!token) {
				vscode.window.showErrorMessage('No token')
				return
			}

			const response = await fetch('https://api.jutge.org/my/profile', { headers: new Headers({ 'Authorization': `bearer ${token}`, }), })
			const profile = await response.json() as any

			vscode.window.showInformationMessage(`Name: ${profile.name} Email: ${profile.email} Username: ${profile.username} `)
		})

	context.subscriptions.push(showTokenCmd)



	const problemsCmd = vscode.commands.registerCommand('jutge-vscode.problems',
		async () => {

			const token = await context.secrets.get("access_token")
			if (!token) {
				vscode.window.showErrorMessage('No token')
			}
			const response = await fetch('https://api.jutge.org/my/problems', { headers: new Headers({ 'Authorization': `bearer ${token}`, }), })
			const problems = await response.json() as any
			console.log(problems)

			let html = "<table>"
			for (const [problem_nm, problem] of Object.entries(problems)) {
				for (const [problem_id, abstract_problem] of Object.entries(problem.problems)) {
					html += `
						<tr>
						<td>${problem_nm}</td>
						<td>${problem_id}</td>
						<td>${abstract_problem.title}</td>
					</tr>`
				}
			}
			const panel = vscode.window.createWebviewPanel(
				'jutgeProblems',
				'Jutge.org - Problems',
				vscode.ViewColumn.One,
				{} // Webview options.
			)
			panel.webview.html = html
		})

	context.subscriptions.push(problemsCmd)





	const sidebarProvider = new SidebarProvider(context.extensionUri)

	context.subscriptions.push(
		vscode.window.registerWebviewViewProvider("sidebar", sidebarProvider)
	)
}



// This method is called when extension is deactivated

export function deactivate() { }
