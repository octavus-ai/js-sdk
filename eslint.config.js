import js from '@eslint/js';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import prettierConfig from 'eslint-config-prettier';
import importPlugin from 'eslint-plugin-import-x';
import globals from 'globals';

// Ignore patterns
const ignorePatterns = {
  ignores: ['**/node_modules/**', '**/dist/**', '**/.next/**', '**/.turbo/**'],
};

// ESLint: Possible Problems
const eslintPossibleProblems = {
  'array-callback-return': 'error',
  // 'no-await-in-loop': off - Streaming code legitimately needs await in loops
  'no-constant-binary-expression': 'error',
  'no-constructor-return': 'error',
  'no-duplicate-imports': 'error',
  'no-new-native-nonconstructor': 'error',
  'no-promise-executor-return': 'error',
  'no-self-compare': 'error',
  'no-unmodified-loop-condition': 'error',
  'no-unreachable-loop': 'error',
  'no-unused-private-class-members': 'error',
  // 'require-atomic-updates': off - False positives with React refs in async callbacks
};

// ESLint: Suggestions
const eslintSuggestions = {
  camelcase: ['error', { ignoreDestructuring: true, ignoreImports: true, properties: 'never' }],
  // 'consistent-return': off - TypeScript's switch-exhaustiveness-check handles this better
  curly: ['error', 'all'],
  'default-case-last': 'error',
  eqeqeq: 'error',
  'no-alert': 'error',
  'no-caller': 'error',
  'no-console': 'error',
  'no-else-return': 'error',
  'no-eval': 'error',
  'no-extend-native': 'error',
  'no-extra-bind': 'error',
  'no-implicit-coercion': 'error',
  'no-labels': 'error',
  'no-lone-blocks': 'error',
  'no-lonely-if': 'error',
  'no-multi-assign': 'error',
  'no-multi-str': 'error',
  'no-nested-ternary': 'error',
  'no-new': 'error',
  'no-new-func': 'error',
  'no-new-wrappers': 'error',
  'no-object-constructor': 'error',
  'no-param-reassign': 'error',
  'no-plusplus': ['error', { allowForLoopAfterthoughts: true }],
  'no-proto': 'error',
  'no-restricted-syntax': [
    'error',
    { selector: 'ForInStatement', message: 'for...in has surprising behavior. Use alternatives.' },
    { selector: 'SequenceExpression', message: 'Comma operator is confusing. Avoid it.' },
    {
      selector:
        "CallExpression[arguments.length=1] > MemberExpression.callee > Identifier.property[name='reduce']",
      message: 'Provide initialValue to .reduce().',
    },
    {
      selector:
        "CallExpression[arguments.length=1] > MemberExpression.callee > Identifier.property[name='reduceRight']",
      message: 'Provide initialValue to .reduceRight().',
    },
  ],
  'no-return-assign': 'error',
  'no-script-url': 'error',
  'no-undef-init': 'error',
  'no-unneeded-ternary': 'error',
  'no-useless-call': 'error',
  'no-useless-computed-key': 'error',
  'no-useless-concat': 'error',
  'no-useless-rename': 'error',
  'no-useless-return': 'error',
  'no-var': 'error',
  'object-shorthand': 'error',
  'operator-assignment': 'error',
  'prefer-arrow-callback': ['error', { allowNamedFunctions: true }],
  'prefer-const': 'error',
  'prefer-exponentiation-operator': 'error',
  'prefer-numeric-literals': 'error',
  'prefer-object-has-own': 'error',
  'prefer-object-spread': 'error',
  'prefer-promise-reject-errors': 'error',
  'prefer-regex-literals': 'error',
  'prefer-rest-params': 'error',
  'prefer-spread': 'error',
  radix: ['error', 'as-needed'],
  'spaced-comment': ['error', 'always'],
  strict: ['error', 'never'],
  'symbol-description': 'error',
  yoda: 'error',
};

// Import rules
const importRules = {
  'import-x/first': 'error',
  'import-x/no-cycle': 'error',
  'import-x/no-self-import': 'error',
  'import-x/no-useless-path-segments': 'error',
  // Disallow relative parent imports (../) - use path aliases (@/) instead
  'no-restricted-imports': [
    'error',
    {
      patterns: [
        {
          group: ['../*', '../**/*'],
          message: 'Relative parent imports are not allowed. Use path aliases like @/ instead.',
        },
      ],
    },
  ],
};

