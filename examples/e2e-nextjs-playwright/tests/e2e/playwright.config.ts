import { join } from 'node:path'
import { PlaywrightTestConfig, devices } from '@playwright/test'

const BaseUrl = 'http://127.0.0.1:3000'

export default {
  name: 'e2e',
  timeout: 5 * 1000,
  testDir: join(__dirname, '../../src/app'),
  outputDir: 'test-report',
  testMatch: '**/*.spec.tsx',
  retries: 1,
  snapshotPathTemplate: '{testDir}/__snapshots__/{testFilePath}/{arg}{ext}',
  updateSnapshots: process.env.UPDATE_SNAPSHOTS ? 'all' : 'none',
  fullyParallel: true,
  use: {
    baseURL: BaseUrl,
  },
  projects: [
    {
      name: 'Desktop Chrome',
      use: {
        ...devices['Desktop Chrome'],
      },
    },
  ],
} satisfies PlaywrightTestConfig;

