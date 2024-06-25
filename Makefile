all:
	bun install
	bun generate-client
	bun compile

vsix:
	bun vscode:package