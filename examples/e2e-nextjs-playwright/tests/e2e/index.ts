import { rmSync } from 'node:fs'
import { join, relative } from 'node:path'
import { snapshot } from 'msw-snapshot'
import { test as base, expect } from 'next/experimental/testmode/playwright/msw'
import config from './playwright.config'

const test = base.extend<{
  snapshot: () => void
}>({
  snapshot: async ({ msw }, use) => {
    const state = { count: 0 }
    use(() => {
      const snapshotPath = join(
        __dirname,
        '__snapshots__',
        relative(config.testDir, test.info().file),
        // @see https://github.com/microsoft/playwright/blob/d6ec1ae3994f127e38b866a231a34efc6a4cac0d/packages/playwright-core/src/utils/fileUtils.ts#L53
        test
          .info()
          .title.replace(
            /[\x00-\x2C\x2E-\x2F\x3A-\x40\x5B-\x60\x7B-\x7F]+/g,
            '-'
          )
      )

      const updateSnapshots = test.info().config.updateSnapshots !== 'none'
      if (updateSnapshots) {
        rmSync(snapshotPath, {
          recursive: true,
          force: true,
        })
      }
      msw.use(
        snapshot({
          updateSnapshots: updateSnapshots,
          ignoreSnapshots: updateSnapshots,
          snapshotPath: snapshotPath,
          onFetchFromServer: () => {
            if (!updateSnapshots) {
              test.fail(true, 'unexpected fetch from server')
            }
          },
          createSnapshotFilename: async () => {
            return `${state.count++}`
          },
        })
      )
    })
  },
})

export { test, expect }

