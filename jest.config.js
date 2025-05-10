module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.js'],
  collectCoverageFrom: [
    '*.js',
    '!dist/**',
    '!node_modules/**',
    '!jest.config.js',
    '!coverage/**'
  ],
  coverageThreshold: {
    global: {
      statements: 70,
      branches: 70,
      functions: 70,
      lines: 70
    }
  },
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true
};
