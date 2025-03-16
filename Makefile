all:
	bun install
	bun compile

vsix:
	bun vscode:package