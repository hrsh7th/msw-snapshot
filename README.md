# msw-snapshot

Transparently create an API cache for testing.

### Install

```sh
$ npm i -D msw msw-snapshot
```

### Setup

1. Setup [jest](https://jestjs.io)

```js
# jest.config.js

module.exports = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js']
};
```

```js
# jest.setup.js

import path from 'path';
import { TextDecoder } from 'util';
import { setupServer } from 'msw';
import { snapshot, maskJSON, maskBody, maskURLSearchParams } from 'msw-snapshot';

const server = setupServer(
  // ... your request handlers here ...

  snapshot({
    test: /.*/,
    snapshotDir: path.resolve(__dirname, '__msw_snapshots__'),
    updateSnapshot: process.env.UPDATE_MSW_SNAPSHOT === '1',
    createSnapshotName: async (req) => {
      // You can change `request identity` via masking request data.
      // The following example ignores the following data.
      // - URLSearchParams: `cachebust` query.
      // - Cookie: `session`.
      // - Header: `date`, `cookie`.
      return [
        req.method,
        req.url.origin,
        req.url.pathname,
        Array.from(maskURLSearchParams(req.url.searchParams, ['cachebust']).entries()),
        Array.from(maskHeaders(req.headers, ['cookie', 'date']).entries()),
        maskJSON(req.cookies, ['session']),
        await req.text(),
      ];
    }
  })
)

beforeAll(() => {
  server.listen();
});
afterAll(() => {
  server.close();
});
```

