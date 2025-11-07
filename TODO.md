## Problems

- Button to download previous submissions to a problem and save them in the directory you are working on.

## Exams

When doing an exam:

- You can't get or submit any problems other than the exam's own problems.

- You can't see the problems (nor get them through the API) until the exam has started.

- Even if the extension shows a list of open exams, you can't log in by writing the exam ID manually.

- You can't log in unless you type the exam password correctly.

- The veredicts are only for the exam, i.e. you could have a green or red veredict for the problems in the exam in the problem lists of your course, but in the exam the veredict is independent. You could even have multiple exams with the same problems and each exam is a separated sequence of submissions and veredicts. The veredicts should not mix, and cache separately.

- You cannot enter an exam from an outside IP (not in the range assigned to the classroom). The exam password is there to avoid this, but it could potentially be leaked. The extension should not let you sign-in. And it should log this, and report it.

- When finishing an exam, the extension has to be really clear that the student won't be able to sign-in again.

- You should not sign-in more than once into an exam from the extension (asking for a token twice). Unless there has been a bad problem (reboot, etc.). We should log this and prevent it in some way (ask "You are logging back into the exam, this will be reported, are you sure you want to continue?").

### Exam niceties

- Showing the time available (as a progress bar?).
- Showing a list of documentation items during the exam.
