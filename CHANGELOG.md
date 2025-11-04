# Change Log

All notable changes to the "jutge-vscode" extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.4] - 2025-11-??

## Added

- The "Oopen Existing File" button, to open a program file from the problem, is now always present, and its state (disabled or not), changes when a file is created or removed, just as custom testcases do. This works even when the VSCode is restarted.

## Fixed

- Removed a potential bug where the htmlStatement of the problem appeared in source code form at the top of the problem, since some data was embedded in the head of the HTML page which represents the webview, and the JSON probably contained HTML that made the parser go crazy. Even if I only saw this bug two or three times, I think I've removed its source.

## [0.1.3] - 2025-11-04

## Added

- Lists with separators in them now show separators as items in the list.

## Fixed

- Credentials and email are now stored in a global storage space in VSCode so that when changing the workspace, sign-in state is not lost. This also works in exam mode.

- Fixed a bug that set the wrong compiler when sending problems with a compiler specified in the problem itself.

## [0.1.2] - 2025-10-21

## Fixed

- The courses now show the title instead of the course ID. By @jma25l.
- A bug in Windows showed `\r\n` as two characters. By @jma25l.
- Fixes related to Windows-specific things (paths, etc). By @jma25l.
- Changed the storage system for internal metadata to avoid errors on KDE in Linux systems.
- Fixed bug where the exam token was not checked against the exam URL version of the API.
- In exam mode, changed the URL of the problem to point to the URL in the exam, not the URL in the normal Jutge.org.

## [0.1.1] - 2025-10-20

## Added

- A confirmation dialog was added when signing out.

## Fixed

- The "Copy" button which copied a textcase input to the clipboard was not working due to a change in the HTML. Now works again.

- Some problems reported "Language not found" that now will work fine.

- When trying to create a custom testcase in a problem without testcases, the extension failed without a message. Now it works.

- Fixed sanitization of the title of the problem before creating the source file. Now a problem with title "àèìòùáéíóúñç" will generate a filename with "aeiouaeiounc" and not an empty one.

## [0.0.26] - 2025-10-14

### Added

- Support for "graphics" problems, in which the output of a program is a PNG image instead of text. Testcases show the expected image and the output is shown to the side. (Diffing between expected and result images is not yet implemented.)

### Fixed

- If you search for a problem that does not exist, you receive an error message instead of a blank document.

- The "compare" button was lost due to bad CSS positioning. Now it appears again where it was, with its functionality intact.

- The "Submit to Jutge" button was disabled after each submission due to a status update missing. It is fixed now, so sending repeatedly to Jutge is possible. Sorry about that!

- Exam mode: fixed submitting problems and improved many error messages, showing the root cause to the user directly.

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
