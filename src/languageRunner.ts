import * as vscode from "vscode";
import * as child_process from "child_process";
import { channel } from "./channel";

export interface LanguageRunner {
  run(codePath: string, input: string): string;
}

export class PythonRunner implements LanguageRunner {
  run(codePath: string, input: string): string {
    const pythonCommand = vscode.workspace
      .getConfiguration("jutge-vscode")
      .get("runner.python.command") as string;
    const flags = vscode.workspace
      .getConfiguration("jutge-vscode")
      .get("runner.python.flags") as string;
    const command = `${pythonCommand}`;
    const args = [codePath, flags];
    // TODO: Probably can do it async.
    // WARN: No idea if spawnSync works in Windows. Maybe some special args need to be passed in.
    const result = child_process.spawnSync(command, args, { input: input, timeout: 5000 });
    handleRuntimeErrors(result);
    return result.stdout.toString();
  }
}

export class CppRunner implements LanguageRunner {
  compile(codePath: string, binaryPath: string): void {
    const cppCommand = vscode.workspace
      .getConfiguration("jutge-vscode")
      .get("runner.cpp.command") as string;
    const flags = vscode.workspace
      .getConfiguration("jutge-vscode")
      .get("runner.cpp.flags") as string[];
    const command = `${cppCommand}`;
    const args = [codePath, "-o", binaryPath, ...flags];
    const result = child_process.spawnSync(command, args);
    handleCompilationErrors(result);
  }
  run(codePath: string, input: string): string {
    const binaryPath = codePath + ".out";
    this.compile(codePath, binaryPath);
    const command = `${binaryPath}`;
    const result = child_process.spawnSync(command, { input: input, timeout: 5000 });
    handleRuntimeErrors(result);
    return result.stdout.toString();
  }
}

export function getLanguageRunnerFromExtension(extension: string): LanguageRunner {
  // NOTE: Not sure if vscode has native functionality to detect the language of a file.
  switch (extension) {
    case "py":
      return new PythonRunner();
    case "cc":
    case "cpp":
      return new CppRunner();
    default:
      vscode.window.showErrorMessage("Language not supported.");
      throw new Error("Language not supported.");
  }
}

/**
 * Handles errors that occur during the **runtime execution** of a process.
 * For more information, see `child_process.spawnSync()` docs.
 *
 * @param result The result of the process execution.
 * @throws Error if any error is found.
 */
function handleRuntimeErrors(result: child_process.SpawnSyncReturns<Buffer>) {
  if (result.stderr.length > 0 || result.status !== 0 || result.error || result.signal) {
    if (result.error) {
      // The process execution failed or timed out.
      if (result.error.toString().includes("ETIMEDOUT")) {
        // Timed out.
        channel.appendLine(
          "Execution timed out.\nIf you think this is a mistake, please increase the timeout time in the settings."
        );
      } else {
        // Any other system error.
        channel.appendLine(result.error.toString());
      }
    }
    // Signal exists if the process is killed by the OS (in some edge cases).
    else if (result.signal) {
      channel.appendLine(`Process killed by the OS with signal ${result.signal}.`);
    }
    // Always show stderr.
    channel.appendLine(result.stderr.toString());
    channel.show();
    throw Error(`Execution Failed: ${result.stderr.toString()}`);
  }
}

/**
 * Handles errors that occur during the **compilation** of a process.
 * Similar to `handleRuntimeErrors`, but does not throw if stderr is not empty.
 * For more information, see `child_process.spawnSync()` docs.
 *
 * @param result The result of the process execution.
 * @throws Error if any error is found.
 */
function handleCompilationErrors(result: child_process.SpawnSyncReturns<Buffer>) {
  // Always show stderr, but do not consider it an error.
  channel.appendLine(result.stderr.toString());

  if (result.status !== 0 || result.error || result.signal) {
    // The process execution failed.
    if (result.error) {
      channel.appendLine(result.error.toString());
    }
    // Signal exists if the process is killed by the OS (in some edge cases).
    else if (result.signal) {
      channel.appendLine(`Process killed by the OS with signal ${result.signal}.`);
    }
    channel.show();
    throw Error(`Execution Failed: ${result.stderr.toString()}`);
  }
}
