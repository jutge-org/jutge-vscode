# Change Log

All notable changes to the "jutge-vscode" extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.0.26] -

### Added

- Support for "graphics" problems, in which the output of a program is a PNG image instead of text. Testcases show the expected image and the output is
  shown to the side. Comparison is not yet implemented.

### Fixed

- If you search for a problem that does not exist, you receive an error message instead of a blank document.

## [0.0.25] - 2025-10-07

### Fixed

- Refresh and logout buttons appear only when it is appropriate.
- In exam mode, you cannot show any problem from the Command Palette.
- In exam mode, if you close VSCode and open it again, you go back to the same exam.

## [0.0.24] - 2025-09-30

### Added

- Sign-out button at the top of the problem tree.
- Save current file before running tests or submitting.

## [0.0.23] - 2025-09-25

### Fixed

- Reverted VSCode version to 1.87 so that the extension can be installed in older VSCode installations.

## [0.0.22] - 2025-09-23

### Fixed

- Bug about getting the filesize that made the extension less stable when submitting (also fixed at the API end).

## [0.0.21] - 2025-09-23

No changes.

## [0.0.20] - 2025-09-23

### Fixed

- Updated the API client. The API has had some instability problems as well, they seem resolved now.

## [0.0.19] - 2025-07-22

### Added

- Made the code editors not "previews" so that they are kept open when opening more editors (and not substituted).

### Fixed

- Opening a problem statement without a workspace folder didn't work.

## [0.0.18] - 2025-07-21

### Fixed

- The source code generated with the "+ New File" button didn't use the template present at Jutge.org. Now it does again.

- Additionally, we try to make sure the source code window is at the left and the statement of the problem is to the right. (Still to be improved.)

## [0.0.17] - 2025-07-19

### Added

- Button to edit a custom testcase. It will open the file containing the testcase.
- Button to expand or collapse all testcases of a certain type.

### Fixed

- Input/output layout for regular and custom testcases.
- The verdict notification appeared on top of the "waiting" notification when sending a problem.

## [0.0.16] - 2025-07-18

### Added

- Custom testcases. These are stored as files and are also updated whenever files change, are created or deleted. (Some subtle bugs remain, but the feature is quite usable.)

### Fixed

- Improved the traffic lights icons further.
- Upon pressing "+ New File", the language of the file was not asked.
- The mouse cursor in the problem statement was not changing to reveal interactive elements (buttons, etc.)

## [0.0.15] - 2025-07-17

### Added

- Icon for "presentation error" (yellow).

- Messages shown for rejected problems include more cases found in Jutge.org, such as "PE" and "IC", which were shown confusingly as a question mark without any text.

- Button "Open Existing File" in the problem page (beside the "+ New File" button) whenever a file with the default filename is present in the workspace directory. This makes it much easier to find the file implementing a particular problem, whenever you work on problems and just accept the filenames produced by the extension.

### Fixed

- Update mechanism for the problem icon (the traffic lights icon), which triggers when the veredict is given as a notification. Before 0.0.15, it didn't update properly (and internally it used a convoluted mechanism, now it is much simpler).

## [0.0.14] - 2025-07-17

### Added

- Introduced new icons for the state of problems.

### Fixed

- Refactored code in the extension for a speed improvement.
