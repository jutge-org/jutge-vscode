import { addIcon, refreshIcon, runAllIcon, submitIcon } from "./icons"

type IconType = "add" | "run-all" | "submit" | "run-again" | "none"

const icons: Record<IconType, () => string> = {
    "add": addIcon,
    "run-all": runAllIcon,
    "submit": submitIcon,
    "run-again": refreshIcon,
    "none": () => "",
}

export const Button = (text: string, icon: IconType = "none", id: string, title?: string) => `
    <vscode-button id="${id}" class="icon-button" ${title ? `title="${title}"` : ""}> 
        <div class="icon">${icons[icon]()}</div>
        ${text && `<div class="text">${text}</div>`}
    </vscode-button>
`
