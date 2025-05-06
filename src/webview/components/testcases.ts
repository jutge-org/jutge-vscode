import { makeSpecialCharsVisible } from "../utils"
import { Button } from "./button"
import { warningIcon } from "./icons"
import { Testcase } from "../../jutge_api_client"

export function generateTestcasePanels(problemTestcases: Testcase[], handler: string | null): string {
    if (handler !== "std") {
        return /*html*/ `
      <div class="testcase-header">
        <h2 class="flex-grow-1">Testcases</h2>
        <div class="warning">
          ${warningIcon()}
          <span>Local testcase running is not supported for this problem.</span>
        </div>
      </div>`
    }

    if (problemTestcases.length === 0) {
        return /*html*/ `
      <div class="testcase-header">
        <h2 class="flex-grow-1">Testcases</h2>
        No testcases found.
      </div>`
    }

    const testcasePanels = problemTestcases
        .map((testcase, index) => {
            const inputDecoded = Buffer.from(testcase.input_b64, "base64").toString("utf-8")
            const correctDecoded = Buffer.from(testcase.correct_b64, "base64").toString("utf-8")

            const inputDisplayed = makeSpecialCharsVisible(inputDecoded)
            const correctDisplayed = makeSpecialCharsVisible(correctDecoded)

            return /*html*/ `
      <div class="case" id="testcase-${index + 1}">
        <div class="testcase-metadata">
          <div class="toggle-minimize">
            <span class="case-number case-title">
              <span class="icon">
                <i class="codicon codicon-chevron-up"></i>
              </span>
              &nbsp;Testcase ${index + 1}
            </span>
            <span class="running-text"></span>
          </div>
          <div className="time">
            ${Button("", "run-again", `run-testcase-${index + 1}`, "Run Again")}
          </div>
        </div>

        <div class="testcase-content">
          <div class="textarea-container input-div">
            Input
            <div class="clipboard" title="Copy to clipboard">Copy</div>
            <div id="input" class="selectable case-textarea">
                <pre data-original-text="${inputDecoded}">${inputDisplayed}</pre>
            </div>
          </div>
          <div class="textarea-container expected-div">
            Expected Output
            <div class="clipboard" title="Copy to clipboard">Copy</div>
            <div id="expected" class="selectable case-textarea">
                <pre data-original-text="${correctDecoded}">${correctDisplayed}</pre>
            </div>
          </div>
          <div class="textarea-container received-div">
            Received Output
            <div class="clipboard" title="Copy to clipboard">Copy</div>
            <div class="compare-diff" title="Compare with expected">Compare</div>
            <div id="received" class="selectable case-textarea"><pre></pre></div>
          </div>
        </div>
      </div>
        `
        })
        .join("")

    return /*html*/ `
    <div class="testcase-header">
      <h2 class="flex-grow-1">Testcases</h2>
      ${Button("Run All", "run-all", "run-all-testcases")}
      ${Button("Submit to Jutge", "submit", "submit-to-jutge")}
    </div>
    <div class="testcase-panels">
        ${testcasePanels}
    </div>
    `
}
