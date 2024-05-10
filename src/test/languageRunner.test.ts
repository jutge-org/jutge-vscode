import * as assert from "assert";

import * as vscode from "vscode";
import { beforeIntegrationTest, cleanMockWorkspace } from "./helpers";
import * as runner from "../languageRunner";

import moxios from "moxios";

suite("Language Runner Test Suite", () => {
  vscode.window.showInformationMessage("Start utils tests.");

  suiteSetup(async () => {
    await beforeIntegrationTest();
  });

  teardown(() => {
    cleanMockWorkspace();
  });

  test("getLanguageRunnerFromExtension should return correct runner for known extensions", () => {
    assert.ok(runner.getLanguageRunnerFromExtension("cc") instanceof runner.CppRunner);
    assert.ok(runner.getLanguageRunnerFromExtension("cpp") instanceof runner.CppRunner);
    assert.ok(runner.getLanguageRunnerFromExtension("py") instanceof runner.PythonRunner);
    assert.throws(() => runner.getLanguageRunnerFromExtension("foo"));
  });

  test("CppRunner should compile and run correctly", () => {
    const cppRunner = new runner.CppRunner();
    const codePath = vscode.workspace.workspaceFolders![0].uri.fsPath + "/sum.cc";
    const input = "1 2";
    const output = cppRunner.run(codePath, input);
    assert.equal(output, "3\n");
  });

  test("PythonRunner should run correctly", () => {
    const pythonRunner = new runner.PythonRunner();
    const codePath = vscode.workspace.workspaceFolders![0].uri.fsPath + "/sum.py";
    const input = "1 2";
    const output = pythonRunner.run(codePath, input);
    assert.equal(output, "3\n");
  });

  // TODO: Test handling of compilation/runtime errors
});
