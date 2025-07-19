import { Testcase } from "@/jutge_api_client"
import { CustomTestcase, ProblemHandler } from "@/types"
import { Button as htmlButton, icons } from "@/webview/components/button"
import { chevronDown, warningIcon } from "@/webview/components/icons"
import { makeSpacesVisible } from "@/webview/utils"
import { Uri } from "vscode"

type ActualAndDisplayed = {
    actual: string
    displayed: string
}

export function htmlForTestcaseCommon(
    type: "normal" | "custom",
    input: { actual: string; displayed: string },
    output: { actual: string; displayed: string } | undefined,
    index: number
) {
    let props: { title: string; extraCssClass: string; elemId: string; runId: string }

    switch (type) {
        case "normal":
            props = {
                elemId: `testcase-${index}`,
                title: "Testcase",
                extraCssClass: "",
                runId: `run-testcase-${index}`,
            }
            break
        case "custom":
            props = {
                elemId: `custom-testcase-${index}`,
                title: "Custom Testcase",
                extraCssClass: "custom",
                runId: `run-custom-testcase-${index}`,
            }
            break
    }

    let expectedOutputHtml = ""
    if (type === "normal") {
        expectedOutputHtml = `
            <div class="container expected">
                <div class="title">Expected Output:</div>
                <div class="clipboard" title="Copy to clipboard">Copy</div>
                <div id="expected" class="selectable textarea">
                    <pre data-original-text="${output?.actual || ""}">${output?.displayed || ""}</pre>
                </div>
            </div>`
    }

    return /*html*/ `
        <div class="testcase ${props.extraCssClass}" id="${props.elemId}">
            <div class="metadata">
                <div class="toggle-minimize">
                    <div class="title">
                        <div class="icon">${chevronDown()}</div>
                        ${props.title} ${index}
                    </div>
                    <span class="running-text"></span>
                </div>
                <div id="${props.runId}" class="run-button" title="Run this testcase only">
                    <div class="icon">${icons["run"]()}</div>
                    <span>Run</span>
                </div>
            </div>

            <div class="content">
                <div class="input container">
                    <div class="title">Input:</div>
                    <div class="clipboard" title="Copy to clipboard">Copy</div>
                    <div id="input" class="selectable textarea">
                        <pre data-original-text="${input}">${input.displayed}</pre>
                    </div>
                </div>
                <div class="output container ${props.extraCssClass}">
                    ${expectedOutputHtml}
                    <div class="container received">
                        <div class="title">Received Output:</div>
                        ${type === "normal" ? `<div class="compare-diff" title="Compare with expected">Compare</div>` : ""}
                        <div id="received" class="selectable textarea"><pre></pre></div>
                    </div>
                </div>
            </div>
        </div>
    `
}

function actualAndDisplayed(base_64: string): ActualAndDisplayed {
    const text_ = Buffer.from(base_64, "base64").toString("utf-8")
    return {
        actual: text_,
        displayed: makeSpacesVisible(text_),
    }
}

export function htmlTestcaseMetadata(
    title: string,
    index: number,
    buttonIdPrefix: string
) {
    return `
        <div class="metadata">
            <div class="toggle-minimize">
                <div class="title">
                    <div class="icon">${chevronDown()}</div>
                    ${title} ${index}
                </div>
                <span class="running-text"></span>
            </div>
            <div id="${buttonIdPrefix}-${index}" class="run-button" title="Run this testcase only">
                <div class="icon">${icons["run"]()}</div>
                <span>Run</span>
            </div>
        </div>
    `
}

function htmlTestcaseIOContainer(
    title: string,
    { actual, displayed }: ActualAndDisplayed,
    options: { copyToClipboard?: boolean; cssClass?: string }
) {
    const copyToClipboardButton = options.copyToClipboard
        ? `<div class="clipboard" title="Copy to clipboard">Copy</div>`
        : ``

    return `
        <div class="container ${options.cssClass || ""}">
            <div class="title">${title}</div>
            ${copyToClipboardButton}    
            <div id="input" class="selectable textarea">
                <pre data-original-text="${actual}">${displayed}</pre>
            </div>
        </div>    
    `
}

export function htmlForTestcase(testcase: Testcase, index: number): string {
    const input = actualAndDisplayed(testcase.input_b64)
    const output = actualAndDisplayed(testcase.correct_b64)

    return /*html*/ `
        <div class="testcase normal" id="testcase-${index + 1}">
            ${htmlTestcaseMetadata("Testcase", index + 1, "run-testcase")}
            <div class="content">
                ${htmlTestcaseIOContainer("Input", input, { copyToClipboard: true })}
                <div class="two-column">
                    ${htmlTestcaseIOContainer("Expected Output", output, {
                        copyToClipboard: true,
                        cssClass: "expected",
                    })}
                    <div class="container received">
                        <div class="title">Received Output:</div>
                        <div class="compare-diff" title="Compare with expected">Compare</div>
                        <div id="received" class="selectable textarea"><pre></pre></div>
                    </div>
                </div>
            </div>
        </div>
    `
}

