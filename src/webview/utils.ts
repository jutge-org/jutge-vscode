/**
 * Makes invisible characters visible for display
 * @param str Input string
 * @returns String with special characters made visible
 */
export function makeSpecialCharsVisible(str: string): string {
    if (!str) {
        return ""
    }

    return str
        .replace(/\n/g, "↵\n") // Show newlines with symbol and actual break
        .replace(/ /g, "·") // Show spaces as middle dots
        .replace(/\t/g, "→   ") // Show tabs as arrow and spaces
        .replace(/\r/g, "⏎") // Show carriage returns
}
