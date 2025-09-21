/** @type {import('eslint').Linter.Config} */
const config = {
  root: true,
  plugins: [
    '@typescript-eslint',
    'import',
    'jsx-a11y',
    'react',
    'react-hooks'
  ],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended-type-checked',
    'plugin:@typescript-eslint/stylistic-type-checked',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
    'plugin:jsx-a11y/recommended',
    'plugin:import/recommended',
    'plugin:import/typescript'
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: true,
    tsconfigRootDir: process.cwd(),
    sourceType: 'module'
  },
  settings: {
    react: {
      version: 'detect'
    }
  },
  rules: {
    'react/jsx-uses-react': 'off',
    'react/react-in-jsx-scope': 'off',
    '@typescript-eslint/consistent-type-imports': 'error',
    '@typescript-eslint/no-floating-promises': 'error',
    'import/no-default-export': 'error'
  },
  overrides: [
    {
      files: ['*.js', '*.cjs', '*.mjs'],
      env: { node: true },
      parser: 'espree',
      parserOptions: { sourceType: 'script' },
      rules: {
        'import/no-commonjs': 'off'
      }
    }
  ]
};

export default config;
