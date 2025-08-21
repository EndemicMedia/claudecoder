module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.js'],
  collectCoverage: false,
  coverageReporters: ['text', 'lcov', 'html'],
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    '*.js',
    '!dist/**',
    '!node_modules/**',
    '!jest.config.js'
  ],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 75,
      statements: 75
    },
    './openrouter-client.js': {
      branches: 80,
      functions: 80,
      lines: 85,
      statements: 85
    },
    './model-selector.js': {
      branches: 85,
      functions: 85,
      lines: 90,
      statements: 90
    },
    './utils.js': {
      branches: 90,
      functions: 90,
      lines: 95,
      statements: 95
    },
    './fallback-manager.js': {
      branches: 80,
      functions: 80,
      lines: 85,
      statements: 85
    }
  }
};
