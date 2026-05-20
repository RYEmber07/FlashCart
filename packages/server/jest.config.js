export default {
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.js'],
  collectCoverageFrom: ['src/**/*.js', '!src/index.js', '!src/db/**'],
  testTimeout: 30000,
  forceExit: true,
  clearMocks: true,
  resetMocks: true,
  setupFiles: ['<rootDir>/src/__tests__/setup/env.setup.js'],
  setupFilesAfterEnv: ['<rootDir>/src/__tests__/setup/mongo.setup.js'],
  globalSetup: '<rootDir>/src/__tests__/setup/globalSetup.js',
  globalTeardown: '<rootDir>/src/__tests__/setup/globalTeardown.js',
  // Disable cache in CI for cleaner runs
  cache: process.env.CI ? false : true,
};


