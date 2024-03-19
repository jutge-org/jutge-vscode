import * as vscode from 'vscode'
import axios from 'axios'

import { AuthService, MyProblemsService, MyProfileService, MiscService} from "./client"
import { MiscService } from './client/services/MiscService'


// This method is called when extension is activated

export async function activate(context: vscode.ExtensionContext) {

	// Initialize axios defaults (used by the API client)
	{
		axios.defaults.baseURL = "https://api.jutge.org"
		const token = await context.secrets.get("token")
		if (token) {
			axios.defaults.headers.common['Authorization'] = 'Bearer ' + token
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
		const token = await context.secrets.get("token")
		return !!token
	}


	addCommand(
		'jutge-vscode.hello',

		async () => {
			const pong = await MiscService.getMiscPing(	)
			vscode.window.showInformationMessage(`Hello from Jutge.org! ping:${pong.message}`)
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
			const stats = await MiscService.getMiscHomepageStats()

			let profileHtml = ""
			if (await isAuthenticated()) {
				const profile = await MyProfileService.getMyProfile()
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
					<td>${stats.users}</td>
				</tr>
				<tr>
					<td>Problems</td>
					<td>${stats.problems}</td>
				</tr>
				<tr>
					<td>Submissions</td>
					<td>${stats.submissions}</td>
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
		'jutge-vscode.statement',

		async () => {
			const statement = (await MyProblemsService.getMyProblemsByProblemNmByProblemIdHtml('P17681', 'P17681_en')) as unknown as string

			console.log(statement)

			const panel = vscode.window.createWebviewPanel(
				'jutgeStament',
				'P17681_en',
				vscode.ViewColumn.One,
				{
					enableScripts: true,
				}
			)
			panel.webview.html = statement
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
				prompt: "Please write your password for Jutge.org.",
				value: "",
				password: true,
			})
			if (!password) {
				return
			}

			let credentials
			try {
				credentials = await AuthService.postAuthLogin({ email, password })
			} catch (error) {
				vscode.window.showErrorMessage('Jutge.org: Invalid credentials to sign in.')
				return
			}

			await context.secrets.store("token", credentials.token)
			await context.secrets.store("email", email)
			await context.secrets.store("password", password)

			axios.defaults.headers.common['Authorization'] = 'Bearer ' + credentials.token

			vscode.window.showInformationMessage('Jutge.org: You have signed in.')
		}
	)


	addCommand(
		'jutge-vscode.logout',

		authenticated(
			async () => {
				await AuthService.postAuthLogout()
				await context.secrets.store("token", "")
				delete axios.defaults.headers.common['Authorization']
				vscode.window.showInformationMessage('Jutge.org: You have signed out.')
			}
		)
	)


	addCommand(
		'jutge-vscode.showToken',

		authenticated(
			async () => {
				const token = await context.secrets.get("token")
				vscode.window.showInformationMessage(`Token: ${token}`)
			}
		)
	)


	addCommand('jutge-vscode.profile',
		authenticated(
			async () => {
				const profile = await MyProfileService.getMyProfile()
				vscode.window.showInformationMessage(`Name: ${profile.name} Email: ${profile.email} Username: ${profile.username} `)
			}
		)
	)


	addCommand(
		'jutge-vscode.problems',

		authenticated(
			async () => {
				const problems = await MyProblemsService.absproblemsIndexView()

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
//	vscode.commands.executeCommand('jutge-vscode.information')
}



// This method is called when extension is deactivated

export function deactivate() { }
