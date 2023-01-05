import { setupServer } from 'msw/node';
import { resolve } from 'path';
import { rmSync } from 'fs';
import { snapshot } from '.';

const SNAPSHOT_DIR = resolve(__dirname, '__msw_snapshots__');

describe('msw-snapshot', () => {

  beforeEach(() => {
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
    const events: [string, string][] = [];
    const server = setupServer(
      snapshot({
        snapshotDir: SNAPSHOT_DIR,
        onFetchFromServer: (_, snapshot) => {
          events.push(['server', snapshot.response.body]);
        },
        onFetchFromCache: (_, snapshot) => {
          events.push(['cache', snapshot.response.body]);
        }
      })
    );
    server.listen();
    const res1 = await (await fetch('https://jsonplaceholder.typicode.com/posts/1')).text();
    const res2 = await (await fetch('https://jsonplaceholder.typicode.com/posts/1')).text();
    expect(events).toStrictEqual([
      ['server', res1],
      ['cache', res2]
    ]);
    server.close();
  });

  it('shouldn\'t use existing cache with config.updateSnapshot', async () => {
    const events: [string, string][] = [];
    const server = setupServer(
      snapshot({
        snapshotDir: SNAPSHOT_DIR,
        updateSnapshot: true,
        onFetchFromServer: (_, snapshot) => {
          events.push(['server', snapshot.response.body]);
        },
        onFetchFromCache: (_, snapshot) => {
          events.push(['cache', snapshot.response.body]);
        }
      })
    );
    server.listen();
    const res1 = await (await fetch('https://jsonplaceholder.typicode.com/posts/1')).text();
    const res2 = await (await fetch('https://jsonplaceholder.typicode.com/posts/1')).text();
    expect(events).toStrictEqual([
      ['server', res1],
      ['server', res2]
    ]);
    server.close();
  });

  it('should work with compression response', async () => {
    const events: [string, string][] = [];
    const server = setupServer(
      snapshot({
        snapshotDir: SNAPSHOT_DIR,
        onFetchFromServer: (_, snapshot) => {
          events.push(['server', snapshot.response.body]);
        },
        onFetchFromCache: (_, snapshot) => {
          events.push(['cache', snapshot.response.body]);
        }
      })
    );
    server.listen();
    const res1 = await (await fetch('https://d.joinhoney.com/v3?operationName=web_getProductPriceHistory&variables=%7B%22productId%22%3A%227613592105936880680_c9cfbae01a9af7d396c1f977224a4b8a_c9cfbae01a9af7d396c1f977224a4b8a%22%2C%22timeframe%22%3A30%7D')).text();
    const res2 = await (await fetch('https://d.joinhoney.com/v3?operationName=web_getProductPriceHistory&variables=%7B%22productId%22%3A%227613592105936880680_c9cfbae01a9af7d396c1f977224a4b8a_c9cfbae01a9af7d396c1f977224a4b8a%22%2C%22timeframe%22%3A30%7D')).text();
    expect(events).toStrictEqual([
      ['server', res1],
      ['cache', res2]
    ]);
    server.close();
  })

});
