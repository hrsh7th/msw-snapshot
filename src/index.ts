import { TextEncoder, TextDecoder } from 'util';
import { MockedRequest, ResponseTransformer, rest } from "msw";
import { join, dirname } from 'path';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { createHash } from 'crypto';

export * from './mask';

export type PlainObject = string | number | null | boolean | PlainObject[] | {
  [k: string]: PlainObject;
}

export type SnapshotConfig = {
  /**
   * Specify msw's test pattern.
   */
  test?: RegExp;

  /**
   * Specify snapshot directory path.
   */
  snapshotPath: string;

  /**
   * Specify whether to update snapshots.
   * - true
   *   - update snapshot
   * - false
   *   - don't update snapshot
   * @default false
   */
  updateSnapshots?: boolean;

  /**
   * Specify whether to ignore snapshots.
   * - true
   *   - don't use existing snapshot
   * - false
   *   - use existing snapshot if it exists
   * @default false
   */
  ignoreSnapshots?: boolean;

  /**
   * Create snapshot filename from request.
   */
  createSnapshotFilename?: (req: MockedRequest) => Promise<string>;

  /**
   * Callback when response is received from server.
   */
  onFetchFromServer?: (req: MockedRequest, snapshot: Snapshot) => void;

  /**
   * Callback when response is received from snapshot.
   */
  onFetchFromSnapshot?: (req: MockedRequest, snapshot: Snapshot) => void;

  /**
   *  Callback when snapshot is updated.
   */
  onSnapshotUpdated?: (req: MockedRequest, snapshot: Snapshot) => void;
};

export type Snapshot = {
  request: {
    method: string;
    url: string;
    body: PlainObject;
    headers: [string, string][];
    cookies: Record<string, string>;
  };
  response: {
    status: number;
    statusText: string;
    headers: [string, string][];
    body: string;
  };
};

/**
 * Create snapshot RequestHandler.
 */
export const snapshot = (config: SnapshotConfig) => {
  return rest.all(config.test ?? /.*/, async (req, res, ctx) => {
    const snapshotName = await createSnapshotFilename(req, config);
    const snapshotPath = join(config.snapshotPath, req.url.hostname, req.url.pathname, `${snapshotName}.json`);

    // Fetch from snapshot
    if (!config.ignoreSnapshots && existsSync(snapshotPath)) {
      try {
        const snapshot = JSON.parse(readFileSync(snapshotPath).toString('utf8')) as Snapshot;
        config.onFetchFromSnapshot?.(req, snapshot);
        return res(responseSnapshot(snapshot));
      } catch (e) {
        console.error(`Can't parse snapshot file: ${snapshotPath}`, e);
      }
    }

    // Fetch from server
    const response = await ctx.fetch(req);
    response.headers.delete('content-encoding'); // msw-snapshot does not support compression.
    const snapshot: Snapshot = {
      request: {
        method: req.method,
        url: req.url.toString(),
        body: new TextDecoder('utf-8').decode(await req.arrayBuffer()),
        headers: getSortedEntries(req.headers),
        cookies: req.cookies,
      },
      response: {
        status: response.status,
        statusText: response.statusText,
        body: new TextDecoder('utf-8').decode(await response.arrayBuffer()),
        headers: getSortedEntries(response.headers),
      }
    };
    config.onFetchFromServer?.(req, snapshot);

    // Update snapshot if needed
    if (config.updateSnapshots) {
      mkdirSync(dirname(snapshotPath), { recursive: true });
      writeFileSync(snapshotPath, JSON.stringify(snapshot, undefined, 2));
      config.onSnapshotUpdated?.(req, snapshot);
    }

    return res(responseSnapshot(snapshot));
  });
};

/**
 * Create snapshot name from request.
 */
const createSnapshotFilename = async (req: MockedRequest, config: SnapshotConfig) => {
  // TODO: it's fragile for future update...
  const cloned = new MockedRequest(req.url, {
    ...req,
    body: (req as any)._body
  });

  if (config.createSnapshotFilename) {
    return await config.createSnapshotFilename(cloned);
  }

  return toHashString([
    cloned.method,
    cloned.url.origin,
    cloned.url.pathname,
    getSortedEntries(cloned.url.searchParams),
    getSortedEntries(cloned.headers),
    getSortedEntries(cloned.cookies),
    await cloned.text(),
  ]);
};

/**
 * Transform response.
 */
function responseSnapshot(snapshot: Snapshot): ResponseTransformer {
  return res => {
    res.status = snapshot.response.status;
    res.statusText = snapshot.response.statusText;
    res.body = new TextEncoder().encode(snapshot.response.body).buffer;
    snapshot.response.headers.forEach(([k, v]) => {
      res.headers.append(k, v)
    });
    return res;
  };
};

/**
 * Get sorted array of [key, val] tuple from ***#entries.
 */
export function getSortedEntries(iter: object | URLSearchParams | Headers): [string, string][] {
  if (iter instanceof Headers) {
    const entries: [string, string][] = []
    iter.forEach((v, k) => entries.push([k, v]))
    entries.sort(([a], [b]) => a.localeCompare(b));
    return entries;
  } else if (iter instanceof URLSearchParams) {
    const keys = Array.from(iter.keys())
    keys.sort()
    return keys.map(k => [k, iter.get(k)!]);
  }
  const entries = Object.entries(iter);
  entries.sort(([a], [b]) => a.localeCompare(b));
  return entries;
};

/**
 *  Create hash string from object.
 */
export function toHashString(object: PlainObject): string {
  return createHash('md5').update(JSON.stringify(object), 'binary').digest('hex');
}
