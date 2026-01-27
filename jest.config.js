/** @type {import('jest').Config} */
module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    testMatch: ['<rootDir>/src/**/__tests__/**/*.test.ts'],
    moduleFileExtensions: ['ts', 'js', 'json'],
    modulePathIgnorePatterns: ['<rootDir>/src_legacy/', '<rootDir>/dist_packager/'],
};
