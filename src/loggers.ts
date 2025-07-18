type LoggerKind = "debug" | "info" | "warn" | "error"
const allKinds: LoggerKind[] = ["debug", "info", "warn", "error"]

export class Logger {
    get log() {
        const _class = this.constructor.name

        const logger =
            (kind: LoggerKind) =>
            (...msgs: any[]) =>
                console[kind](`[${_class}]:`, ...msgs)

        return Object.fromEntries(allKinds.map((kind) => [kind, logger(kind)]))
    }
}

export class StaticLogger {
    static get log() {
        const _class = this.name

        const logger =
            (kind: LoggerKind) =>
            (...msgs: any[]) =>
                console[kind](`[${_class}]:`, ...msgs)

        return Object.fromEntries(allKinds.map((kind) => [kind, logger(kind)]))
    }
}
