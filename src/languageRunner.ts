import * as vscode from 'vscode';
import { execSync } from 'child_process';

export interface LanguageRunner {
	run(codePath: string, input: string): string;
}

export class PythonRunner implements LanguageRunner {
	run(codePath: string, input: string): string {
		const pythonCommand = vscode.workspace.getConfiguration("jutge-vscode").get("runner.python.command") as string;
		const flags = vscode.workspace.getConfiguration("jutge-vscode").get("runner.python.flags") as string;
		const command = `${pythonCommand} ${codePath} ${flags}`;
		// TODO: Probably can do it async.
		// WARN: No idea if execSync works in Windows.
		const result = execSync(command, { input: input });
		return result.toString();
	}
}

export class CppRunner implements LanguageRunner {
	compile(codePath: string, binaryPath: string): void {
		const cppCommand = vscode.workspace.getConfiguration("jutge-vscode").get("runner.cpp.command") as string;
		const flags = vscode.workspace.getConfiguration("jutge-vscode").get("runner.cpp.flags") as string[];
		const flagsString = flags.join(" ");
		const command = `${cppCommand} ${codePath} -o ${binaryPath} ${flagsString}`;
		// TODO: Handle compilation errors
		execSync(command);
	}
	run(codePath: string, input: string): string {
		const binaryPath = codePath + ".out";
		this.compile(codePath, binaryPath);
		const command = `${binaryPath}`;
		const result = execSync(command, { input: input });
		return result.toString();
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
