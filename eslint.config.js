const tsEslintPlugin = require("@typescript-eslint/eslint-plugin")
const tsParser = require("@typescript-eslint/parser")

module.exports = [
    {
        ignores: ["out/**", "dist/**", "**/*.d.ts"],
    },
    {
        files: ["**/*.ts"],
        languageOptions: {
            parser: tsParser,
            ecmaVersion: 2015,
            sourceType: "module",
        },
        plugins: {
            "@typescript-eslint": tsEslintPlugin,
        },
        rules: {
            "@typescript-eslint/naming-convention": [
                "warn",
                {
                    selector: "import",
                    format: ["camelCase", "PascalCase"],
                },
            ],
            "curly": "warn",
            "eqeqeq": "warn",
            "no-throw-literal": "warn",
            "semi": "off",
        },
    },
]
