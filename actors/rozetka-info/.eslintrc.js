module.exports = {
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: './tsconfig.json',
    sourceType: 'module',
    createDefaultProgram: true
  },
  plugins: ['@typescript-eslint/eslint-plugin'],
  extends: [
    '@apify',
    'plugin:@typescript-eslint/eslint-recommended',
    'plugin:@typescript-eslint/recommended',
    'prettier',
    'prettier/@typescript-eslint',
  ],
  root: true,
  env: {
    node: true,
    jest: true,
  },

  rules: {
    '@typescript-eslint/interface-name-prefix': 'off',
    '@typescript-eslint/explicit-function-return-type': 'error',
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/no-unused-vars': ['warn', { varsIgnorePattern: 'Ignored', argsIgnorePattern: 'Ignored' }],
    '@typescript-eslint/no-unnecessary-boolean-literal-compare': 'error',
    'no-return-await': 'error',
    '@typescript-eslint/promise-function-async': [
      'error'
    ],
    "import/extensions": "off",
    "import/no-extraneous-dependencies": "off"
  }
};
