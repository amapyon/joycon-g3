module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    testMatch: ['<rootDir>/src/__tests__/**/*.test.ts'],
    moduleFileExtensions: ['ts', 'js', 'json'],
    modulePathIgnorePatterns: ['<rootDir>/src_legacy/'],
    testPathIgnorePatterns: ['<rootDir>/src_legacy/'],
    setupFiles: ['<rootDir>/src/__tests__/setup-env.ts'],
    clearMocks: true,
    restoreMocks: true,
    collectCoverageFrom: [
        'src/**/*.ts',
        '!src/**/*.d.ts',
        '!src/__tests__/**',
        '!src/preload/types.ts',
    ],
    coverageDirectory: '<rootDir>/coverage',
    coverageReporters: ['text-summary', 'json-summary', 'lcov'],
    transform: {
        '^.+\\.ts$': ['ts-jest', { tsconfig: 'tsconfig.json' }]
    }
};
