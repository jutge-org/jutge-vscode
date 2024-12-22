# Jutge VSCode Extension

A Visual Studio Code extension for interacting with [Jutge.org](https://jutge.org), a programming learning platform.

## Installation

### Prerequisites

-   Node.js v21.7.1 or higher
-   bun v1.0.0 or higher
-   Visual Studio Code v1.87.0 or higher
-   [esbuild-problem-matchers](https://marketplace.visualstudio.com/items?itemName=connor4312.esbuild-problem-matchers) VSCode extension

### From Source

1. Clone the repository:

```bash
git clone https://github.com/jutge-org/jutge-vscode.git
cd jutge-vscode
```

2. Install dependencies and build:

```bash
make
```

### From VSCode Marketplace

Coming soon.

## Development

### Building and running the extension (for local development)

1. Open the project in VSCode
2. Press F5 or select Run > Start Debugging

### Packaging the extension

```bash
make vsix
```

### Project Structure

```
jutge-vscode/
├── src/
│   ├── extension.ts          # Extension entry point
│   ├── context.ts           # Extension context management
│   ├── jutgeClient.ts       # API client for Jutge.org, installed from api.jutge.org/typescript
│   ├── providers/           # VSCode providers
│   │   ├── WebviewProvider.ts   # Problem viewer implementation
│   │   └── TreeViewProvider.ts  # Sidebar tree view
│   ├── runners/            # Code execution handlers
│   ├── services/          # Business logic services
│   ├── utils/            # Helper functions and types
│   └── webview/          # Webview UI components
├── dist/                # Compiled extension files
└── esbuild.js          # Build configuration
```

### Key Components

1. **WebviewProvider**: Handles the problem viewer interface, showing problem statements and test cases.

2. **TreeViewProvider**: Handles the sidebar tree view, showing the problems and submissions.

3. **Services**:

-   AuthService: Manages authentication with Jutge.org
-   FileService: Handles file operations
-   SubmissionService: Manages problem submissions
-   ConfigService: Manages configuration

4. **Runners**: Executes code against test cases for different programming languages

### Contributing

[TODO: Add contributing information]

## License

[TODO: Add license information]

## Known Issues

See the [issues page](https://github.com/jutge-org/jutge-vscode/issues) for current known issues.
