import { LanguageCode } from "@/types"
import { StaticLogger } from "@/utils"
import { PythonExtension } from "@vscode/python-extension"
import * as vscode from "vscode"

export class ConfigService extends StaticLogger {
    private static pythonApi: PythonExtension | null = null

    public static initialize(): void {
        PythonExtension.api().then((api) => (ConfigService.pythonApi = api))
    }

    private static get python() {
        if (ConfigService.pythonApi === null) {
            throw new Error(`Trying to use python API before it was loaded`)
        }
        return ConfigService.pythonApi
    }

    private static get config() {
        return vscode.workspace.getConfiguration("jutge-vscode")
    }

    private static getString(key: string): string {
        let config = ConfigService.config.get<string>(key)
        if (config === undefined || config === "") {
            vscode.window.showWarningMessage(`Warning: '${key}' setting is undefined.`)
            config = "<undefined>" // set to default
        }
        return config
    }

    private static getStringArray(key: string): Array<string> {
        let config = ConfigService.config.get<Array<string>>(key)
        if (config === undefined) {
            vscode.window.showWarningMessage(`Warning: '${key}' setting is undefined.`)
            config = ["-u"] // set to default
        }
        return config
    }

    public static getPythonCommand(): string {
        const env = ConfigService.python.environments.getActiveEnvironmentPath()
        this.log.debug(`[ConfigService] Python environment is: "${env.path}"`)
        return env.path
    }

    public static getPythonFlags(): Array<string> {
        return ConfigService.getStringArray("runner.python.flags")
    }

    public static getCppCommand(): string {
        return ConfigService.getString("runner.cpp.command")
    }

    public static getCppFlags(): string {
        return ConfigService.getString("runner.cpp.flags")
    }

    public static getPreferredLang(): string {
        return ConfigService.getString("problem.preferredLang")
    }

    private static codes: Record<string, LanguageCode> = {
        Català: LanguageCode.ca,
        Castellano: LanguageCode.es,
        English: LanguageCode.en,
        Français: LanguageCode.fr,
        Deutsch: LanguageCode.de,
    }

    public static getPreferredLangId(): LanguageCode {
        return this.codes[this.getPreferredLang()] || "??"
    }
}
