module.exports = {
    root: true,
    env: {
      browser: true,
      es6: true,
      node: true,
      jest: true,
    },
    globals: {
      BigInt: true,
    },
    parser: "@typescript-eslint/parser",
    parserOptions: {
      ecmaVersion: 10,
      project: "./tsconfig.json",
      sourceType: "module",
    },
    plugins: ["@typescript-eslint", "eslint-plugin-import", "prettier"],
    extends: [
      "eslint:recommended",
      "plugin:import/errors",
      "plugin:import/warnings",
      "plugin:import/typescript",
      "plugin:@typescript-eslint/recommended",
    ],
    rules: {
      "prettier/prettier": [
        "error",
        {
          "endOfLine": "auto"
        }
      ],
      //doesnt work, it reports false errors
      "constructor-super": "off",
      "import/order": [
        "error",
        {
          groups: ["builtin", "external", "internal", "parent", "sibling", "index"],
          pathGroupsExcludedImportTypes: ["builtin"],
        },
      ],
      "@typescript-eslint/await-thenable": "error",
      "@typescript-eslint/explicit-function-return-type": [
        "error",
        {
          allowExpressions: true,
        },
      ],
      "@typescript-eslint/func-call-spacing": "error",
      // TODO after upgrading es-lint, member-ordering is now leading to lint errors. Set to warning now and fix in another PR
      "@typescript-eslint/member-ordering": "off",
      "@typescript-eslint/no-require-imports": "error",
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          varsIgnorePattern: "^_",
          argsIgnorePattern: "^_",
        },
      ],
      "@typescript-eslint/ban-ts-comment": "error",
      "@typescript-eslint/no-use-before-define": "off",
      "@typescript-eslint/semi": "error",
      "@typescript-eslint/type-annotation-spacing": "error",
      "@typescript-eslint/no-floating-promises": "error",
      "@typescript-eslint/explicit-member-accessibility": ["error", {accessibility: "no-public"}],
      "@typescript-eslint/strict-boolean-expressions": [
        "error",
        {
          allowNullableBoolean: true,
          allowNullableString: true,
          allowAny: true,
        },
      ],
      "import/no-extraneous-dependencies": [
        "error",
        {
          devDependencies: false,
          optionalDependencies: false,
          peerDependencies: false,
        },
      ],
      "func-call-spacing": "off",
      //if --fix is run it messes imports like /lib/presets/minimal & /lib/presets/mainnet
      "import/no-duplicates": "off",
      "import/no-relative-packages": "error",
      "new-parens": "error",
      "no-loss-of-precision": "error",
      "no-caller": "error",
      "no-bitwise": "off",
      "no-cond-assign": "error",
      "no-consecutive-blank-lines": 0,
      "no-console": "error",
      "no-var": "error",
      "object-curly-spacing": ["off"],
      "object-literal-sort-keys": 0,
      "no-prototype-builtins": 0,
      "prefer-const": "error",
      quotes: ["error", "double"],
      semi: "off",
      "no-restricted-imports": [
        "error",
        {
          patterns: ["../lib/*"],
          paths: [
            {name: "child_process", message: "Please use node:child_process instead."},
            {name: "crypto", message: "Please use node:crypto instead."},
            {name: "fs", message: "Please use node:fs instead."},
            {name: "http", message: "Please use node:http instead."},
            {name: "net", message: "Please use node:net instead."},
            {name: "os", message: "Please use node:os instead."},
            {name: "path", message: "Please use node:path instead."},
            {name: "stream", message: "Please use node:stream instead."},
            {name: "util", message: "Please use node:util instead."},
            {name: "url", message: "Please use node:url instead."},
          ],
        },
      ],
      // Force to add names to all functions to ease CPU profiling
      "func-names": ["error", "always"],
  
      // TEMP Disabled while eslint-plugin-import support ESM (Typescript does support it) https://github.com/import-js/eslint-plugin-import/issues/2170
      "import/no-unresolved": "off"
    },
    settings: {
      "import/core-modules": [
        "node:child_process",
        "node:crypto",
        "node:fs",
        "node:http",
        "node:net",
        "node:os",
        "node:path",
        "node:stream",
        "node:util",
        "node:url",
      ],
    },
    overrides: [
      {
        files: ["**/*.config.js", "**/*.config.mjs", "**/*.config.cjs", "**/*.config.ts"],
        rules: {
          // Allow importing packages from dev dependencies
          "import/no-extraneous-dependencies": "off",
          // Allow importing and mixing different configurations
          "import/no-relative-packages": "off",
          "@typescript-eslint/naming-convention": "off",
          // Allow require in CJS modules
          "@typescript-eslint/no-var-requires": "off",
          // Allow require in CJS modules
          "@typescript-eslint/no-require-imports": "off",
        },
      },
      {
        files: ["**/test/**/*.ts"],
        rules: {
          "import/no-extraneous-dependencies": "off",
          // Turned off as it floods log with warnings. Underlying issue is not critical so switching off is acceptable
          "import/no-named-as-default-member": "off",
          "func-names": "off",
        },
      },
      {
        files: ["**/test/**/*.test.ts"],
        plugins: ["jest"],
        rules: {
            "jest/no-disabled-tests": "warn",
            "jest/no-focused-tests": "error",
            "jest/no-identical-title": "error",
            "jest/prefer-to-have-length": "warn",
            "jest/valid-expect": "error"
          }
      },
      {
        files: ["**/types/**/*.ts"],
        rules: {
          "@typescript-eslint/naming-convention": [
            "off",
            {selector: "interface", prefix: ["I"]},
            {selector: "interface", format: ["PascalCase"], prefix: ["I"]},
          ],
        },
      },
    ],
  };
  