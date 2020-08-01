module.exports = {
  root: true,
  env: {
    es2020: true,
    node: true,
  },
  extends: ['standard', 'prettier', 'prettier/@typescript-eslint'],
  parserOptions: {
    ecmaVersion: 11,
    parser: '@typescript-eslint/parser',
    sourceType: 'module',
  },
  plugins: ['@typescript-eslint'],
  rules: {},
};
