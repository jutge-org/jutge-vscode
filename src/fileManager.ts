import * as vscode from "vscode";
import fs from "fs";

import { Language, Problem } from "./types";
import { getLangIdFromFilePath } from "./languageRunner";

export async function createNewFileForProblem(problem: Problem): Promise<vscode.Uri | undefined> {
  const defaultExtension = "cc"; // TODO: Get from config or suggest in a QuickPick
  const suggestedFileName = `${problem.problem_nm}_${problem.title.replace(/ /g, "_")}.${defaultExtension}`;
  const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
  if (!workspaceFolder) {
    vscode.window.showErrorMessage("No workspace folder open.");
    return;
  }

  const uri = await vscode.window.showSaveDialog({
    defaultUri: vscode.Uri.file(workspaceFolder + "/" + suggestedFileName),
    filters: {
      "All files": ["*"],
    },
    saveLabel: "Create",
    title: `Create new file for ${problem.title}`,
  });
  if (!uri) {
    return;
  }

  const langComment = {
    [Language.CPP]: "//",
    [Language.PYTHON]: "#",
  }[getLangIdFromFilePath(uri.fsPath)];

  const problemIdComment = `${langComment} @${problem.problem_id}`;
  const problemTitleComment = `${langComment} ${problem.title}`;
  const createdComment = `${langComment} Created: ${new Date().toLocaleString()} by ${process.env.USER}`;
  const fileHeader = [problemIdComment, problemTitleComment, createdComment]
    .join("\n")
    .concat("\n\n");

  try {
    fs.writeFileSync(uri.fsPath, fileHeader, { flag: "w" });
  } catch (error) {
    vscode.window.showErrorMessage(`Failed to create file in ${uri.fsPath} `);
    throw error;
  }
  return uri;
}

export async function showFileInColumn(
  uri: vscode.Uri,
  column: vscode.ViewColumn | undefined
): Promise<vscode.TextEditor | undefined> {
  const document = await vscode.workspace.openTextDocument(uri);
  return vscode.window.showTextDocument(document, column);
}
