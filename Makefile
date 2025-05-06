all:
	npm install
	npm compile

vsix:
	bun vscode:package