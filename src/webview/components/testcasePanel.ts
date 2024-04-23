import { Testcase } from '../../types';


export function generateTestcasePanels(problemTestcases: Testcase[]): string {
  const testcasePanels = problemTestcases.map((testcase, index) => {
    const inputDecoded = Buffer.from(testcase.input_b64, 'base64').toString('utf-8');
    const correctDecoded = Buffer.from(testcase.correct_b64, 'base64').toString('utf-8');
    return /*html*/ `
      <div class="case" id="testcase-${index + 1}">
        <div class="testcase-metadata">
          <div class="toggle-minimize">
            <span class="case-number case-title">
              <span class="icon">
                <i class="codicon codicon-chevron-down"></i>
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
  }).join('')

  return /*html*/ `
    <div class="testcase-panels">
      ${testcasePanels}
    </div>
  `;
}
