import neostandard from 'neostandard'

export default [
  ...neostandard({
    ignores: [
      'dist',
      'node_modules',
      '.wxt',
      '.output',
      'demo/.wxt',
      'demo/.output',
    ],
    ts: true,
  }),
  {
    rules: {
      // Override neostandard's brace style - use allman (opening brace on new line)
      '@stylistic/brace-style': ['error', 'stroustrup', { allowSingleLine: true }],
      // Enforce space before function parens
      '@stylistic/space-before-function-paren': ['error', 'always'],
    },
  },
]
