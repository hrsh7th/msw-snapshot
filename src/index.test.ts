import { setupServer } from 'msw/node';
import { resolve } from 'path';
import { rmSync } from 'fs';
import { snapshot } from '.';
import fetch from 'node-fetch';

const SNAPSHOT_DIR = resolve(__dirname, '__msw_snapshots__');

describe('msw-snapshot', () => {

  beforeAll(() => {
    try {
      rmSync(SNAPSHOT_DIR, { recursive: true, force: true });
    } catch (e) {
    }
  });

  it('should send request to the server and save snapshot', async () => {
    const events: string[] = [];
    const server = setupServer(
      snapshot({
        snapshotDir: SNAPSHOT_DIR,
        onFetchFromServer: () => {
          events.push('server');
        },
        onFetchFromCache: () => {
          events.push('cache');
        }
      })
    );
    server.listen();
    await fetch('https://jsonplaceholder.typicode.com/posts/1');
    await fetch('https://jsonplaceholder.typicode.com/posts/1');
    expect(events).toStrictEqual(['server', 'cache']);
    server.close();
  });

  it('should use existing cache', async () => {
    const events: string[] = [];
    const server = setupServer(
      snapshot({
        snapshotDir: SNAPSHOT_DIR,
        onFetchFromServer: () => {
          events.push('server');
        },
        onFetchFromCache: () => {
          events.push('cache');
        }
      })
    );
    server.listen();
    await fetch('https://jsonplaceholder.typicode.com/posts/1');
    await fetch('https://jsonplaceholder.typicode.com/posts/1');
    expect(events).toStrictEqual(['cache', 'cache']);
    server.close();
  });

  it('shouldn\'t use existing cache with config.updateSnapshot', async () => {
    const events: string[] = [];
    const server = setupServer(
      snapshot({
        snapshotDir: SNAPSHOT_DIR,
        updateSnapshot: true,
        onFetchFromServer: () => {
          events.push('server');
        },
        onFetchFromCache: () => {
          events.push('cache');
        }
      })
    );
    server.listen();
    await fetch('https://jsonplaceholder.typicode.com/posts/1');
    await fetch('https://jsonplaceholder.typicode.com/posts/1');
    expect(events).toStrictEqual(['server', 'server']);
    server.close();
  });

});
