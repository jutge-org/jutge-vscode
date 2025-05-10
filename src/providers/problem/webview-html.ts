import { Testcase } from "@/jutge_api_client"
import { Button } from "@/webview/components/button"
import { warningIcon } from "@/webview/components/icons"
import { makeSpacesVisible } from "@/webview/utils"
import { Uri } from "vscode"

export function htmlForTestcase(testcase: Testcase, index: number): string {
    const inputDecoded = Buffer.from(testcase.input_b64, "base64").toString("utf-8")
    const correctDecoded = Buffer.from(testcase.correct_b64, "base64").toString("utf-8")

    const inputDisplayed = makeSpacesVisible(inputDecoded)
    const correctDisplayed = makeSpacesVisible(correctDecoded)

    return /*html*/ `
        <div class="case" id="testcase-${index + 1}">
            <div class="metadata">
                <div class="toggle-minimize">
                    <span class="title">
                        <span class="icon">
                            <i class="codicon codicon-chevron-up"></i>
                        </span>
                        Testcase ${index + 1}
                    </span>
                    <span class="running-text"></span>
                </div>
                <div className="time">
                    ${Button("", "run-again", `run-testcase-${index + 1}`, "Run Again")}
                </div>
            </div>

            <div class="content">
                <div class="container input-div">
                    <div class="title">Input:</div>
                    <div class="clipboard" title="Copy to clipboard">Copy</div>
                    <div id="input" class="selectable textarea">
                        <pre data-original-text="${inputDecoded}">${inputDisplayed}</pre>
                    </div>
                </div>
                <div class="container expected">
                    <div class="title">Expected Output:</div>
                    <div class="clipboard" title="Copy to clipboard">Copy</div>
                    <div id="expected" class="selectable textarea">
                        <pre data-original-text="${correctDecoded}">${correctDisplayed}</pre>
                    </div>
                </div>
                <div class="container received">
                    <div class="title">Received Output:</div>
                    <div class="compare-diff" title="Compare with expected">Compare</div>
                    <div id="received" class="selectable textarea"><pre></pre></div>
                </div>
            </div>
        </div>
    `
}

export function htmlForAllTestcases(problemTestcases: Testcase[], handler: string | null): string {
    if (handler !== "std") {
        return /*html*/ `
            <div class="testcase-header">
                <h2 class="flex-grow-1">Testcases</h2>
            </div>
            <div class="warning">
                ${warningIcon()}
                <span>Local testcase running is not supported for this problem.</span>
            </div>
      `
    }
    if (!problemTestcases || problemTestcases.length === 0) {
        return /*html*/ `
            <div class="testcase-header">
                <h2 class="flex-grow-1">Testcases</h2>
                No testcases found.
            </div>
        `
    }
    return /*html*/ `
        <div class="testcase-header">
            <h2 class="flex-grow-1">Testcases</h2>
            ${Button("Run All", "run-all", "run-all-testcases")}
            ${Button("Submit to Jutge", "submit", "submit-to-jutge")}
        </div>
        <div class="testcase-panels">
            ${problemTestcases.map(htmlForTestcase).join("")}
        </div>
    `
}

type WebviewHTMLData = {
    problemNm: string
    problemTitle: string
    statementHtml: string
    testcasesHtml: string
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
                    <h2 id="problem-nm" class="font-normal flex-grow-1">${data.problemNm}</h2>
                    ${Button("New File", "add", "new-file")}
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
