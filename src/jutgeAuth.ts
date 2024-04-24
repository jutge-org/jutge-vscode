import * as vscode from 'vscode';
import axios from 'axios';

import { AuthenticationService } from './client/services/AuthenticationService';

import { getExtensionContext } from './extension';

export async function isUserAuthenticated(): Promise<boolean> {
	const context = getExtensionContext();
	const token = await context.secrets.get('jutgeToken');
	if (!token) {
		return false;
	}
	try {
		// If there is a token, check if it is valid.
		// No args because token is passed in headers.
		// FIXME: Returns 401 Unauthorized for expired tokens?
		const tokenCheck = await AuthenticationService.check();
		const isTokenValid = tokenCheck.success;
		return isTokenValid;
	}
	catch (error) {
		console.error('Error checking token:', error);
		return false;
	}
}

export async function signInToJutge() {
	const context = getExtensionContext();

	const default_email = await context.secrets.get("email") || ''
	const email = await vscode.window.showInputBox({
		title: "Jutge Sign-In",
		placeHolder: "your email",
		prompt: "Please write your email for Jutge.org.",
		value: default_email,
	})
	if (!email) {
		return
	}

	const password = await vscode.window.showInputBox({
		title: "Jutge Sign-In",
		placeHolder: "your password",
		prompt: "Please write your password for Jutge.org.",
		value: "",
		password: true,
	})
	if (!password) {
		return
	}

	let credentials;
	try {
		credentials = await AuthenticationService.login({ email, password })
	} catch (error) {
		vscode.window.showErrorMessage('Jutge.org: Invalid credentials to sign in.')
		return
	}

	await context.secrets.store("jutgeToken", credentials.token)
	await context.secrets.store("email", email)

	axios.defaults.headers.common['Authorization'] = 'Bearer ' + credentials.token

	vscode.commands.executeCommand('jutge-vscode.refreshTree')
	vscode.window.showInformationMessage('Jutge.org: You have signed in.')
}

export async function signOutFromJutge() {
	const context = getExtensionContext();
	await context.secrets.delete("jutgeToken")
	await context.secrets.delete("email")

	delete axios.defaults.headers.common['Authorization']

	vscode.window.showInformationMessage('Jutge.org: You have signed out.')
}

export function registerAuthCommands(context: vscode.ExtensionContext) {
	context.subscriptions.push(vscode.commands.registerCommand('jutge-vscode.signIn', signInToJutge));
	context.subscriptions.push(vscode.commands.registerCommand('jutge-vscode.signOut', signOutFromJutge));
}
