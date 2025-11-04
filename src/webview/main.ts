import { allComponents, provideVSCodeDesignSystem } from "@vscode/webview-ui-toolkit"
import {
    SubmissionStatus,
    VSCodeToWebviewCommand,
    VSCodeToWebviewMessage,
    WebviewToVSCodeCommand,
} from "../types"
import { makeSpacesVisible } from "./utils"
import { htmlCustomTestcases } from "../providers/problem-webview/html"

// Warning: this import is important, it will produce a "main.css" file that
// later we will refer to from the HTML (esbuild does this)
import { chevronDown, chevronRight } from "./components/icons"
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
    addEventListeners()
    const data = document.getElementById("data")!.dataset
    vscode.setState(data)
}

function onEvent(event: MessageEvent<any>) {
    const message = event.data as VSCodeToWebviewMessage
    const { command, data } = message
    console.log("Received message from extension", command, data)

    // Save state whenever we receive updates
    switch (command) {
        case VSCodeToWebviewCommand.UPDATE_PROBLEM_FILES:
            updateCustomTestcases(data.customTestcases)
            updateOpenExistingFileButton(data.fileExists)
            updateCollapseButton("custom")
            break
        case VSCodeToWebviewCommand.UPDATE_TESTCASE_STATUS:
            updateTestcaseStatus(data.testcaseId, data.status, data.output, "normal")
            updateCollapseButton("normal")
            break
        case VSCodeToWebviewCommand.UPDATE_CUSTOM_TESTCASE_STATUS:
            updateTestcaseStatus(data.testcaseId, data.status, data.output, "custom")
            updateCollapseButton("custom")
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
        console.warn(`Button with id ${id} not found`)
        return null
    }
    return button as HTMLButtonElement
}

const postMessageForTestcase = (command: WebviewToVSCodeCommand) =>
    function () {
        postMessage(command, {
            testcaseId: parseInt(this.id.split("-").slice(-1)[0]),
        })
    }

const runTestcase = postMessageForTestcase(WebviewToVSCodeCommand.RUN_TESTCASE)
const editTestcase = postMessageForTestcase(WebviewToVSCodeCommand.EDIT_TESTCASE)
const runCustomTestcase = postMessageForTestcase(WebviewToVSCodeCommand.RUN_CUSTOM_TESTCASE)

