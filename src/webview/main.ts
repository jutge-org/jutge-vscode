import { allComponents, provideVSCodeDesignSystem } from "@vscode/webview-ui-toolkit"
import {
    CustomTestcase,
    SubmissionStatus,
    VSCodeToWebviewCommand,
    VSCodeToWebviewMessage,
    WebviewToVSCodeCommand,
} from "../types"
import { makeSpacesVisible } from "./utils"

// Warning: this import is important, it will produce a "main.css" file that
// later we will refer to from the HTML (esbuild does this)
import "./styles/style.css"
import { chevronDown, chevronRight } from "./components/icons"

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
        case VSCodeToWebviewCommand.UPDATE_CUSTOM_TESTCASES:
            updateCustomTestcases(data.htmlTestcases)
            break
        case VSCodeToWebviewCommand.UPDATE_TESTCASE_STATUS:
            updateTestcaseStatus(data.testcaseId, data.status, data.output, "normal")
            break
        case VSCodeToWebviewCommand.UPDATE_CUSTOM_TESTCASE_STATUS:
            updateTestcaseStatus(data.testcaseId, data.status, data.output, "custom")
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

function getButton(id: string): HTMLButtonElement | null {
    const button = document.getElementById(id)
    if (!button) {
        console.error(`Button with id ${id} not found`)
        return null
    }
    return button as HTMLButtonElement
}

function runCustomTestcase() {
    postMessage(WebviewToVSCodeCommand.RUN_CUSTOM_TESTCASE, {
        testcaseId: parseInt(this.id.split("-").slice(-1)[0]),
    })
}

function copyToClipboard() {
    const textElement = this.nextElementSibling as HTMLDivElement
    const preElement = textElement.querySelector("pre")
    assertNotNull(preElement, `Pre element not found!`)

    // Store the original text in a data attribute when generating the HTML
    const originalText =
        preElement.getAttribute("data-original-text") || preElement.textContent || ""

    navigator.clipboard.writeText(originalText)

    // Optional: Show a temporary "Copied!" feedback
    const originalButtonText = this.textContent
    this.textContent = "Copied!"

    setTimeout(() => {
        this.textContent = originalButtonText
    }, 1000)
}

function minimize() {
    const icon = this.querySelector(".icon") as HTMLSpanElement
    const testcaseContent = this.parentElement?.nextElementSibling as HTMLElement
    const isMinimized = testcaseContent.style.display === "none"
    icon.innerHTML = isMinimized ? chevronDown() : chevronRight()
    testcaseContent.style.display = isMinimized ? "flex" : "none"
}

function compareDiff() {
    const testcaseId = parseInt(this.closest(".testcase")!.id.split("-")[1])

    // Get the expected and received output texts
    const testcase = document.getElementById(`testcase-${testcaseId}`)!
    const expected = testcase.querySelector(".expected pre")!
    const received = testcase.querySelector(".received pre")!

    // Original text (without special chars visualization)
    const expectedText =
        expected.getAttribute("data-original-text") || expected.textContent || ""
    const receivedText =
        received.getAttribute("data-original-text") || received.textContent || ""

    vscode.postMessage({
        command: WebviewToVSCodeCommand.SHOW_DIFF,
        data: {
            testcaseId: testcaseId,
            expected: expectedText,
            received: receivedText,
        },
    })
}

const onClick = (fn: EventListenerOrEventListenerObject) => (element: Element) =>
    element.addEventListener("click", fn)

function addOnClickEventListeners() {
    let id2command: [string, WebviewToVSCodeCommand][] = [
        ["open-file", WebviewToVSCodeCommand.OPEN_FILE],
        ["new-file", WebviewToVSCodeCommand.NEW_FILE],
        ["submit-to-jutge", WebviewToVSCodeCommand.SUBMIT_TO_JUTGE],
        ["run-all-testcases", WebviewToVSCodeCommand.RUN_ALL_TESTCASES],
        ["add-new-testcase", WebviewToVSCodeCommand.ADD_NEW_TESTCASE],
    ]

    for (const [id, command] of id2command) {
        getButton(id)?.addEventListener("click", () => {
            postMessage(command)
        })
    }

    document.querySelectorAll('[id^="run-testcase-"]').forEach((button) => {
        button.addEventListener("click", () => {
            postMessage(WebviewToVSCodeCommand.RUN_TESTCASE, {
                testcaseId: parseInt(button.id.split("-")[2]),
            })
        })
    })

    document
        .querySelectorAll('[id^="run-custom-testcase-"]')
        .forEach(onClick(runCustomTestcase))

    document.querySelectorAll(".clipboard").forEach(onClick(copyToClipboard))
    document.querySelectorAll(".toggle-minimize").forEach(onClick(minimize))
    document.querySelectorAll(".compare-diff").forEach(onClick(compareDiff))
}

function updateCustomTestcases(customTestcases: string[] /* html for testcases */) {
    const customTestcasesDiv = document.getElementById(`custom-testcases`)
    if (!customTestcasesDiv) {
        throw new Error(`Div with id "custom-testcases" not found`)
    }
    customTestcasesDiv.innerHTML = customTestcases.join("\n")

    customTestcasesDiv
        .querySelectorAll('[id^="run-custom-testcase-"]')
        .forEach(onClick(runCustomTestcase))

    customTestcasesDiv.querySelectorAll(".toggle-minimize").forEach(onClick(minimize))
}

function updateTestcaseStatus(
    testcaseIndex: number,
    status: string,
    outputText: string,
    type: "custom" | "normal"
) {
    const testcaseId =
        type === "normal"
            ? `testcase-${testcaseIndex}`
            : `custom-testcase-${testcaseIndex}`
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
            content.style.display = type === "normal" ? "none" : "flex"
            passedTestcases.set(testcaseId, true)
            break

        case "failed":
            setTestcaseAppearance("Failed", "red")
            setOutputText(outputText)
            content.style.display = "flex"
            passedTestcases.set(testcaseId, false)
            break
    }
}

function updateSubmissionStatus(status: SubmissionStatus) {
    getButton("submit-to-jutge").disabled = status === SubmissionStatus.PENDING
}
