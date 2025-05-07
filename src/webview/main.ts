import { Button, allComponents, provideVSCodeDesignSystem } from "@vscode/webview-ui-toolkit"
import {
    SubmissionStatus,
    VSCodeToWebviewCommand,
    VSCodeToWebviewMessage,
    WebviewToVSCodeCommand,
} from "../utils/types"
import { makeSpecialCharsVisible } from "./utils"

// Warning: this import is important, it will produce a "main.css" file that
// later we will refer to from the HTML (esbuild does this)
import "./styles/style.css"

provideVSCodeDesignSystem().register(allComponents)

// Get access to the VS Code API from within the webview context
const vscode = acquireVsCodeApi()

// Restore state if it exists
const previousState = vscode.getState()
if (previousState) {
    console.log("Restoring previous state:", previousState)
    // You can restore any UI state here
}

// Just like a regular webpage we need to wait for the webview
// DOM to load before we can reference any of the HTML elements
// or toolkit components
window.addEventListener("load", main)

// Handle messages sent from the extension to the webview
window.addEventListener("message", (event) => {
    const message = event.data as VSCodeToWebviewMessage
    const { command, data } = message
    console.log("Received message from extension", command, data)

    // Save state whenever we receive updates
    switch (command) {
        case VSCodeToWebviewCommand.UPDATE_TESTCASE:
            updateTestcase(data.testcaseId, data.status, data.output)
            break
        case VSCodeToWebviewCommand.UPDATE_SUBMISSION_STATUS:
            updateSubmissionStatus(data.status)
            break
        default:
            console.log("Unknown command", command)
    }
})

function main() {
    addOnClickEventListeners()

    const data = document.getElementById("data")!.dataset
    vscode.setState({
        problemNm: data.problemNm,
        title: data.title,
    })
}

function addOnClickEventListeners() {
    const newFileButton = document.getElementById("new-file") as HTMLButtonElement
    newFileButton?.addEventListener("click", () => {
        vscode.postMessage({
            command: WebviewToVSCodeCommand.NEW_FILE,
            data: "",
        })
    })

    const submitToJutgeButton = document.getElementById("submit-to-jutge") as HTMLButtonElement
    submitToJutgeButton?.addEventListener("click", () => {
        vscode.postMessage({
            command: WebviewToVSCodeCommand.SUBMIT_TO_JUTGE,
            data: "",
        })
    })

    const runAllTestcasesButton = document.getElementById("run-all-testcases") as HTMLButtonElement
    runAllTestcasesButton?.addEventListener("click", () => {
        vscode.postMessage({
            command: WebviewToVSCodeCommand.RUN_ALL_TESTCASES,
            data: "",
        })
    })

    const runTestcaseButtons = document.querySelectorAll('[id^="run-testcase-"]')
    runTestcaseButtons.forEach((button) => {
        button.addEventListener("click", () => {
            const testcaseId = button.id.split("-")[2]
            const testcaseIdNumber = parseInt(testcaseId)
            vscode.postMessage({
                command: WebviewToVSCodeCommand.RUN_TESTCASE,
                data: {
                    testcaseId: testcaseIdNumber,
                },
            })
        })
    })

    const copyToClipboardButtons = document.querySelectorAll(".clipboard")
    copyToClipboardButtons.forEach((button) => {
        button.addEventListener("click", () => {
            const textElement = button.nextElementSibling as HTMLDivElement
            const preElement = textElement.querySelector("pre")! // we know there is a pre... don't we? ;)

            // Store the original text in a data attribute when generating the HTML
            const originalText = preElement.getAttribute("data-original-text") || preElement.textContent || ""
            navigator.clipboard.writeText(originalText)

            // Optional: Show a temporary "Copied!" feedback
            const originalButtonText = button.textContent
            button.textContent = "Copied!"
            setTimeout(() => {
                button.textContent = originalButtonText
            }, 1000)
        })
    })

    const toggleMinimizeButtons = document.querySelectorAll(".toggle-minimize")
    toggleMinimizeButtons.forEach((button) => {
        button.addEventListener("click", () => {
            const icon = button.querySelector(".icon i") as HTMLElement
            const testcaseContent = button.parentElement?.nextElementSibling as HTMLElement
            const isMinimized = icon.classList.contains("codicon-chevron-down")
            if (isMinimized) {
                icon.classList.remove("codicon-chevron-down")
                icon.classList.add("codicon-chevron-up")
                testcaseContent.style.display = "block"
            } else {
                icon.classList.remove("codicon-chevron-up")
                icon.classList.add("codicon-chevron-down")
                testcaseContent.style.display = "none"
            }
        })
    })

    // Add handler for diff comparison buttons
    const compareDiffButtons = document.querySelectorAll(".compare-diff")
    compareDiffButtons.forEach((button) => {
        button.addEventListener("click", () => {
            const testcaseId = parseInt(button.closest(".case")!.id.split("-")[1])

            // Get the expected and received output texts
            const testcaseElement = document.getElementById(`testcase-${testcaseId}`)!
            const expectedElement = testcaseElement.querySelector(".expected-div pre")!
            const receivedElement = testcaseElement.querySelector(".received-div pre")!

            // Original text (without special chars visualization)
            const expectedText = expectedElement.getAttribute("data-original-text") || expectedElement.textContent || ""
            const receivedText = receivedElement.getAttribute("data-original-text") || receivedElement.textContent || ""

            vscode.postMessage({
                command: WebviewToVSCodeCommand.SHOW_DIFF,
                data: {
                    testcaseId: testcaseId,
                    expected: expectedText,
                    received: receivedText,
                },
            })
        })
    })
}

function updateTestcase(testcaseId: number, status: string, output: string) {
    const testcaseElement = document.getElementById(`testcase-${testcaseId}`) as HTMLDivElement
    const runningText = testcaseElement.querySelector(".running-text") as HTMLSpanElement
    const receivedDiv = testcaseElement.querySelector(".received-div") as HTMLDivElement
    const outputElement = testcaseElement.querySelector("#received pre") as HTMLPreElement

    switch (status) {
        case "running":
            testcaseElement.style["border-left-color"] = "yellow"
            runningText.style.color = "yellow"
            runningText.textContent = "Running..."
            break

        case "passed":
            testcaseElement.style["border-left-color"] = "green"
            runningText.style.color = "green"
            runningText.textContent = "Passed"
            outputElement.setAttribute("data-original-text", output)
            outputElement.textContent = makeSpecialCharsVisible(output)
            receivedDiv.style.display = "block"
            break

        case "failed":
            testcaseElement.style["border-left-color"] = "red"
            runningText.textContent = "Failed"
            runningText.style.color = "red"
            outputElement.setAttribute("data-original-text", output)
            outputElement.textContent = makeSpecialCharsVisible(output)
            receivedDiv.style.display = "block"
            break
    }
}

function updateSubmissionStatus(status: SubmissionStatus) {
    const submissionStatusElement = document.getElementById("submit-to-jutge") as Button
    switch (status) {
        case SubmissionStatus.PENDING:
            submissionStatusElement.disabled = true
            break

        default:
            submissionStatusElement.disabled = false
            break
    }
}
