import * as vscode from 'vscode'
import axios from 'axios'

import { AuthService, MyProblemsService, MyProfileService, ProfileOut, StatisticsService } from "./client"


// This method is called when extension is activated

export async function activate(context: vscode.ExtensionContext) {

	// Initialize axios defaults (used by the API client)
	{
		axios.defaults.baseURL = "https://api.jutge.org"
		const access_token = await context.secrets.get("access_token")
		if (access_token) {
			axios.defaults.headers.common['Authorization'] = 'Bearer ' + access_token
		}
	}


	// add a command
	function addCommand(name: string, fn: () => Promise<void>) {
		const cmd = vscode.commands.registerCommand(name, fn)
		context.subscriptions.push(cmd)
	}


	// run a command only if the user is authenticated
	function authenticated(fn: () => Promise<void>): (() => Promise<void>) {
		return async () => {
			if (!await isAuthenticated()) {
				vscode.window.showErrorMessage('No token')
				return
			}
			await fn()
		}
	}

	// tells if the user is authenticated
	async function isAuthenticated(): Promise<boolean> {
		const token = await context.secrets.get("access_token")
		return !!token
	}


	addCommand(
		'jutge-vscode.hello',

		async () => {
			vscode.window.showInformationMessage('Hello from Jutge.org!')
		}
	)


	addCommand(
		'jutge-vscode.about',

		async () => {
			const header = "Visual Studio Code extension for Jutge.org"

			const detail = `
				Alex Serrano
				Pau Fernández
				Jordi Petit

				©️ Universitat Politècnica de Catalunya, 2024
			`

			vscode.window.showInformationMessage(header, { detail: detail, modal: true })
		}
	)


	addCommand(
		'jutge-vscode.information',

		async () => {
			const stats = await StatisticsService.statisticsHomeViewStatisticsHomeGet()

			let profileHtml = ""
			if (await isAuthenticated()) {
				const profile = await MyProfileService.profileViewMyProfileGet()
				profileHtml = `
					<h2>Your Profile</h2>
					<table>
					<tr>
						<td>Name</td><td> ${profile.name}</td>
					</tr><tr>
						<td>Email</td><td> ${profile.email} </td>
					</tr><tr>
						<td>Username</td><td> ${profile.username} </td>
					</tr>
					</table>
				`
			}

			const html = `
				<p>
					<img src="https://jutge.org/ico/welcome/jutge.png" width="200" />
				</p>

				<h1>Jutge.org</h1>
				<p>The Virtual Learning Environment for Computer Programming</p>

				${profileHtml}

				<h2>Jutge.org's Statistics</h1>
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
			`

			const panel = vscode.window.createWebviewPanel(
				'jutgeWelcome',
				'Jutge.org',
				vscode.ViewColumn.One,
				{} // Webview options.
			)
			panel.webview.html = html
		}
	)


	addCommand(
		'jutge-vscode.login',

		async () => {
			const default_email = await context.secrets.get("email") || ''
			const email = await vscode.window.showInputBox({
				placeHolder: "your email",
				prompt: "Please write your email for Jutge.org.",
				value: default_email,
			})
			if (!email) {
				return
			}

			const password = await vscode.window.showInputBox({
				placeHolder: "your password",
				prompt: "Please write your password for Jutge.org. It will be used once and will not be stored.",
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
				vscode.window.showErrorMessage('Jutge.org: Invalid credentials to sign in.')
				return
			}

			const data = await response.json() as { access_token: string, token_type: string }

			await context.secrets.store("access_token", data.access_token)
			await context.secrets.store("email", email)

			axios.defaults.headers.common['Authorization'] = 'Bearer ' + data.access_token

			vscode.window.showInformationMessage('Jutge.org: You have signed in.')
		}
	)


	addCommand(
		'jutge-vscode.logout',

		authenticated(
			async () => {
				await AuthService.discardAuthenticationTokenAuthLogoutPost()
				await context.secrets.store("access_token", "")
				delete axios.defaults.headers.common['Authorization']
				vscode.window.showInformationMessage('Jutge.org: You have signed out.')
			}
		)
	)


	addCommand(
		'jutge-vscode.showToken',

		authenticated(
			async () => {
				const token = await context.secrets.get("access_token")
				vscode.window.showInformationMessage(`Token: ${token}`)
			}
		)
	)


	addCommand('jutge-vscode.profile',
		authenticated(
			async () => {
				const profile = await MyProfileService.profileViewMyProfileGet()
				vscode.window.showInformationMessage(`Name: ${profile.name} Email: ${profile.email} Username: ${profile.username} `)
			}
		)
	)


	addCommand(
		'jutge-vscode.problems',

		authenticated(
			async () => {
				const problems = await MyProblemsService.absproblemsIndexViewMyProblemsGet()

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
			}
		)
	)


	console.log('Jutge.org extension is active!')
	vscode.commands.executeCommand('jutge-vscode.information')
}



// This method is called when extension is deactivated

export function deactivate() { }
