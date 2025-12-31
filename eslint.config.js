import globals from "globals";
import tseslint from "typescript-eslint";
import stylistic from "@stylistic/eslint-plugin";

export default [
    {
        ignores: ["node_modules/**", "dist/**", "public/**"],
    },
    ...tseslint.configs.recommended.map((config) => ({
        ...config,
        files: ["**/*.ts"],
    })),
    // Stylistic rules (indentation, spacing, etc.)
    ...tseslint.configs.stylistic.map((config) => ({
        ...config,
        files: ["**/*.ts"],
    })),
    {
        files: ["**/*.ts"],
        languageOptions: { globals: globals.browser },
        plugins: {
            "@stylistic": stylistic,
        },
        rules: {
            "@typescript-eslint/no-unused-vars": "warn",
            "@typescript-eslint/no-useless-constructor": "error",

            // Brace style enforcement - handles both JS and TS
            "@stylistic/brace-style": ["error", "1tbs", { allowSingleLine: false }],
            curly: ["error", "all"],
        },
    },
];
