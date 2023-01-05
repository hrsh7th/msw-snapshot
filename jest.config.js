module.exports = {

  testEnvironment: 'jsdom',

  testEnvironmentOptions: {
    url: 'http://a.example.com:3000'
  },

  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],

  testMatch: ['<rootDir>/test/**/*.(js|jsx|ts|tsx)', '<rootDir>/src/**/*.test.(js|jsx|ts|tsx)'],

  transform: {
    '.(js|jsx|ts|tsx)$': 'ts-jest'
  }
};
