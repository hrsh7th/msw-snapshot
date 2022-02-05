module.exports = {
  testEnvironment: 'jsdom',

  testEnvironmentOptions: {
    url: 'https://example.com'
  },

  testMatch: ['<rootDir>/test/**/*.(js|jsx|ts|tsx)', '<rootDir>/src/**/*.test.(js|jsx|ts|tsx)'],

  transform: {
    '.(js|jsx|ts|tsx)$': 'ts-jest'
  }
};
