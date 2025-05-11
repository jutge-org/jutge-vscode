import { allComponents, provideVSCodeDesignSystem } from "@vscode/webview-ui-toolkit"
import {
    SubmissionStatus,
    VSCodeToWebviewCommand,
    VSCodeToWebviewMessage,
    WebviewToVSCodeCommand,
} from "../utils/types"
import { makeSpacesVisible } from "./utils"

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
}

window.addEventListener("load", onLoad)
window.addEventListener("message", onEvent)

// Keep the ids of the passed tests to know when all have passed
const passedTestcases: Map<string, boolean> = new Map()
document.querySelectorAll(`.testcase`).forEach((elem) => {
    passedTestcases.set(elem.id, false)
})

function onLoad() {
    addOnClickEventListeners()
    const data = document.getElementById("data")!.dataset
    vscode.setState(data)
}

function onEvent(event: MessageEvent<any>) {
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
}

function assertNotNull<T>(value: T | null, message: string): asserts value is T {
    if (value === null) {
        throw new Error(message)
    }
}

function postMessage(command: WebviewToVSCodeCommand, data: any = "") {
    vscode.postMessage({ command, data })
}

function getButton(id: string): HTMLButtonElement {
    const button = document.getElementById(id) as HTMLButtonElement
    assertNotNull(button, `Button with id ${id} not found`)
    return button
}

function addOnClickEventListeners() {
    getButton("new-file").addEventListener("click", () => {
        postMessage(WebviewToVSCodeCommand.NEW_FILE)
    })
    getButton("submit-to-jutge").addEventListener("click", () => {
        postMessage(WebviewToVSCodeCommand.SUBMIT_TO_JUTGE)
    })
    getButton("run-all-testcases").addEventListener("click", () => {
        postMessage(WebviewToVSCodeCommand.RUN_ALL_TESTCASES)
    })
    document.querySelectorAll('[id^="run-testcase-"]').forEach((button) => {
        button.addEventListener("click", () => {
            postMessage(WebviewToVSCodeCommand.RUN_TESTCASE, {
                testcaseId: parseInt(button.id.split("-")[2]),
            })
        })
    })
    document.querySelectorAll(".clipboard").forEach((button) => {
        button.addEventListener("click", () => {
            const textElement = button.nextElementSibling as HTMLDivElement
            const preElement = textElement.querySelector("pre")
            assertNotNull(preElement, `Pre element not found!`)

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
    document.querySelectorAll(".toggle-minimize").forEach((button) => {
        button.addEventListener("click", () => {
            const icon = button.querySelector(".icon i") as HTMLElement
            const testcaseContent = button.parentElement?.nextElementSibling as HTMLElement
            const isMinimized = icon.classList.contains("codicon-chevron-down")
            if (isMinimized) {
                icon.classList.remove("codicon-chevron-down")
                icon.classList.add("codicon-chevron-up")
                testcaseContent.style.display = "flex"
            } else {
                icon.classList.remove("codicon-chevron-up")
                icon.classList.add("codicon-chevron-down")
                testcaseContent.style.display = "none"
            }
        })
    })
    document.querySelectorAll(".compare-diff").forEach((button) => {
        button.addEventListener("click", () => {
            const testcaseId = parseInt(button.closest(".testcase")!.id.split("-")[1])

            // Get the expected and received output texts
            const testcase = document.getElementById(`testcase-${testcaseId}`)!
            const expected = testcase.querySelector(".expected pre")!
            const received = testcase.querySelector(".received pre")!

            // Original text (without special chars visualization)
            const expectedText = expected.getAttribute("data-original-text") || expected.textContent || ""
            const receivedText = received.getAttribute("data-original-text") || received.textContent || ""

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

function updateTestcase(testcaseIndex: number, status: string, outputText: string) {
    const testcaseId = `testcase-${testcaseIndex}`
    const testcase = document.getElementById(testcaseId) as HTMLDivElement
    const content = testcase.querySelector(`.content`) as HTMLDivElement
    const running = testcase.querySelector(".running-text") as HTMLSpanElement
    const received = testcase.querySelector(".received") as HTMLDivElement
    const output = testcase.querySelector("#received pre") as HTMLPreElement

    const setTestcaseAppearance = (text: string, color: string) => {
        running.textContent = text
        testcase.style.borderLeftColor = color
        running.style.color = color
    }

    const setOutputText = (text: string) => {
        output.setAttribute("data-original-text", text)
        output.innerHTML = makeSpacesVisible(text)
        received.style.display = "block"
        content.classList.add("compare")
    }
    const hideOutputText = () => {
        received.style.display = "none"
        content.classList.remove("compare")
    }

    switch (status) {
        case "running":
            setTestcaseAppearance("Running...", "yellow")
            hideOutputText()
            break

        case "passed":
            setTestcaseAppearance("Passed", "green")
            setOutputText(outputText)
            content.style.display = "none"
            passedTestcases.set(testcaseId, true)
            break

        case "failed":
            setTestcaseAppearance("Failed", "red")
            setOutputText(outputText)
            content.style.display = "flex"
            passedTestcases.set(testcaseId, false)
            break
    }

    let allPassed = passedTestcases.values().every((v) => v === true)
    getButton("submit-to-jutge").disabled = !allPassed
}

function updateSubmissionStatus(status: SubmissionStatus) {
    getButton("submit-to-jutge").disabled = status === SubmissionStatus.PENDING
}
