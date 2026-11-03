import * as vscode from "vscode"

/**
 * Matches the problem links written by `FileService.makeHeader` into the header
 * of every generated source file, e.g. `jutge://problems/P12345_ca`.
 */
const PROBLEM_LINK_PATTERN = /jutge:\/\/problems\/([A-Za-z0-9_]+)/
const PROBLEM_LINK_REGEX = new RegExp(PROBLEM_LINK_PATTERN.source, "g")

/**
 * Number of lines at the top of a document that are considered its header
 * (see `FileService.makeHeader`, which writes 5 of them).
 */
const HEADER_LINES = 10

/**
 * Returns the problem name of the `jutge://problems/<problem_id>` link in the
 * header of `document`, or `null` if there is none. Only the first
 * `HEADER_LINES` lines are inspected, so that a mention of a problem link
 * somewhere else in the file does not count as a header.
 */
export function problemNmFromHeader(document: vscode.TextDocument): string | null {
    const lastLine = Math.min(document.lineCount, HEADER_LINES)
    for (let line = 0; line < lastLine; line++) {
        const match = document.lineAt(line).text.match(PROBLEM_LINK_PATTERN)
        if (match) {
            return match[1]
        }
    }
    return null
}

/**
 * Makes `jutge://problems/<problem_id>` clickable in text editors. The links
 * open the problem panel through `jutge-vscode.openProblemForLink`, instead of
 * sending the user to the Jutge.org website.
 *
 * Note that the built-in link detector only recognizes `http(s)`, `file` and
 * similar schemes, so it ignores `jutge:` links entirely: there is no overlap
 * and no need to disable the default provider.
 */
export class ProblemLinkProvider implements vscode.DocumentLinkProvider {
    provideDocumentLinks(document: vscode.TextDocument): vscode.DocumentLink[] {
        const links: vscode.DocumentLink[] = []

        for (const match of document.getText().matchAll(PROBLEM_LINK_REGEX)) {
            const problemNm = match[1]
            const start = document.positionAt(match.index)
            const end = document.positionAt(match.index + match[0].length)

            const link = new vscode.DocumentLink(new vscode.Range(start, end))
            link.tooltip = `Open problem ${problemNm} in Jutge.org`
            link.target = vscode.Uri.parse(
                `command:jutge-vscode.openProblemForLink?${encodeURIComponent(
                    JSON.stringify([problemNm])
                )}`
            )
            links.push(link)
        }

        return links
    }
}
