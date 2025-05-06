/**
 * Makes invisible characters visible for display
 * @param str Input string
 * @returns String with special characters made visible
 */
export function makeSpecialCharsVisible(str: string): string {
    let result = ""
    for (const ch of str) {
        switch (ch) {
            case " ":
                result += `<span class="text-muted">·</span>`
                break
            case "\n":
                result += `<span class="text-muted">↵</span> <br>`
                break
            case "\t":
                result += `<span class="text-muted">  →  </span>`
                break
            case "\r":
                result += `<span class="text-muted">⏎</span>`
                break
            default:
                result += ch
        }
    }
    return result
}
