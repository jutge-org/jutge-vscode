import * as assert from "assert";

import * as vscode from "vscode";
import { beforeIntegrationTest, cleanMockWorkspace } from "./helpers";
import * as runner from "../problemRunner";

import moxios from "moxios";
import { Problem } from "../types";

suite("Problem Runner Test Suite", () => {
  vscode.window.showInformationMessage("Start utils tests.");

  suiteSetup(async () => {
    await beforeIntegrationTest();
  });

  teardown(() => {
    cleanMockWorkspace();
  });

  test("runTestcase should return undefined for non-existent file", () => {
    const codePath = vscode.workspace.workspaceFolders![0].uri.fsPath + "/non_existent_file.cc";
    assert.equal(runner.runTestcase("1 2", codePath), undefined);
  });

  test("runTestcase should return correct output for known problem", async function () {
    const codePath = vscode.workspace.workspaceFolders![0].uri.fsPath + "/sum.cc";
    const input = "1 2";
    const output = runner.runTestcase(input, codePath);
    assert.equal(output, "3\n");
  });

  test("runSingleTestcase should return known output for known problem", async function () {
    const codePath = vscode.workspace.workspaceFolders![0].uri.fsPath + "/sum.cc";
    const problem = {
      problem_nm: "P68688",
    } as Problem;
    const result = runner.runSingleTestcase(1, problem, codePath);
    moxios.wait(function () {
      let request = moxios.requests.mostRecent();
      request
        .respondWith({
          status: 200,
          response: [
            {
              name: "sample",
              input_b64: Buffer.from("1 2", "utf-8").toString("base64"),
              correct_b64: Buffer.from("3", "utf-8").toString("base64"),
            },
          ],
        })
        .then(() => {
          assert.ok(result);
        });
    });
  });
});
