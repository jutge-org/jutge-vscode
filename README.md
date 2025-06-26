# Jutge VSCode Extension

The Jutge VSCode Extension provides a seamless integration between [Visual Studio Code](https://code.visualstudio.com/) and [Jutge.org](https://jutge.org/). It empowers novice and experienced programmers to improve their coding skills by solving programming problems from Jutge.org directly within the IDE, making it easy to focus on coding without switching contexts.

_Ready to level up your programming practice? [Install the Jutge VSCode Extension](vscode:extension/jutge-org.jutge-vscode) and start solving Jutge.org's problems without leaving your favorite editor._

The main features of the extension include:

-   Log in to Jutge.org.
-   View lists of problems from Jutge.org organized by courses.
-   View problem statements and test cases.
-   Check solutions against public test cases in the local environment.
-   Submit solutions to the Jutge.org server.
-   View submission results and feedback.
-   Support for the C++, Python, and Haskell programming languages.

The extension is still in its early stages, and we are actively working on improving its functionality and user experience. In the near future, we plan to add more features such as:

-   Support for more programming languages.
-   Automatic installation of compilers and interpreters to ease new users' setup.
-   Enhanced problem browsing and filtering.
-   Copying with more types of problems in Jutge.org (problems with functions, quiz problems, graphical problems, ...).
-   Support for custom test cases.
-   Support for exams and contests.

The extension is built using TypeScript and leverages the VSCode API to provide a rich user experience. It uses webviews to display problem statements and test cases, and it integrates with [Jutge.org's API](https://api.jutge.org/) to manage authentication, problem retrieval, and submission handling.

This is an open-source project that thrives on community involvement. We welcome your contributions and feedback:

-   **Source Code**: Visit our [GitHub repository](https://github.com/jutge-org/jutge-vscode)
-   **Issue Tracking**: Check the [issues page](https://github.com/jutge-org/jutge-vscode/issues) for known issues and feature requests
-   **Get Involved**: Submit bug reports, feature requests, or contribute code to help improve the extension

See the [Contributing](#contributing) section for more details on how to get involved.

## Installation

### VSCode link

You can install the extension directly in Visual Studio Code by clicking [this link](vscode:extension/jutge-org.jutge-vscode).

### From VSCode Marketplace

Install the extension from the [VSCode Marketplace](https://marketplace.visualstudio.com/items?itemName=jutge-org.jutge-vscode).

### Building and packaging the extension

1. Clone the repository:

```bash
git clone https://github.com/jutge-org/jutge-vscode.git
cd jutge-vscode
```

2. Install dependencies:

```bash
npm install
```

3. Build and package the extension:

```bash
make vsix
```

4. Install the extension from the `.vsix` file by following the docs in [VSCode Marketplace](https://code.visualstudio.com/docs/editor/extension-marketplace#_install-from-a-vsix)

## Development

### Prerequisites

-   Node.js v21.7.1 or higher
-   bun v1.0.0 or higher
-   Visual Studio Code v1.87.0 or higher
-   [esbuild-problem-matchers](https://marketplace.visualstudio.com/items?itemName=connor4312.esbuild-problem-matchers) VSCode extension

### Building from source

1. Clone the repository:

```bash
git clone https://github.com/jutge-org/jutge-vscode.git
cd jutge-vscode
```

2. Install dependencies and build:

```bash
make
```

3. Open the project in VSCode and press `F5` or select `Run > Start Debugging`

### Project Structure

```
jutge-vscode/
├── src/
│   ├── extension.ts             # Extension entry point
│   ├── context.ts               # Extension context management
│   ├── jutge_client_api.ts      # API client (https://api.jutge.org/clients#typescript)
│   ├── providers/               # VSCode providers
│   │   ├── WebviewProvider.ts   # Problem viewer implementation
│   │   └── TreeViewProvider.ts  # Sidebar tree view
│   ├── runners/                 # Code execution handlers
│   ├── services/                # Business logic services
│   ├── utils/                   # Helper functions and types
│   └── webview/                 # Webview UI components
├── dist/                        # Compiled extension files
└── esbuild.js                   # Build configuration
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
-   Check the GitHub issues for tasks that need assistance (look for the "help wanted" or "good first issue" labels)

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
