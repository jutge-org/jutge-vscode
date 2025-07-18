import { Testcase } from "@/jutge_api_client"
import { CustomTestcase, ProblemHandler } from "@/types"
import { Button } from "@/webview/components/button"
import { chevronDown, warningIcon } from "@/webview/components/icons"
import { makeSpacesVisible } from "@/webview/utils"
import { Uri } from "vscode"

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
                <div className="run-button">
                    ${Button({
                        text: "",
                        id: props.runId,
                        title: "Run this testcase only",
                        icon: "run",
                    })}
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

export function htmlForTestcase(testcase: Testcase, index: number): string {
    const inputDecoded = Buffer.from(testcase.input_b64, "base64").toString("utf-8")
    const correctDecoded = Buffer.from(testcase.correct_b64, "base64").toString("utf-8")

    const inputDisplayed = makeSpacesVisible(inputDecoded)
    const correctDisplayed = makeSpacesVisible(correctDecoded)

    return htmlForTestcaseCommon(
        "normal",
        { actual: inputDecoded, displayed: inputDisplayed },
        { actual: correctDecoded, displayed: correctDisplayed },
        index + 1
    )
}

export function htmlForCustomTestcase(customTestcase: CustomTestcase, index: number) {
    const { input } = customTestcase
    const inputDisplayed = makeSpacesVisible(customTestcase.input)

    return htmlForTestcaseCommon(
        "custom",
        { actual: input, displayed: inputDisplayed },
        undefined,
        index + 1
    )
}

export function htmlForAllTestcases(
    problemTestcases: Testcase[],
    customTestcases: CustomTestcase[] | null,
    problemHandler: ProblemHandler | null
): string {
    let handler: string = problemHandler?.handler || ""
    if (handler !== "std") {
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
    if (!problemTestcases || problemTestcases.length === 0) {
        return /*html*/ `
            <div class="testcases">
                <div class="header">
                    <h2 class="flex-grow-1">Testcases</h2>
                    <div class="buttons">
                        ${Button({
                            id: "submit-to-jutge",
                            text: "Submit to Jutge",
                            title: "Submit file to Jutge.org",
                            icon: "submit",
                            disabled: false,
                        })}
                    </div>
                </div>
                <div class="panels">
                    No testcases found.
                </div>
            </div>
        `
    }
    return /*html*/ `
        <div class="testcases">
            <div class="header">
                <h2 class="flex-grow-1">Testcases</h2>
                <div class="buttons">
                    ${Button({
                        id: "run-all-testcases",
                        text: "Run All",
                        title: "Run all testscases",
                        icon: "run-all",
                    })}
                </div>
            </div>
            <div class="panels">
                ${problemTestcases.map(htmlForTestcase).join("")}
            </div>
            
            <div class="header">
                <h2 class="flex-grow-1">Custom Testcases</h2>
                <div class="buttons">
                    ${Button({
                        id: "add-new-testcase",
                        text: "Add new testcase",
                        title: "Add new testcase",
                        icon: "add",
                    })}
                </div>
            </div>
            ${
                customTestcases &&
                `<div class="panels">
                    ${customTestcases.map(htmlForCustomTestcase).join("")}
                </div>`
            }

            <div class="flex flex-row justify-end mt-4">
                <div class="buttons">
                    ${Button({
                        id: "submit-to-jutge",
                        text: "Submit to Jutge",
                        title: "Submit file to Jutge.org",
                        icon: "submit",
                        disabled: false,
                    })}
                </div>
            </div>
        </div>
    `
}

type WebviewHTMLData = {
    problemId: string
    problemNm: string
    problemTitle: string
    statementHtml: string
    testcasesHtml: string
    handler: ProblemHandler | null
    fileExists: boolean
    nonce: string
    styleUri: Uri
    scriptUri: Uri
    cspSource: string
}
export function htmlForWebview(data: WebviewHTMLData) {
    return `
        <!DOCTYPE html>
        <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <meta http-equiv="Content-Security-Policy" 
                    content="
                        default-src 'none';
                        style-src ${data.cspSource} 'unsafe-inline' data:;
                        script-src 'nonce-${data.nonce}' ${data.cspSource} https://cdn.jsdelivr.net/npm/mathjax@3/;
                        img-src ${data.cspSource} https: data:;
                        font-src ${data.cspSource} https://cdn.jsdelivr.net/npm/mathjax@3/;
                    ">
                <link rel="stylesheet" href="${data.styleUri}" />
                <style>body { font-size: 0.9rem; }</style>
            </head>
            <body>
                <div id="data" data-problem-nm="${data.problemNm}" data-title="${data.problemTitle}" />
                <section id="header" class="component-container">
                    <h2 id="problem-nm" class="font-normal text-md flex-grow-1">
                        <a href="https://jutge.org/problems/${data.problemId}">${data.problemId}</a>
                        &ndash; ${data.handler?.handler} 
                        &ndash; ${data.handler?.source_modifier} 
                        &ndash; ${data.handler?.compilers}
                    </h2>
                    ${
                        data.fileExists
                            ? Button({
                                  text: "Open Existing File",
                                  id: "open-file",
                                  title: "Open an existing file",
                              })
                            : ""
                    }
                    ${Button({
                        text: "New File",
                        id: "new-file",
                        title: "Create new code file",
                        icon: "add",
                    })}
                </section>
                <section id="statement" class="component-container">
                    ${data.statementHtml}
                </section>
                <vscode-divider></vscode-divider>
                <section id="testcases" class="component-container">
                    ${data.testcasesHtml}
                </section>
                <script type="module" nonce="${data.nonce}" src="${data.scriptUri}"></script>
            </body>
        </html>
    `
}
