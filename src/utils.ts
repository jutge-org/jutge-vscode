import * as vscode from "vscode";
import { MyProblemsService } from "./client";

/**
 * A helper function which will get the webview URI of a given file or resource.
 *
 * @remarks This URI can be used within a webview's HTML as a link to the
 * given file/resource.
 *
 * @param webview A reference to the extension webview
 * @param extensionUri The URI of the directory containing the extension
 * @param pathList An array of strings representing the path to a file/resource
 * @returns A URI pointing to the file/resource
 */
export function getUri(webview: vscode.Webview, extensionUri: vscode.Uri, pathList: string[]) {
	return webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, ...pathList));
}

/**
 * A helper function that returns a unique alphanumeric identifier called a nonce.
 *
 * @remarks This function is primarily used to help enforce content security
 * policies for resources/scripts being executed in a webview context.
 *
 * @returns A nonce
 */
export function getNonce() {
	let text = "";
	const possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
	for (let i = 0; i < 32; i++) {
		text += possible.charAt(Math.floor(Math.random() * possible.length));
	}
	return text;
}

/**
 * A helper function that returns the compiler id for a given file extension.
 *
 * @remarks This function is used to determine the compiler id to be used when
 * submitting a file to Jutge.
 *
 * @param extension The file extension
 * @returns The compiler id
 */
export function getCompilerIdFromExtension(extension: string): string {
	// TODO: Dump from jutge api or set up as config
	switch (extension) {
		case "cc":
		case "cpp":
			return "GPP"; // TODO: Wrong
		case "py":
			return "Python3";
		default:
			return "";
	}
}

export function isProblemValidAndAccessible(problemNm: string, problemId: string) {
	try {
		const response = MyProblemsService.getProblem(problemNm, problemId);
		return response !== undefined;
	}
	catch (error) {
		// TODO: Filter errors.
		return false;
	}
}
