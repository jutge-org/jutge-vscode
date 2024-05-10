import * as assert from "assert";
import * as vscode from "vscode";
import fs from "fs";

/**
 * Setup (`beforeEach`) function for integration tests that need Cody configured and activated.
 */
export async function beforeIntegrationTest(): Promise<void> {
  // Wait for extension to become ready.
  const api = vscode.extensions.getExtension("jutge.jutge-vscode");
  assert.ok(api, "Extension not found");

  await api?.activate();

  // Wait for extension to become activated.
  await new Promise((resolve) => setTimeout(resolve, 200));
}

/**
 * Remove *.out files in the test_workspace folder
 */
export function cleanMockWorkspace() {
  const workspaceFolder = vscode.workspace.workspaceFolders![0];
  const files = fs.readdirSync(workspaceFolder.uri.fsPath);
  for (const file of files) {
    if (file.endsWith(".out")) {
      fs.unlinkSync(workspaceFolder.uri.fsPath + "/" + file);
    }
  }
}
