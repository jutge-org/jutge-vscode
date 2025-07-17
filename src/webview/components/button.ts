import { addIcon, refreshIcon, runAllIcon, runIcon, submitIcon } from "./icons"

type IconType = "add" | "run" | "run-all" | "submit" | "run-again" | "none"

const icons: Record<IconType, () => string> = {
    "add": addIcon,
    "run": runIcon,
    "run-all": runAllIcon,
    "submit": submitIcon,
    "run-again": refreshIcon,
    "none": () => "",
}

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
