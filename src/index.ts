import { TextDecoder } from 'node:util';
import { bypass, DefaultBodyType, http, HttpHandler, StrictRequest } from "msw";
import { join, dirname } from 'node:path';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

export * from './mask.js';

export type PlainObject = string | number | null | boolean | PlainObject[] | {
  [k: string]: PlainObject;
}

export type Info = {
  request: StrictRequest<DefaultBodyType>;
  cookies: Record<string, string | string[]>;
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
  createSnapshotFilename?: (info: Info) => Promise<string>;

  /**
   * Callback when response is received from server.
   */
  onFetchFromServer?: (info: Info, snapshot: Snapshot) => void;

  /**
   * Callback when response is received from snapshot.
   */
  onFetchFromSnapshot?: (info: Info, snapshot: Snapshot) => void;

  /**
   *  Callback when snapshot is updated.
   */
  onSnapshotUpdated?: (info: Info, snapshot: Snapshot) => void;
};

export type Snapshot = {
  request: {
    method: string;
    url: string;
    body: PlainObject;
    headers: [string, string][];
    cookies: Record<string, string | string[]>;
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
export const snapshot = (config: SnapshotConfig): HttpHandler => {
  return http.all(config.test ?? /.*/, async (info) => {
    const url = new URL(info.request.url);
    const snapshotName = await createSnapshotFilename(info, config);
    const snapshotPath = join(config.snapshotPath, url.hostname, url.pathname, `${snapshotName}.json`);

    // Fetch from snapshot
    if (!config.ignoreSnapshots && existsSync(snapshotPath)) {
      try {
        const snapshot = JSON.parse(readFileSync(snapshotPath).toString('utf8')) as Snapshot;
        config.onFetchFromSnapshot?.(info, snapshot);
        return new Response(new TextEncoder().encode(snapshot.response.body), {
          headers: new Headers(snapshot.response.headers),
          status: snapshot.response.status,
          statusText: snapshot.response.statusText,
        });
      } catch (e) {
        console.error(`Can't parse snapshot file: ${snapshotPath}`, e);
      }
    }

    // Fetch from server
    const response = await fetch(bypass(info.request));
    const snapshot: Snapshot = {
      request: {
        method: info.request.method,
        url: info.request.url,
        body: new TextDecoder('utf-8').decode(await info.request.arrayBuffer()),
        headers: getSortedEntries(info.request.headers),
        cookies: info.cookies,
      },
      response: {
        status: response.status,
        statusText: response.statusText,
        body: new TextDecoder('utf-8').decode(await response.arrayBuffer()),
        headers: getSortedEntries(response.headers),
      }
    };
    config.onFetchFromServer?.(info, snapshot);

    // Update snapshot if needed
    if (config.updateSnapshots) {
      mkdirSync(dirname(snapshotPath), { recursive: true });
      writeFileSync(snapshotPath, JSON.stringify(snapshot, undefined, 2));
      config.onSnapshotUpdated?.(info, snapshot);
    }

    return new Response(new TextEncoder().encode(snapshot.response.body), {
      headers: new Headers(snapshot.response.headers),
      status: snapshot.response.status,
      statusText: snapshot.response.statusText,
    });
  });
};

/**
 * Create snapshot name from request.
 */
const createSnapshotFilename = async (info: Info, config: SnapshotConfig) => {
  const cloned = info.request.clone();
  if (config.createSnapshotFilename) {
    return await config.createSnapshotFilename({ ...info, request: cloned });
  }

  const url = new URL(cloned.url);
  return toHashString([
    cloned.method,
    url.origin,
    url.pathname,
    getSortedEntries(url.searchParams),
    getSortedEntries(cloned.headers),
    getSortedEntries(info.cookies),
    await cloned.text(),
  ]);
};

/**
 * Get sorted array of [key, val] tuple from ***#entries.
 */
export function getSortedEntries(iter: object | FormData | URLSearchParams | Headers): [string, string][] {
  if (iter instanceof Headers) {
    const entries: [string, string][] = []
    iter.forEach((v, k) => entries.push([k, v]))
    entries.sort(([a], [b]) => a.localeCompare(b));
    return entries;
  } else if (iter instanceof FormData) {
    const entries: [string, string][] = []
    iter.forEach((v, k) => entries.push([k, v.toString()]))
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
