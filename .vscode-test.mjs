import { defineConfig } from "@vscode/test-cli";

export default defineConfig([
  {
    label: "unitTests",
    files: "out/test/**/*.test.js",
    workspaceFolder: "src/test/mock_workspace",
    mocha: {
      ui: "tdd",
      timeout: 5000,
      silent: false,
      fullTrace: true,
    },
  },
]);