// TypeScript: Extension rules (TS versions of ESLint rules)
const typescriptExtensionRules = {
  '@typescript-eslint/default-param-last': 'error',
  '@typescript-eslint/no-invalid-this': 'error',
  '@typescript-eslint/no-loop-func': 'error',
  '@typescript-eslint/no-shadow': 'error',
  '@typescript-eslint/no-unused-expressions': 'error',
  '@typescript-eslint/no-use-before-define': ['error', { functions: false }],
  '@typescript-eslint/return-await': ['error', 'always'],
};

// TypeScript: Additional strict rules
const typescriptStrictRules = {
  '@typescript-eslint/consistent-type-exports': 'error',
  '@typescript-eslint/consistent-type-imports': [
    'error',
    { fixStyle: 'inline-type-imports', prefer: 'type-imports' },
  ],
  '@typescript-eslint/no-import-type-side-effects': 'error',
  '@typescript-eslint/no-require-imports': 'error',
  '@typescript-eslint/strict-boolean-expressions': [
    'error',
    {
      allowNullableBoolean: true,
      allowNullableEnum: false,
      allowNullableNumber: false,
      allowNullableObject: true,
      allowNullableString: true,
      allowNumber: false,
      allowString: true,
    },
  ],
  '@typescript-eslint/switch-exhaustiveness-check': 'error',
};

// TypeScript: Preset overrides
const typescriptOverrides = {
  '@typescript-eslint/no-confusing-void-expression': ['error', { ignoreArrowShorthand: true }],
  '@typescript-eslint/no-empty-function': 'off',
  '@typescript-eslint/no-misused-promises': ['error', { checksVoidReturn: false }],
  '@typescript-eslint/no-non-null-assertion': 'off',
  // Disabled: Forces awkward code patterns when TypeScript can infer exhaustive checks
  '@typescript-eslint/no-unnecessary-condition': 'off',
  '@typescript-eslint/no-unused-vars': [
    'error',
    {
      argsIgnorePattern: '^_',
      caughtErrorsIgnorePattern: '^_',
      ignoreRestSiblings: true,
      varsIgnorePattern: '^_',
    },
  ],
  '@typescript-eslint/prefer-nullish-coalescing': ['error', { ignorePrimitives: { string: true } }],
  '@typescript-eslint/require-await': 'error',
  '@typescript-eslint/restrict-template-expressions': [
    'error',
    { allowAny: true, allowBoolean: true, allowNullish: true, allowNumber: true },
  ],
  '@typescript-eslint/unbound-method': 'error',
};

// Combined rules for TypeScript files
const allTypescriptRules = {
  ...eslintPossibleProblems,
  ...eslintSuggestions,
  ...importRules,
  ...typescriptExtensionRules,
  ...typescriptStrictRules,
  ...typescriptOverrides,
};

/**
 * Creates TypeScript ESLint config for a specific directory.
 */
function createTypescriptConfig(tsconfigRootDir) {
  return {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 'latest',
        projectService: true,
        sourceType: 'module',
        tsconfigRootDir,
      },
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
      'import-x': importPlugin,
    },
    settings: {
      'import-x/resolver': {
        typescript: { project: tsconfigRootDir },
      },
    },
    rules: {
      ...tsPlugin.configs['strict-type-checked'].rules,
      ...tsPlugin.configs['stylistic-type-checked'].rules,
      ...allTypescriptRules,
    },
  };
}

// JavaScript files config
const javascriptConfig = {
  files: ['**/*.js', '**/*.cjs', '**/*.mjs'],
  languageOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
  rules: {
    'no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
  },
};

// Exports for app configs
export {
  allTypescriptRules,
  createTypescriptConfig,
  eslintPossibleProblems,
  eslintSuggestions,
  ignorePatterns,
  importPlugin,
  importRules,
  javascriptConfig,
  tsParser,
  tsPlugin,
  typescriptExtensionRules,
  typescriptOverrides,
  typescriptStrictRules,
};

/** @type {import('eslint').Linter.Config[]} */
export default [
  ignorePatterns,
  js.configs.recommended,
  createTypescriptConfig(import.meta.dirname),
  javascriptConfig,
  prettierConfig,
];
