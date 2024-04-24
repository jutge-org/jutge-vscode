import { provideVSCodeDesignSystem, allComponents } from "@vscode/webview-ui-toolkit";

import { VSCodeToWebviewCommand, VSCodeToWebviewMessage, WebviewToVSCodeCommand } from "../types";

provideVSCodeDesignSystem().register(allComponents);

// Get access to the VS Code API from within the webview context
const vscode = acquireVsCodeApi();

// Just like a regular webpage we need to wait for the webview
// DOM to load before we can reference any of the HTML elements
// or toolkit components
window.addEventListener("load", main);

// Handle messages sent from the extension to the webview
window.addEventListener("message", (event) => {
  const message = event.data as VSCodeToWebviewMessage;
  const { command, data } = message;
  console.log("Received message from extension", command, data);
  switch (command) {
    case VSCodeToWebviewCommand.UPDATE_TESTCASE:
      updateTestcase(data.testcaseId, data.status, data.output);
      break;
  }
});

function main() {
  addOnClickEventListeners();
}

function addOnClickEventListeners() {
  const submitToJutgeButton = document.getElementById("submit-to-jutge") as HTMLButtonElement;
  submitToJutgeButton?.addEventListener("click", () => {
    vscode.postMessage({
      command: WebviewToVSCodeCommand.SUBMIT_TO_JUTGE,
      data: "",
    });
  });

  const runAllTestcasesButton = document.getElementById("run-all-testcases") as HTMLButtonElement;
  runAllTestcasesButton?.addEventListener("click", () => {
    vscode.postMessage({
      command: WebviewToVSCodeCommand.RUN_ALL_TESTCASES,
      data: "",
    });
  });

  const runTestcaseButtons = document.querySelectorAll('[id^="run-testcase-"]');
  runTestcaseButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const testcaseId = button.id.split("-")[2];
      const testcaseIdNumber = parseInt(testcaseId);
      vscode.postMessage({
        command: WebviewToVSCodeCommand.RUN_TESTCASE,
        data: {
          testcaseId: testcaseIdNumber,
        },
      });
    });
  });

  const copyToClipboardButtons = document.querySelectorAll(".clipboard");
  copyToClipboardButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const text = button.nextElementSibling as HTMLDivElement;
      const textContent = text.textContent;
      navigator.clipboard.writeText(textContent || "");
    });
  });

  const toggleMinimizeButtons = document.querySelectorAll(".toggle-minimize");
  toggleMinimizeButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const icon = button.querySelector(".icon i") as HTMLElement;
      const testcaseContent = button.parentElement?.nextElementSibling as HTMLElement;
      const isMinimized = icon.classList.contains("codicon-chevron-down");
      if (isMinimized) {
        icon.classList.remove("codicon-chevron-down");
        icon.classList.add("codicon-chevron-up");
        testcaseContent.style.display = "block";
      } else {
        icon.classList.remove("codicon-chevron-up");
        icon.classList.add("codicon-chevron-down");
        testcaseContent.style.display = "none";
      }
    });
  });
}

function updateTestcase(testcaseId: number, status: string, output: string) {
  const testcaseElement = document.getElementById(`testcase-${testcaseId}`) as HTMLDivElement;
  const runningText = testcaseElement.querySelector(".running-text") as HTMLSpanElement;
  const receivedDiv = testcaseElement.querySelector(".received-div") as HTMLDivElement;
  const outputElement = testcaseElement.querySelector("#received pre") as HTMLPreElement;

  switch (status) {
    case "running":
      testcaseElement.style["border-left-color"] = "yellow";
      runningText.style.color = "yellow";
      runningText.textContent = "Running...";
      break;
    case "passed":
      testcaseElement.style["border-left-color"] = "green";
      runningText.style.color = "green";
      runningText.textContent = "Passed";
      outputElement.textContent = output;
      receivedDiv.style.display = "block";
      break;
    case "failed":
      testcaseElement.style["border-left-color"] = "red";
      runningText.textContent = "Failed";
      runningText.style.color = "red";
      outputElement.textContent = output;
      receivedDiv.style.display = "block";
      break;
  }
}
