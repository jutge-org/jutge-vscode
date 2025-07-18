# Change Log

All notable changes to the "jutge-vscode" extension will be documented in this file.

Check [Keep a Changelog](http://keepachangelog.com/) for recommendations on how to structure this file.

## Version 0.0.17

- Added new button to edit a custom testcase. It will open the file containing the testcase.

- Added new button to expand or collapse all testcases of a certain type.

- Improved input/output layout for regular and custom testcases.

- Fixed regression bug whereby the verdict notification appeared on top of the "waiting" notification when sending a problem.

## Version 0.0.16

- Added custom testcases. These are stored as files and are also updated whenever files change, are created or deleted. (Some subtle bugs remain, but the feature is quite usable.)

- Improved the traffic lights icons further.

- Fixed a regression where upon pressing "+ New File", the language of the file was not asked.

- Fixed a bug where the mouse cursor in the problem statement was not changing to reveal interactive elements (buttons, etc.)

## Version 0.0.15

- Fixed the update mechanism for the problem icon (the traffic lights icon), which triggers when the veredict is given as a notification. Before 0.0.15, it didn't update properly (and internally it used a convoluted mechanism, now it is much simpler).

- There is now an icon for "presentation error" (yellow).

- The messages shown for rejected problems include more cases found in Jutge.org, such as "PE" and "IC", which were shown confusingly as a question mark without any text.

- Added a "Open Existing File" in the problem page (beside the "+ New File" button) whenever a file with the default filename is present in the workspace directory. This makes it much easier to find the file implementing a particular problem, whenever you work on problems and just accept the filenames produced by the extension.

## Version 0.0.14

- Introduced new icons for the state of problems, and refactored code in the extension for a speed improvement.
