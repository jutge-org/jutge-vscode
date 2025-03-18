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

## Contributing

We welcome contributions from the community! Here's how you can help:

### Development Setup

-   Follow the installation instructions above to set up your development environment
-   Familiarize yourself with the project structure and key components
-   Check the GitHub issues for tasks that need assistance

### Coding Standards

-   The project uses ESLint and Prettier for code formatting and linting
-   Run `bun lint` to check your code for issues
-   Run `bun format` to auto-format code

### Pull Request Process

1. Fork the repository and create a feature branch
2. Make your changes, following the coding standards
3. Add tests for new functionality if applicable
4. Update documentation as needed
5. Submit a pull request with a clear description of the changes

## License

See the [LICENSE](LICENSE) file for details.

## Known Issues

See the [issues page](https://github.com/jutge-org/jutge-vscode/issues) for current known issues.
