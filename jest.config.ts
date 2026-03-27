import type { Config } from 'jest';

const config: Config = {
  projects: [
    // Next.js app tests
    '<rootDir>/jest.app.config.ts',
    // Packages tests (Node.js environment)
    '<rootDir>/jest.packages.config.ts',
  ],
};

export default config;
