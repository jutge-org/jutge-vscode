import { Testcase } from "../../types";

const runAllButton = /*html*/ `
      <vscode-button id="run-all-testcases">
        Run All
        <span slot="start" class="codicon codicon-run-all"></span>
      </vscode-button>`;

const submitToJutgeButton =
  /*html*/
  `<vscode-button id="submit-to-jutge">
      Submit to Jutge
      <span slot="start" class="codicon codicon-cloud-upload"></span>
   </vscode-button>`;

export function generateTestcasePanels(problemTestcases: Testcase[]): string {
  if (problemTestcases.length === 0) {
    return /*html*/ `
      <div class="testcase-header">
        <h2 class="flex-grow-1">Testcases</h2>
        No testcases found.
      </div>`;
  }

  const testcasePanels = problemTestcases
    .map((testcase, index) => {
      const inputDecoded = Buffer.from(testcase.input_b64, "base64").toString("utf-8");
      const correctDecoded = Buffer.from(testcase.correct_b64, "base64").toString("utf-8");
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
            <button class="btn btn-green" title="Run Again" id="run-testcase-${index + 1}">
              <span class="codicon codicon-debug-restart"></span>
            </button>
          </div>
        </div>

        <div class="testcase-content">
          <div class="textarea-container input-div">
            Input:
            <div class="clipboard" title="Copy to clipboard">Copy</div>
            <div id="input" class="selectable case-textarea"><pre>${inputDecoded}</pre></div>
          </div>
          <div class="textarea-container expected-div">
            Expected Output:
            <div class="clipboard" title="Copy to clipboard">Copy</div>
            <div id="expected" class="selectable case-textarea"><pre>${correctDecoded}</pre></div>
          </div>
          <div class="textarea-container received-div">
            Received Output:
            <div class="clipboard" title="Copy to clipboard">Copy</div>
            <div id="received" class="selectable case-textarea"><pre></pre></div>
          </div>
        </div>
      </div>
    </div>
        `;
    })
    .join("");

  return /*html*/ `
    <div class="testcase-header">
      <h2 class="flex-grow-1">Testcases</h2>
      ${runAllButton}
      ${submitToJutgeButton}
    </div>
    <div class="testcase-panels">
        ${testcasePanels}
    </div>
    `;
}
