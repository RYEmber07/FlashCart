import js from "@eslint/js";
import globals from "globals";

export default [
    js.configs.recommended,
    {
        languageOptions: {
            ecmaVersion: "latest",
            sourceType: "module",
            globals: {
                ...globals.node,
                ...globals.jest, // Add this if you plan to write tests later
            },
        },
        rules: {
            "no-unused-vars": "warn",
            "no-console": "off", // Keep off so you can see your security logs
            "no-undef": "error",
        },
    },
];