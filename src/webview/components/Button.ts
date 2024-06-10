export const Button = (text: string, codiconIcon: string) => /*html*/ `
    <vscode-button id="new-file"> 
        ${text}
        <span slot="start" class="codicon ${codiconIcon}"></span>
    </vscode-button>
`
