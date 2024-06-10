import { PythonExtension } from "@vscode/python-extension"
import * as vscode from "vscode"
import { channel } from "./channel"

class Config {
    #pythonApi: PythonExtension | null = null

    constructor() {
        PythonExtension.api().then((api) => (this.#pythonApi = api)) // <-- UGLY :(
    }

    get #python() {
        if (this.#pythonApi === null) {
            throw new Error(`Trying to use python API before it was loaded`)
        }
        return this.#pythonApi
    }

    get #config() {
        return vscode.workspace.getConfiguration("jutge-vscode")
    }

    #getString(key: string) {
        let config = this.#config.get<string>(key)
        if (config === undefined || config === "") {
            vscode.window.showWarningMessage(`Warning: '${key}' setting is undefined.`)
            config = "python3" // set to default
        }
        return config
    }

    #getStringArray(key: string) {
        let config = this.#config.get<Array<string>>(key)
        if (config === undefined) {
            vscode.window.showWarningMessage(`Warning: '${key}' setting is undefined.`)
            config = ["-u"] // set to default
        }
        return config
    }

    getPythonCommand(): string {
        const env = this.#python.environments.getActiveEnvironmentPath()
        channel.appendLine(`Python environment is: "${env.path}"`)
        return env.path
    }

    getPythonFlags(): Array<string> {
        return this.#getStringArray("runner.python.flags")
    }

    getCppCommand(): string {
        return this.#getString("runner.cpp.command")
    }

    getCppFlags(): string {
        return this.#getString("runner.cpp.flags")
    }

    getPreferredLand(): string {
        return this.#getString("problem.preferredLang")
    }
}

export default new Config()
