import { Testcase } from "@/jutge_api_client"
import { CustomTestcase, ProblemHandler } from "@/types"
import { Button as htmlButton } from "@/webview/components/button"
import { chevronDown, icons, warningIcon } from "@/webview/components/icons"
import { makeSpacesVisible } from "@/webview/utils"
import { Uri } from "vscode"

type ActualAndDisplayed = {
    actual: string
    displayed: string
}

function actualAndDisplayed(base_64: string): ActualAndDisplayed {
    const text_ = Buffer.from(base_64, "base64").toString("utf-8")
    return {
        actual: text_,
        displayed: makeSpacesVisible(text_),
    }
}

export function htmlTestcaseMetadata(title: string, index: number, children: string) {
    return `
        <div class="metadata select-none">
            <div class="toggle-minimize">
                <div class="title">
                    <div class="icon">${chevronDown()}</div>
                    ${title} ${index}
                </div>
                <span class="running-text"></span>
            </div>
            ${children}
        </div>
    `
}

function htmlTestcaseRawTextContainer(
    title: string,
    { actual, displayed }: ActualAndDisplayed,
    options: { copyToClipboard?: boolean; cssClass?: string }
) {
    const copyToClipboardButton = options.copyToClipboard
        ? `<div class="text-button copy-to-clipboard" title="Copy to clipboard">Copy</div>`
        : ``

    return `
        <div class="container ${options.cssClass || ""}">
            <div class="title">
                ${title}
                ${copyToClipboardButton}
            </div>
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
        <div class="testcase normal" id="testcase-${index + 1}" data-type="std">
            ${htmlTestcaseMetadata(
                "Testcase",
                index + 1,
                `<div id="run-testcase-${index + 1}" class="small-button" title="Run this testcase only">
                    <div class="icon">${icons["run"]()}</div>
                    <span>Run</span>
                </div>`
            )}
            <div class="content">
                ${htmlTestcaseRawTextContainer("Input", input, { copyToClipboard: true })}
                <div class="two-column">
                    ${htmlTestcaseRawTextContainer("Expected Output", output, {
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

function htmlTestcaseGraphicContainer(
    type: "input" | "output" | "received",
    title: string,
    image_b64: string,
    cssClasses?: string,
    compare: boolean = false
) {
    return `
        <div class="container ${cssClasses}">
            <div class="title">${title}</div>
            ${compare ? `<div class="compare-diff" title="Compare with expected">Compare</div>` : ``}
            <div id="${type}" class="imagearea">
                ${image_b64 ? `<img src="data:image/png;base64,${image_b64}" />` : ``}
            </div>
        </div>
    `
}

export function htmlForGraphicTestcase(testcase: Testcase, index: number): string {
    const input = actualAndDisplayed(testcase.input_b64)
    const output_b64 = testcase.correct_b64

    return /*html*/ `
        <div class="testcase normal" id="testcase-${index + 1}" data-type="graphic">
            ${htmlTestcaseMetadata(
                "Testcase",
                index + 1,
                `<div id="run-testcase-${index + 1}" class="small-button" title="Run this testcase only">
                    <div class="icon">${icons["run"]()}</div>
                    <span>Run</span>
                </div>`
            )}
            <div class="content">
                ${htmlTestcaseRawTextContainer("Input", input, { copyToClipboard: true })}
                <div class="two-column">
                    ${htmlTestcaseGraphicContainer("output", "Expected Output", output_b64, "expected")}
                    ${htmlTestcaseGraphicContainer("received", "Received Output", "", "received", true)}
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
        <div class="testcase custom" id="custom-testcase-${index}" data-type="custom-std">
            ${htmlTestcaseMetadata(
                "Testcase",
                index,
                `<div id="edit-testcase-${index}" class="small-button" title="Edit this testcase">
                    <div class="icon">${icons["edit"]()}</div>
                    <span>Edit</span>
                </div>
                <div id="run-custom-testcase-${index}" class="small-button" title="Run this testcase only">
                    <div class="icon">${icons["run"]()}</div>
                    <span>Run</span>
                </div>`
            )}
            <div class="content">
                <div class="two-column">
                    ${htmlTestcaseRawTextContainer("Input", input, { copyToClipboard: true })}
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
            <div class="header select-none">
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

export function htmlTestcaseHeader(title: string) {
    return `
        <h2>
            ${title}
            <span class="text-button collapse-testcases select-none">
                Collapse All
            </span>
        </h2>
    `
}

export function htmlTestcases(
    testcases: Testcase[],
    problemHandler: ProblemHandler | null
): string {
    let handler: string = problemHandler?.handler || ""
    switch (handler) {
        case "std": {
            return /*html*/ `
                <vscode-divider></vscode-divider>
                <div class="header">
                    ${htmlTestcaseHeader("Testcases")}
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
        case "graphic": {
            return `
                <vscode-divider></vscode-divider>
                <div class="header">
                    ${htmlTestcaseHeader("Testcases")}
                    <div class="buttons">
                        ${htmlButton({
                            id: "run-all-testcases",
                            text: "Run All",
                            title: "Run all testcases",
                            icon: "run-all",
                        })}
                    </div>
                </div>
                <div class="panels">
                    ${testcases.map(htmlForGraphicTestcase).join("") || "No testcases found."}
                </div>
            `
        }
        default:
            return htmlNotSupportedHandler()
    }
}

export function htmlCustomTestcases(customTestcases: CustomTestcase[]) {
    if (!customTestcases) {
        return ""
    }
    return `
        <vscode-divider></vscode-divider>
        <div class="header">
            ${htmlTestcaseHeader("Custom Testcases")}
        </div>
        <div class="panels">
            ${customTestcases.map(htmlForCustomTestcase).join("")}
        </div>
        <div class="flex flex-row justify-end mt-4">
            <div class="buttons">
                ${htmlButton({
                    id: "add-new-testcase",
                    text: "Add new testcase",
                    title: "Add new testcase",
                    icon: "add",
                })}
            </div>
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
        id: "open-existing-file",
        title: "Open an existing file",
    })
}

function htmlHead(data: WebviewHTMLData) {
    const { cspSource, nonce, styleUri } = data
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
            <script id="webview-html-data" type="application/json">${JSON.stringify(data)}</script> 
            <style>body { font-size: 0.9rem; }</style>
        </head>`
}

export type WebviewHTMLData = {
    problemUrl: string
    problemId: string
    problemNm: string
    caption?: string
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
        caption,
        problemUrl,
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
                        <a href="${problemUrl}">${caption ? `${caption}:` : ``}${problemId}</a>
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

                <section id="normal-testcases" class="testcases component-container">
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
