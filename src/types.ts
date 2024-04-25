export type Testcase = {
  name: string;
  input_b64: string;
  correct_b64: string;
};

export enum TestcaseStatus {
  RUNNING = "running",
  PASSED = "passed",
  FAILED = "failed",
}

export type Problem = {
  problem_id: string;
  problem_nm: string;
  title: string;
  language_id: null | string;
  statementHtml: string | null;
  testcases: Testcase[] | null;
};

export type VSCodeToWebviewMessage = {
  command: VSCodeToWebviewCommand;
  data: any;
};

export enum VSCodeToWebviewCommand {
  UPDATE_TESTCASE = "update-testcase",
}

export type WebviewToVSCodeMessage = {
  command: WebviewToVSCodeCommand;
  data: any;
};

export enum WebviewToVSCodeCommand {
  SUBMIT_TO_JUTGE = "submit-to-jutge",
  RUN_ALL_TESTCASES = "run-all-testcases",
  RUN_TESTCASE = "run-testcase",
}
