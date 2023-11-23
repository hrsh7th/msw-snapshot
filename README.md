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

### How should I use `createSnapshotPath`?

You can control the snapshot directory layout via this.

For example, if you want to create snapshot files that should be located per request host and pathname, you can use the following configuration.

```
snapshot({

  ...

  createSnapshotPath: async (info) => {
    const url = new URL(info.request.url);
    return [
      url.host,
      url.pathname,
      toHashString([
        info.request.method,
        url.origin,
        url.pathname,
        getSortedEntries(maskURLSearchParams(url.searchParams, ['t'])), // this
        getSortedEntries(info.request.headers),
        getSortedEntries(info.cookies),
        new TextDecoder('utf-8').decode(await info.request.arrayBuffer()),
      ])
    ].join('/');
  },

  ...

})
```

For another use-case, if you want to create snapshot files for each vitest/jest test-cases, you probably use the following configuration.

```
import { context, snapshot } from 'msw-snapshot';
import { beforeEach } from 'vitest';

beforeEach(ctx => {
  context.namespace = ctx.expect.getState().currentTestName;
})

const fetchCountMap = {};

snapshot({

  ...

  createSnapshotPath: async (info) => {
    fetchCountMap[info.context.namespace] = fetchCountMap[info.context.namespace] ?? 0;
    fetchCountMap[info.context.namespace]++;
    return `${info.context.namespace}-${String(fetchCountMap[info.context.namespace]).padStart(3, '0')}`
  },

  ...

})
```


### How should I use `mask***` functions?

For example, if your app appends cache busting query like `t=${Date.now()}`, `msw-snapshot` will take unexpected snapshots.

In this case, You can control snapshot identity via `createSnapshotPath`.

```ts
import { snapshot, toHashString, maskURLSearchParams } from 'msw-snapshot';

snapshot({

  ...

  createSnapshotPath: async (info) => {
    const url = new URL(info.request.url);
    return [
      url.host,
      url.pathname,
      toHashString([
        info.request.method,
        url.origin,
        url.pathname,
        getSortedEntries(maskURLSearchParams(url.searchParams, ['t'])), // this
        getSortedEntries(info.request.headers),
        getSortedEntries(info.cookies),
        new TextDecoder('utf-8').decode(await info.request.arrayBuffer()),
      ])
    ].join('/');
  },

  ...

})
```

