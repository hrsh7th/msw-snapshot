msw-snapshot
============================================================

Transparently create an API cache for testing.


Install
------------------------------------------------------------

```sh
$ npm i -D msw msw-snapshot
```


Configuration
------------------------------------------------------------

```ts
import { setupServer } from 'msw/node';
import { snapshot } from 'snapshot'

const server = setupServer(
  snapshot({
    /**
     * Specify the directory path to store snapshot files.
     */
    snapshotPath: string;

    /**
     * Specify msw's handler RegExp.
     */
    test?: RegExp; // default: /.*/

    /**
     * Specify whether to update snapshot or not.
     */
    updateSnapshots?: boolean; // default: false

    /**
     * Specify whether to ignore existing snapshot or not.
     */
    ignoreSnapshots?: boolean; // default: false

    /**
     * Callback when response is received from server.
     */
    onFetchFromServer?: (req: MockedRequest, snapshot: Snapshot) => void;

    /**
     * Callback when response is received from snapshot.
     */
    onFetchFromSnapshot?: (req: MockedRequest, snapshot: Snapshot) => void;

    /**
     * Callback when snapshot is updated.
     */
    onSnapshotUpdated?: (req: MockedRequest, snapshot: Snapshot) => void;

    /**
     * Create request identifier.
     */
    createSnapshotFilename?: (req: MockedRequest) => Promise<string>;
  })
);

server.listen();
// The all requests are snapshotted.
server.close();
```


Recipe
------------------------------------------------------------

- [Next.js x playwright](./examples/e2e-nextjs-playwright)


FAQ
------------------------------------------------------------

### How should I use `createSnapshotFilename`?

For example, if your app appends cache busting query like `t=${Date.now()}`, `msw-snapshot` will take unexpected snapshots.

In this case, You can control snapshot identity via `createSnapshotFilename`.

```ts
import { snapshot, toHashString, maskURLSearchParams } from 'msw-snapshot';

snapshot({

  ...

  createSnapshotFilename: async (req) => {
    return toHashString([
      req.method,
      req.url.origin,
      req.url.pathname,
      getSortedEntries(maskURLSearchParams(req.url.searchParams, ['t'])), // this
      getSortedEntries(req.headers),
      getSortedEntries(req.cookies),
      await req.text(),
    ]);
  },

  ...

})
```

### Does this supports `FormData`?

No. This module does not support `FormData` due to `msw` limitation.

Please wait `msw@next`.


