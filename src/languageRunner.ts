import * as childProcess from "child_process";
import * as vscode from "vscode";
import { channel, channelAddLineAndShow } from "./channel";
import { Language } from "./types";
import { getWorkingDirectory } from "./utils";
import { ConfigService } from "./services/ConfigService";

export interface LanguageRunner {
    run(codePath: string, input: string): string | null
}

export class PythonRunner implements LanguageRunner {
    run(codePath: string, input: string): string | null {
        const command = ConfigService.getPythonCommand();
        const flags = ConfigService.getPythonFlags();
        const workingDir = getWorkingDirectory(codePath);

        // TODO: Re-implement asynchronously?
        // TODO: Check that this works on Windows.
        const result = childProcess.spawnSync(command, [...flags, codePath], {
            input,
            timeout: 5000,
            cwd: workingDir,
        });

        handleRuntimeErrors(result);

        if (result.stdout) {
            return result.stdout.toString();
        }

        return null; // no output
    }
}

export class CppRunner implements LanguageRunner {
    compile(codePath: string, binaryPath: string): void {
        const command = ConfigService.getCppCommand();
        const flags = ConfigService.getCppFlags();
        const result = childProcess.spawnSync(command, [codePath, "-o", binaryPath, ...flags]);
        handleCompilationErrors(result);
    }

    run(codePath: string, input: string): string | null {
        const binaryPath = codePath + ".out";
        this.compile(codePath, binaryPath);
        const command = `${binaryPath}`;
        const result = childProcess.spawnSync(command, { input, timeout: 5000 });
        handleRuntimeErrors(result);
        if (result.stdout) {
            return result.stdout.toString();
        }
        return null;
    }
}

export function getLangIdFromFilePath(filePath: string): Language {
    const extension = filePath.split(".").pop();
    switch (extension) {
        case "py":
            return Language.PYTHON;
        case "cc":
        case "cpp":
            return Language.CPP;
        default:
            vscode.window.showErrorMessage("Language not supported.");
            throw new Error("Language not supported.");
    }
}

export function getDefaultExtensionFromLangId(languageId: Language): string {
    switch (languageId) {
        case Language.PYTHON:
            return "py";
        case Language.CPP:
            return "cc";
        default:
            vscode.window.showErrorMessage("Language not supported.");
            throw new Error("Language not supported.");
    }
}

export function getLangRunnerFromLangId(languageId: Language): LanguageRunner {
    // NOTE: Not sure if vscode has native functionality to detect the language of a file.
    switch (languageId) {
        case Language.PYTHON:
            return new PythonRunner();
        case Language.CPP:
            return new CppRunner();
        default:
            vscode.window.showErrorMessage("Language not supported.");
            throw new Error("Language not supported.");
    }
}

/**
 * Handles errors that occur during the **runtime execution** of a process.
 * For more information, see `childProcess.spawnSync()` docs.
 *
 * @param result The result of the process execution.
 * @throws Error if any error is found.
 */
function handleRuntimeErrors(result: childProcess.SpawnSyncReturns<Buffer>) {
    // Check error first: it can exist with stderr or status being null
    if (result.error) {
        let message = result.error.toString();
        if (result.error.toString().includes("ETIMEDOUT")) {
            message =
                `Execution timed out.\n` +
                `If you think this is a mistake, please increase the timeout time in the settings.`;
        }
        channelAddLineAndShow(message);
        return;
    }

    if (result.signal) {
        channelAddLineAndShow(`Process killed by the OS with signal ${result.signal}.`);
        return;
    }

    if (result.stderr.length > 0) {
        channelAddLineAndShow(result.stderr.toString());
        return;
    }

    if (result.status !== 0) {
        channelAddLineAndShow(`Exited with code ${result.status}.`);
        return;
    }
}

/**
 * Handles errors that occur during the **compilation** of a process.
 * Similar to `handleRuntimeErrors`, but does not throw if stderr is not empty.
 * For more information, see `childProcess.spawnSync()` docs.
 *
 * @param result The result of the process execution.
 * @throws Error if any error is found.
 */
function handleCompilationErrors(result: childProcess.SpawnSyncReturns<Buffer>) {
    // Always show stderr, but do not consider it an error.
    channel.appendLine(result.stderr.toString());

    if (result.status !== 0 || result.error || result.signal) {
        // The process execution failed.
        if (result.error) {
            channelAddLineAndShow(result.error.toString());
        }
        // Signal exists if the process is killed by the OS (in some edge cases).
        else if (result.signal) {
            channelAddLineAndShow(`Process killed by the OS with signal ${result.signal}.`);
        }

        throw Error(`Execution Failed: ${result.stderr.toString()}`);
    }
}
