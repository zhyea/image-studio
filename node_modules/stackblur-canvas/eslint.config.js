import ashNazg from 'eslint-config-ash-nazg';

export default [
  {
    ignores: [
      'dist',
      'docs/jsdoc'
    ]
  },
  ...ashNazg(['sauron', 'polyglot']).map((cfg) => {
    return {
      ...cfg,
      languageOptions: {
        ...cfg.languageOptions,
        ecmaVersion: 2023,
        parserOptions: {
          ...cfg.languageOptions?.parserOptions,
          sourceType: 'module'
        }
      }
    };
  }),
  {
    files: ['**/*.md/*.js'],
    languageOptions: {
      parserOptions: {
        sourceType: 'module',
        ecmaVersion: 2023
      },
      globals: {
        require: true,
        StackBlur: true,
        width: true,
        height: true,
        topX: true,
        topY: true,
        radius: true,
        imageData: true,
        sourceImage: true,
        targetCanvas: true,
        blurAlphaChannel: true
      }
    },
    rules: {
      'import/unambiguous': 0,
      'import/no-commonjs': 0,
      'n/no-missing-import': 0,
      'import/no-unresolved': ['error', {
        ignore: ['stackblur-canvas']
      }],
      'n/no-missing-require': ['error', {
        allowModules: ['stackblur-canvas']
      }],
      'no-shadow': 0,
      'no-unused-vars': ['error', {varsIgnorePattern: 'StackBlur'}],
      'sonarjs/no-internal-api-use': 0
    }
  },
  {
    rules: {
      'jsdoc/require-returns': ['error', {exemptedBy: ['see']}],
      // Handled by Babel
      'n/no-unsupported-features/es-syntax': 0,

      // Would be good, but as not supported in older Node and browsers,
      //   would need polyfill for `Number.isNaN`
      'unicorn/prefer-number-properties': 0,
      'unicorn/prefer-math-trunc': 0
    }
  }
];
