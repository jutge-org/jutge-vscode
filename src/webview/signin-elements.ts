// Side-effect imports that register the custom elements used by the sign-in
// webview view. Bundled separately (IIFE) so the elements are defined
// synchronously before the inline sign-in script reads from them.
import "@vscode-elements/elements/dist/vscode-single-select/index.js"
import "@vscode-elements/elements/dist/vscode-option/index.js"
