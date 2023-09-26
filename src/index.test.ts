import { setupServer } from 'msw/node';
import { resolve } from 'path';
import { rmSync } from 'fs';
import { maskHeaders, maskJSON, maskURLSearchParams, getSortedEntries, snapshot, Info } from '.';
import { createHash } from 'crypto';

const SNAPSHOT_PATH = resolve(__dirname, '__msw_snapshots__');

const createSnapshotFilename = async (info: Info) => {
  const url = new URL(info.request.url);
  const body = await (async () => {
    if (info.request.headers.get('content-type')?.startsWith('multipart/form-data')) {
      return getSortedEntries(await info.request.formData())
    }
    return await info.request.text()
  })()
  return createHash('md5').update(JSON.stringify([
    info.request.method,
    url.origin,
    url.pathname,
    getSortedEntries(maskURLSearchParams(url.searchParams, ['cachebust'])),
    getSortedEntries(maskHeaders(info.request.headers, ['cookie', 'date', 'content-type'])),
    maskJSON(info.cookies, ['session']),
    body,
  ]), 'binary').digest('hex');
};

describe('msw-snapshot', () => {

  const clearSnapshot = () => {
    try {
      rmSync(SNAPSHOT_PATH, { recursive: true, force: true });
    } catch (e) {
      console.log(e)
    }
  }
  beforeEach(clearSnapshot);

  it('should return sorted entries', () => {
    expect(getSortedEntries(new Headers([
      ['c', '3'],
      ['a', '1'],
      ['b', '2'],
    ]))).toStrictEqual([
      ['a', '1'],
      ['b', '2'],
      ['c', '3'],
    ])
    expect(getSortedEntries(new URLSearchParams([
      ['c', '3'],
      ['a', '1'],
      ['b', '2'],
    ]))).toStrictEqual([
      ['a', '1'],
      ['b', '2'],
      ['c', '3'],
    ])
    expect(getSortedEntries({
      c: '3',
      a: '1',
      b: '2',
    })).toStrictEqual([
      ['a', '1'],
      ['b', '2'],
      ['c', '3'],
    ])
  })

  it.each([
    {
      name: 'updateSnapshots=false, ignoreSnapshots=false',
      updateSnapshots: false,
      ignoreSnapshots: false,
      expect: [
        'server',
        'server',
      ]
    }, {
      name: 'updateSnapshots=true, ignoreSnapshots=false',
      updateSnapshots: true,
      ignoreSnapshots: false,
      expect: [
        'server',
        'updated',
        'cache',
      ]
    }, {
      name: 'updateSnapshots=true, ignoreSnapshots=true',
      updateSnapshots: true,
      ignoreSnapshots: true,
      expect: [
        'server',
        'updated',
        'server',
        'updated',
      ]
    }, {
      name: 'updateSnapshots=false, ignoreSnapshots=true',
      updateSnapshots: false,
      ignoreSnapshots: true,
      expect: [
        'server',
        'server',
      ]
    }
  ])(`should work with $name`, async (spec) => {
    const events: [string, string][] = [];
    const server = setupServer(
      snapshot({
        snapshotPath: SNAPSHOT_PATH,
        updateSnapshots: spec.updateSnapshots,
        ignoreSnapshots: spec.ignoreSnapshots,
        onFetchFromServer: (_, snapshot) => {
          events.push(['server', snapshot.response.body]);
        },
        onFetchFromSnapshot: (_, snapshot) => {
          events.push(['cache', snapshot.response.body]);
        },
        onSnapshotUpdated: (_, snapshot) => {
          events.push(['updated', snapshot.response.body]);
        },
        createSnapshotFilename: createSnapshotFilename,
      })
    );
    try {
      server.listen();
      const res1 = await fetch('http://127.0.0.1:3000/data');
      const res1text = await res1.text();
      const res2 = await fetch('http://127.0.0.1:3000/data');
      const res2text = await res2.text();
      expect(res1.headers.get('content-type')).toBe('application/json; charset=utf-8')
      expect(res2.headers.get('content-type')).toBe('application/json; charset=utf-8')
      expect(JSON.stringify(res1.headers)).toBe(JSON.stringify(res2.headers))
      expect(res1text).toBe(res2text)
      expect(events).toStrictEqual(spec.expect.map((type) => [type, res1text]));
    } finally {
      server.close();
    }
  })

  it.each([{
    name: 'data',
    uri: 'http://localhost:3000/data'
  }, {
    name: 'query',
    uri: 'http://localhost:3000/query?data=1'
  }, {
    name: 'form-urlencoded',
    uri: 'http://localhost:3000/form-urlencoded',
    body: (() => {
      const body = new URLSearchParams()
      body.append('data', '1')
      return body
    })(),
  }, {
    name: 'form-data',
    uri: 'http://localhost:3000/form-data',
    body: (() => {
      const body = new FormData()
      body.append('data', '1')
      return body
    })(),
  }])(`should work with $name`, async (spec) => {
    const events: [string, string][] = [];
    const server = setupServer(
      snapshot({
        snapshotPath: SNAPSHOT_PATH,
        updateSnapshots: true,
        ignoreSnapshots: false,
        onFetchFromServer: (_, snapshot) => {
          events.push(['server', snapshot.response.body]);
        },
        onFetchFromSnapshot: (_, snapshot) => {
          events.push(['cache', snapshot.response.body]);
        },
        onSnapshotUpdated: (_, snapshot) => {
          events.push(['updated', snapshot.response.body]);
        },
        createSnapshotFilename: createSnapshotFilename,
      })
    );

    const getContentType = (body: object | URLSearchParams | FormData) => {
      if (body instanceof FormData) {
        return undefined; // undici adds content-type automatically
      } else if (body instanceof URLSearchParams) {
        return 'application/x-www-form-urlencoded';
      } else {
        return 'application/json';
      }
    }

    try {
      server.listen();
      const request = [spec.uri, {
        method: spec.body ? 'POST' : 'GET',
        body: spec.body,
        headers: spec.body && getContentType(spec.body) ? {
          'Content-Type': getContentType(spec.body),
        } : {}
      }] as Parameters<typeof fetch>;
      const res1 = await fetch(...request).then(res => res.text())
      const res2 = await fetch(...request).then(res => res.text())
      expect(res1).toBe(JSON.stringify({ data: "1" }))
      expect(res1).toBe(res2);
      expect(events).toMatchObject([
        ['server', res1],
        ['updated', res1],
        ['cache', res1]
      ]);
    } finally {
      server.close();
    }
  })

});