function copyToClipboard() {
    const textElement = this.parentElement.nextElementSibling as HTMLDivElement
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

const collapsed: Record<"normal" | "custom", boolean> = {
    normal: false,
    custom: false,
}

function updateCollapseButton(type: "normal" | "custom") {
    const contentElems = document.querySelectorAll(
        `#${type}-testcases > .panels > .testcase > .content`
    )
    console.log("contentElems", contentElems)
    const collapsedElems: boolean[] = []
    for (const elem of contentElems) {
        collapsedElems.push((elem as HTMLElement).style.display === "none")
    }
    const allCollapsed = collapsedElems.every((p) => p)
    const allExpanded = collapsedElems.every((p) => !p)
    if (allCollapsed) {
        collapsed[type] = true
    } else if (allExpanded) {
        collapsed[type] = false
    }
    const button = document.querySelector(
        `#${type}-testcases > .header > h2 > .collapse-testcases`
    )
    button.textContent = collapsed[type] ? "Expand All" : "Collapse All"
}

const minimize = (type: "normal" | "custom") =>
    function () {
        const icon = this.querySelector(".icon") as HTMLSpanElement
        const testcaseContent = this.parentElement?.nextElementSibling as HTMLElement
        const isMinimized = testcaseContent.style.display === "none"
        icon.innerHTML = isMinimized ? chevronDown() : chevronRight()
        testcaseContent.style.display = isMinimized ? "flex" : "none"
        updateCollapseButton(type)
    }

const toggleMinimizedExpanded = (type: "normal" | "custom") =>
    function () {
        collapsed[type] = !collapsed[type]
        document
            .querySelectorAll(`.testcase.${type} > .content`)
            .forEach((element: HTMLElement) => {
                element.style.display = collapsed[type] ? "none" : "flex"
            })
        updateCollapseButton(type)
    }

function compareDiff() {
    const testcaseElem = this.closest(".testcase")!
    const testcaseId = parseInt(testcaseElem.id.split("-")[1])

    switch (testcaseElem.dataset.type) {
        case "std": {
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
            break
        }
        case "graphic": {
            console.log("TODO: Graphic comparison!")
            break
        }
        default:
            console.error(`Unknown type of testcase: '${testcaseElem.dataset.type}'`)
    }
}

const onClick = (fn: EventListenerOrEventListenerObject) => (element: Element) =>
    element.addEventListener("click", fn)

function addOnClicks(id2command: [string, WebviewToVSCodeCommand][]) {
    for (const [id, command] of id2command) {
        getButton(id)?.addEventListener("click", () => {
            postMessage(command)
        })
    }
}

function addEventListeners() {
    addOnClicks([
        ["new-file", WebviewToVSCodeCommand.NEW_FILE],
        ["submit-to-jutge", WebviewToVSCodeCommand.SUBMIT_TO_JUTGE],
        ["run-all-testcases", WebviewToVSCodeCommand.RUN_ALL_TESTCASES],
        ["add-new-testcase", WebviewToVSCodeCommand.ADD_NEW_TESTCASE],
        // This one might not be there
        ["open-existing-file", WebviewToVSCodeCommand.OPEN_EXISTING_FILE],
    ])

    document.querySelectorAll('[id^="run-testcase-"]').forEach(onClick(runTestcase))
    document.querySelectorAll('[id^="edit-testcase-"]').forEach(onClick(editTestcase))
    document
        .querySelectorAll('[id^="run-custom-testcase-"]')
        .forEach(onClick(runCustomTestcase))

    document.querySelectorAll(".copy-to-clipboard").forEach(onClick(copyToClipboard))

    document
        .querySelectorAll("#normal-testcases .toggle-minimize")
        .forEach(onClick(minimize("normal")))
    document
        .querySelectorAll("#custom-testcases .toggle-minimize")
        .forEach(onClick(minimize("custom")))

    document.querySelectorAll(".compare-diff").forEach(onClick(compareDiff))

    document
        .querySelectorAll("#normal-testcases .collapse-testcases")
        .forEach(onClick(toggleMinimizedExpanded("normal")))
    document
        .querySelectorAll("#custom-testcases .collapse-testcases")
        .forEach(onClick(toggleMinimizedExpanded("custom")))
}

function updateCustomTestcases(customTestcases: string[] /* html for testcases */) {
    const customTestcasesDiv = document.getElementById(`custom-testcases`)
    if (!customTestcasesDiv) {
        throw new Error(`Div with id "custom-testcases" not found`)
    }
    customTestcasesDiv.innerHTML = htmlCustomTestcases(customTestcases)

    customTestcasesDiv.querySelectorAll('[id^="edit-testcase-"]').forEach(onClick(editTestcase))

    customTestcasesDiv
        .querySelectorAll('[id^="run-custom-testcase-"]')
        .forEach(onClick(runCustomTestcase))

    addOnClicks([["add-new-testcase", WebviewToVSCodeCommand.ADD_NEW_TESTCASE]])

    document
        .querySelectorAll("#custom-testcases .toggle-minimize")
        .forEach(onClick(minimize("custom")))

    document
        .querySelectorAll("#custom-testcases .collapse-testcases")
        .forEach(onClick(toggleMinimizedExpanded("custom")))
}

function updateTestcaseStatus(
    testcaseIndex: number,
    status: string,
    outputText: string,
    testcaseType: "custom" | "normal"
) {
    const testcaseId =
        testcaseType === "normal"
            ? `testcase-${testcaseIndex}`
            : `custom-testcase-${testcaseIndex}`
    const testcase = document.getElementById(testcaseId) as HTMLDivElement
    const content = testcase.querySelector(`.content`) as HTMLDivElement
    const running = testcase.querySelector(".running-text") as HTMLSpanElement
    const containerReceived = testcase.querySelector(".container.received") as HTMLDivElement

    const setTestcaseAppearance = (text: string, color: string) => {
        running.textContent = text
        testcase.style.borderLeftColor = color
        running.style.color = color
    }

    const setOutput = (text: string) => {
        if (testcase.dataset.type === "graphic") {
            const received = testcase.querySelector("#received")
            received.textContent = "" // clear inside (fastest)
            const img = document.createElement("img")
            img.src = `data:image/png;base64,${outputText}`
            received.appendChild(img)
        } else {
            const output = testcase.querySelector("#received pre") as HTMLPreElement
            output.setAttribute("data-original-text", text)
            output.innerHTML = makeSpacesVisible(text)
        }
        containerReceived.style.display = "block"
    }

    switch (status) {
        case "running":
            setTestcaseAppearance("Running...", "yellow")
            containerReceived.style.display = "none"
            content.classList.remove("compare")
            break

        case "failed":
            setTestcaseAppearance("Failed", "red")
            setOutput(outputText)
            content.style.display = "flex"
            content.classList.add("compare")
            passedTestcases.set(testcaseId, false)
            break

        case "passed":
            setTestcaseAppearance(testcaseType === "normal" ? "Passed" : "Done", "green")
            setOutput(outputText)
            content.style.display = testcaseType === "normal" ? "none" : "flex"
            content.classList.remove("compare")
            passedTestcases.set(testcaseId, true)
            break
    }
}

function updateSubmissionStatus(status: SubmissionStatus) {
    getButton("submit-to-jutge").disabled = status === SubmissionStatus.PENDING
}

function updateOpenExistingFileButton(fileExists: boolean) {
    getButton("open-existing-file").disabled = !fileExists
}
