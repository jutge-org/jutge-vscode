import * as assert from "assert";

import * as vscode from "vscode";
import { beforeIntegrationTest } from "./helpers";
import * as utils from "../utils";

import moxios from "moxios";

suite("Utils Test Suite", () => {
  vscode.window.showInformationMessage("Start utils tests.");

  suiteSetup(async () => {
    await beforeIntegrationTest();
  });

  test("getCompilerIdFromExtension should return correct compiler id for known extensions", () => {
    assert.equal(utils.getCompilerIdFromExtension("cc"), "G++");
    assert.equal(utils.getCompilerIdFromExtension("cpp"), "G++");
    assert.equal(utils.getCompilerIdFromExtension("py"), "Python3");
  });

  test("getCompilerIdFromExtension should return empty string for unknown extensions", () => {
    assert.equal(utils.getCompilerIdFromExtension("foo"), "");
  });

  test("chooseFromEditorList should return undefined for empty list", async () => {
    assert.equal(await utils.chooseFromEditorList([]), undefined);
  });

  test("chooseFromEditorList should return the only editor for a list of one", async () => {
    const workspaceFolder = vscode.workspace.workspaceFolders![0];
    const editor = await vscode.window.showTextDocument(
      vscode.Uri.joinPath(workspaceFolder.uri, "empty_file.cc")
    );
    assert.equal(await utils.chooseFromEditorList([editor]), editor);
  });

  test("getDefaultProblemId should return correct problem id for known problem", async function () {
    await vscode.workspace
      .getConfiguration("jutge-vscode")
      .update("problem.preferredLang", "Català");
    assert.equal(utils.getDefaultProblemId("P68688"), "P68688_ca");

    await vscode.workspace
      .getConfiguration("jutge-vscode")
      .update("problem.preferredLang", "Castellano");
    assert.equal(utils.getDefaultProblemId("P68688"), "P68688_es");

    await vscode.workspace
      .getConfiguration("jutge-vscode")
      .update("problem.preferredLang", "English");
    assert.equal(utils.getDefaultProblemId("P68688"), "P68688_en");
  });

  test("isProblemValidAndAccessible should return true for valid problem", async function () {
    const value = utils.isProblemValidAndAccessible("P68688");

    moxios.wait(function () {
      let request = moxios.requests.mostRecent();
      request
        .respondWith({
          status: 200,
          response: "mock response",
        })
        .then(function () {
          assert.equal(value, true);
        });
    });
  });

  test("isProblemValidAndAccessible should return false for invalid problem", async function () {
    const value = utils.isProblemValidAndAccessible("P12345");

    moxios.wait(function () {
      let request = moxios.requests.mostRecent();
      request
        .respondWith({
          status: 404,
          response: "Not Found",
        })
        .then(function () {
          assert.equal(value, false);
        });
    });
  });
});