export function htmlForCustomTestcase(customTestcase: CustomTestcase) {
    const { index, input: text } = customTestcase
    const input = {
        actual: text,
        displayed: makeSpacesVisible(text),
    }

    return /*html*/ `
        <div class="testcase custom" id="custom-testcase-${index}">
            ${htmlTestcaseMetadata("Custom Testcase", index, "run-custom-testcase")}
            <div class="content">
                <div class="two-column">
                    ${htmlTestcaseIOContainer("Input", input, { copyToClipboard: true })}
                    <div class="container received">
                        <div class="title">Received Output:</div>
                        <div id="received" class="selectable textarea"><pre></pre></div>
                    </div>
                </div>
            </div>
        </div>
    `
}

export function htmlNotSupportedHandler() {
    return /*html*/ `
        <div class="testcases">
            <div class="header">
                <h2 class="flex-grow-1">Testcases</h2>
            </div>
            <div class="panels">
                <div class="warning">
                    ${warningIcon()}
                    <span>Local testcase running is not supported for this problem.</span>
                </div>
            </div>
        </div>
      `
}

export function htmlTestcases(
    testcases: Testcase[],
    problemHandler: ProblemHandler | null
): string {
    let handler: string = problemHandler?.handler || ""
    if (handler !== "std") {
        return htmlNotSupportedHandler()
    }
    return /*html*/ `
        <vscode-divider></vscode-divider>
        <div class="header">
            <h2 class="flex-grow-1">Testcases</h2>
            <div class="buttons">
                ${htmlButton({
                    id: "run-all-testcases",
                    text: "Run All",
                    title: "Run all testscases",
                    icon: "run-all",
                })}
            </div>
        </div>
        <div class="panels">
            ${testcases.map(htmlForTestcase).join("") || "No testcases found."}
        </div>
    `
}

export function htmlCustomTestcases(customTestcases: CustomTestcase[]) {
    if (!customTestcases) {
        return ""
    }
    return `
        <vscode-divider></vscode-divider>
        <div class="header">
            <h2 class="flex-grow-1">Custom Testcases</h2>
            <div class="buttons">
                ${htmlButton({
                    id: "add-new-testcase",
                    text: "Add new testcase",
                    title: "Add new testcase",
                    icon: "add",
                })}
            </div>
        </div>
        <div class="panels" id="custom-testcases">
            ${customTestcases.map(htmlForCustomTestcase).join("")}
        </div>
    `
}

function htmlSubmitButton() {
    return `
        <div class="flex flex-row justify-end mt-4">
            <div class="buttons">
                ${htmlButton({
                    id: "submit-to-jutge",
                    text: "Submit to Jutge",
                    title: "Submit file to Jutge.org",
                    icon: "submit",
                    disabled: false,
                })}
            </div>
        </div>
    `
}

function htmlExistingFileButton(data: WebviewHTMLData) {
    if (!data.fileExists) {
        return ""
    }
    return htmlButton({
        text: "Open Existing File",
        id: "open-file",
        title: "Open an existing file",
    })
}

function htmlHead({ cspSource, nonce, styleUri }: WebviewHTMLData) {
    return `
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <meta http-equiv="Content-Security-Policy" 
                content="
                    default-src 'none';
                    style-src ${cspSource} 'unsafe-inline' data:;
                    script-src 'nonce-${nonce}' ${cspSource} https://cdn.jsdelivr.net/npm/mathjax@3/;
                    img-src ${cspSource} https: data:;
                    font-src ${cspSource} https://cdn.jsdelivr.net/npm/mathjax@3/;
                ">
            <link rel="stylesheet" href="${styleUri}" />
            <style>body { font-size: 0.9rem; }</style>
        </head>`
}

export type WebviewHTMLData = {
    problemId: string
    problemNm: string
    problemTitle: string
    statementHtml: string
    testcases: Testcase[]
    customTestcases: CustomTestcase[]
    handler: ProblemHandler | null
    fileExists: boolean
    nonce: string
    styleUri: Uri
    scriptUri: Uri
    cspSource: string
}
export function htmlWebview(data: WebviewHTMLData) {
    const {
        handler,
        problemNm,
        problemId,
        problemTitle,
        testcases,
        customTestcases,
        statementHtml,
    } = data

    return `
        <!DOCTYPE html>
        <html lang="en">
            ${htmlHead(data)}
            <body>
                <div id="data" data-problem-nm="${problemNm}" data-title="${problemTitle}" />
                <section id="header" class="component-container">
                    <h2 id="problem-nm" class="font-normal text-md flex-grow-1">
                        <a href="https://jutge.org/problems/${problemId}">${problemId}</a>
                        &ndash; ${handler?.handler || "?"} 
                        &ndash; ${handler?.source_modifier || "?"} 
                        &ndash; ${handler?.compilers || "?"}
                    </h2>
                    ${htmlExistingFileButton(data)}
                    ${htmlButton({
                        text: "New File",
                        id: "new-file",
                        title: "Create new code file",
                        icon: "add",
                    })}
                </section>

                <section id="statement" class="component-container">
                    ${statementHtml}
                </section>

                <section id="testcases" class="testcases component-container">
                    ${htmlTestcases(testcases, handler)}
                </section>

                ${htmlSubmitButton()}

                <section id="custom-testcases" class="testcases component-container">
                    ${htmlCustomTestcases(customTestcases)}
                </section>


                <script type="module" nonce="${data.nonce}" src="${data.scriptUri}"></script>
            </body>
        </html>
    `
}
