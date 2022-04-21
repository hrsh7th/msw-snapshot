module.exports = {

  testURL: 'http://a.example.com:3000',
  
  testEnvironment: 'jsdom',

  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],

  testMatch: ['<rootDir>/test/**/*.(js|jsx|ts|tsx)', '<rootDir>/src/**/*.test.(js|jsx|ts|tsx)'],

  transform: {
    '.(js|jsx|ts|tsx)$': 'ts-jest'
  }
};
