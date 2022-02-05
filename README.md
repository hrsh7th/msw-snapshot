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
import { startServer } from 'msw';
import { snapshot } from 'msw-snapshot';

const server = startServer(
  // ... your request handlers here ...

  snapshow({
    snapshotDir: path.resolve(__dirname, '__msw_snapshots__'),
    updateSnapshot: process.env.UPDATE_MSW_SNAPSHOT === '1',
  })
)

beforeAll(() => {
  server.lsiten();
});
afterAll(() => {
  server.close();
});
```

