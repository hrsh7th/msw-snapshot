module.exports = {

  testEnvironment: 'node',

  testMatch: ['<rootDir>/test/**/*.(js|jsx|ts|tsx)', '<rootDir>/src/**/*.test.(js|jsx|ts|tsx)'],

  transform: {
    '.(js|jsx|ts|tsx)$': 'ts-jest'
  }
};
