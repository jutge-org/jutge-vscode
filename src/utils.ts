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
      return "G++"; // TODO: Give more options
    case "py":
      return "Python3";
    default:
      return "";
  }
}

/**
 * A helper function that returns a boolean indicating whether a given problem name is valid and accessible.
 *
 */
export async function isProblemValidAndAccessible(problemNm: string): Promise<boolean> {
  try {
    const response = await MyProblemsService.getAbstractProblem(problemNm);
    return response !== undefined;
  } catch (error) {
    return false;
  }
}

export async function chooseFromEditorList(
  editors: readonly vscode.TextEditor[]
): Promise<vscode.TextEditor | undefined> {
  if (editors.length === 0) {
    return;
  }
  if (editors.length === 1) {
    return editors[0];
  } else {
    const selectedEditor = await vscode.window.showQuickPick(
      editors.map((editor) => ({
        label: editor.document.fileName,
        description: editor.document.languageId,
        editor,
      }))
    );
    return selectedEditor?.editor;
  }
}

export const preferredLangToLangId: { [key: string]: string } = {
  Català: "ca",
  Castellano: "es",
  English: "en",
};
export const fallbackLangOrder = ["ca", "es", "en", "fr"];

export function getDefaultProblemId(problemNm: string): string {
  const preferredLang = vscode.workspace
    .getConfiguration("jutge-vscode")
    .get("problem.preferredLang") as string;
  const preferredLangId = preferredLangToLangId[preferredLang];
  return problemNm + "_" + preferredLangId;
}
