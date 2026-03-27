import type { Config } from 'jest';

const config: Config = {
  displayName: 'packages',
  testEnvironment: 'node',
  testMatch: [
    '<rootDir>/packages/**/*.test.{ts,tsx}',
  ],
  transform: {
    '^.+\\.[tj]sx?$': ['ts-jest', {
      useESM: false,
      tsconfig: {
        module: 'commonjs',
        moduleResolution: 'node',
        esModuleInterop: true,
        allowJs: true,
        target: 'ES2020',
        strict: true,
        isolatedModules: true,
      },
    }],
  },
  moduleNameMapper: {
    // Strip .js extensions from ESM-style imports
    '^(\\.{1,2}/.*)\\.js$': '$1',
    // Map workspace-only deps that aren't hoisted to root
    '^minio$': '<rootDir>/packages/storage/src/__mocks__/minio.ts',
  },
  // Transform jose and other ESM-only packages (including pnpm symlinks)
  transformIgnorePatterns: [
    'node_modules/(?!(\\.pnpm|jose|@upstash)/)',
  ],
  // Resolve modules from workspace package node_modules
  moduleDirectories: ['node_modules', 'packages/storage/node_modules', 'packages/auth/node_modules'],
};

export default config;
