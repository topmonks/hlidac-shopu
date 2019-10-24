module.exports = {
  "extends": "eslint:recommended",
  "parserOptions": {
    "sourceType": "script",
    "ecmaVersion": 2018,
  },
  "env": {
    "es6": true,
    "webextensions": true,
    "browser": true,
  },
  rules: {
    semi: "error",
    quotes: ["error", "double", { "avoidEscape": true }],
    "no-unused-vars": ["error", { "argsIgnorePattern": "^_" }],
  }
};
