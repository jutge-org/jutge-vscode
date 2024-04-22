import * as vscode from 'vscode'
import axios from 'axios'

import { registerWebviewCommands } from './webviewProvider'
import { registerAuthCommands } from './jutgeAuth'


/**
 *	Wraps the extension context into an exported function.
 *	Allows access to the extension context from other modules.
 *
 *	@returns The extension context.
 */
let _context: vscode.ExtensionContext;
export function getExtensionContext(): vscode.ExtensionContext {
	return _context;
}

/**
 * Works as entrypoint when the extension is activated.
 * It is responsible for registering commands and other extension components.
 *
 * @param context Provides access to utilities to manage the extension's lifecycle.
 */
export async function activate(context: vscode.ExtensionContext) {
	_context = context; // Allows access to the extension context from other modules

	/* Axios setup */
	axios.defaults.baseURL = 'https://api.jutge.org';
	const token = await context.secrets.get('jutgeToken');
	if (token) {
		axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
	}

	/* Authentication */
	registerAuthCommands(context);

	/* WebView */
	registerWebviewCommands(context);

	console.log("jutge-vscode is now active");
}


