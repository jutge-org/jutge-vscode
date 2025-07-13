# Jutge VSCode Extension

The Jutge VSCode Extension provides a seamless integration between [Visual Studio Code](https://code.visualstudio.com/) and [Jutge.org](https://jutge.org/). It empowers novice and experienced programmers to improve their coding skills by solving programming problems from Jutge.org directly within the IDE, making it easy to focus on coding without switching contexts.

_Ready to level up your programming practice? [Install the Jutge VSCode Extension](vscode:extension/jutge-org.jutge-vscode) and start solving Jutge.org's problems without leaving your favorite editor._

The main features of the extension include:

- Log in to Jutge.org.
- View lists of problems from Jutge.org organized by courses.
- View problem statements and test cases.
- Check solutions against public test cases in the local environment.
- Submit solutions to the Jutge.org server.
- View submission results and feedback.
- Support for the C++, Python, and Haskell programming languages.

The extension is still in its early stages, and we are actively working on improving its functionality and user experience. In the near future, we plan to add more features such as:

- Support for more programming languages.
- Automatic installation of compilers and interpreters to ease new users' setup.
- Enhanced problem browsing and filtering.
- Copying with more types of problems in Jutge.org (problems with functions, quiz problems, graphical problems, ...).
- Support for custom test cases.
- Support for exams and contests.

The extension is built using TypeScript and leverages the VSCode API to provide a rich user experience. It uses webviews to display problem statements and test cases, and it integrates with [Jutge.org's API](https://api.jutge.org/) to manage authentication, problem retrieval, and submission handling.

This is an open-source project that thrives on community involvement. We welcome your contributions and feedback:

- **Source Code**: Visit our [GitHub repository](https://github.com/jutge-org/jutge-vscode)
- **Issue Tracking**: Check the [issues page](https://github.com/jutge-org/jutge-vscode/issues) for known issues and feature requests
- **Get Involved**: Submit bug reports, feature requests, or contribute code to help improve the extension

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

### Note for Windows environments and Visual Studio Build Tools:

Those using Windows, and more specifically Visual Studio Build Tools in order to compile c++ programs (AKA. using the 'cl' command), must ensure that Visual Studio Code is loaded from a developer command prompt, that includes the required environment variables (the easiest way of checking it is by executing cl in a terminal and seeing if the command is recognized). If not, my recommendation is to write a .bat file with these contents (minor changes may exist on the second line), that will load the required tools and then open VSCode in the directory in which the file is located. This file can be executed normally and will open a command window, which can be closed once VSCode is ready.

```
@echo off
call "C:\Program Files (x86)\Microsoft Visual Studio\2022\BuildTools\VC\Auxiliary\Build\vcvarsall.bat" x64
code .
```

Additionally, the following must be changed on the extension's settings:

- **Cpp: Command**: `cl`
- **Cpp: Flags**:

```"jutge-vscode.runner.cpp.flags": [
    "/EHsc",
    "/std:c++20",
    "/W4",
    "/O2"
],
```

## Development

Checkout the [`DEVELOPERS.md`](https://github.com/jutge-vscode/tree/main/DEVELOPERS.md) file on GitHub for instructions on how to build the extensions and how to contribute to it.
