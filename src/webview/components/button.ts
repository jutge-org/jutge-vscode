import { icons, IconType } from "./icons"

type ButtonProps = {
    id: string
    text: string
    title?: string
    icon?: IconType | undefined
    disabled?: boolean | undefined
}
export const Button = ({ text, id, title, icon, disabled = false }: ButtonProps) => `
    <vscode-button id="${id}" class="${icon ? "icon-button" : "button"}" title="${title}" 
                   ${text === "" ? `style="transform: scale(0.8)"` : ``} 
                   ${disabled ? `disabled` : ``}>
        ${icon ? `<div class="icon">${icons[icon]()}</div>` : ``}
        ${text && `<div class="text">${text}</div>`}
    </vscode-button>
`
