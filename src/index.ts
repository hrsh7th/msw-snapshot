import { TextDecoder } from 'node:util';
import { DefaultBodyType, http, HttpHandler, StrictRequest } from "msw";
import { dirname, join } from 'node:path';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const pureFetch = globalThis.fetch;

export * from './mask.js';

export type PlainObject = string | number | null | boolean | PlainObject[] | {
  [k: string]: PlainObject;
}

export type Info = {
  request: StrictRequest<DefaultBodyType>;
  cookies: Record<string, string | string[]>;
  context: typeof context;
}

export type SnapshotConfig = {
  /**
   * Specify msw's test pattern.
   */
  test?: RegExp;

  /**
   * Specify snapshot directory path.
   */
  basePath: string;

  /**
   * Specify whether to update snapshots.
   * - true (all)
   *   - update snapshot
   * - missing
   *   - update snapshot if snapshot is missing
   * - false (none)
   *   - don't update snapshot
   * @default false
   */
  updateSnapshots?: boolean | 'none' | 'all' | 'missing';

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
  createSnapshotPath?: (info: Info) => Promise<string>;

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
    cookies: [string, string][];
  };
  response: {
    status: number;
    statusText: string;
    headers: [string, string][];
    body: string;
  };
};

/**
 * Default namespace.
 */
export const DEFAULT_NAMESPACE = 'default';

/**
 * Context of snapshotting.
 * You can use it for separating snapshot files with modifying context.namespace.
 */
export const context = {
  namespace: DEFAULT_NAMESPACE,
};

/**
 * Create snapshot RequestHandler.
 */
export const snapshot = (config: SnapshotConfig): HttpHandler => {
  return http.all(config.test ?? /.*/, async (mswInfo) => {
    const clonedInfo = () => {
      return {
        request: mswInfo.request.clone(),
        cookies: { ...mswInfo.cookies },
        context: context,
      };
    }
    const snapshotPath = join(config.basePath, await createSnapshotPath(clonedInfo(), config));

    // Fetch from snapshot
    if (!config.ignoreSnapshots && existsSync(snapshotPath)) {
      try {
        const snapshot = JSON.parse(readFileSync(snapshotPath).toString('utf8')) as Snapshot;
        config.onFetchFromSnapshot?.(clonedInfo(), snapshot);
        const filteredHeaders = snapshot.response.headers.filter(
          ([key, _]) =>
          !key.toLowerCase().includes('content-encoding') &&
          !key.toLowerCase().includes('transfer-encoding')
        );
        return new Response(new TextEncoder().encode(snapshot.response.body), {
          headers: new Headers(filteredHeaders),
          status: snapshot.response.status,
          statusText: snapshot.response.statusText,
        });
      } catch (e) {
        console.error(`Can't parse snapshot file: ${snapshotPath}`, e);
      }
    }

    // Fetch from server
    const response = await pureFetch(mswInfo.request.clone());
    const snapshot: Snapshot = {
      request: {
        method: mswInfo.request.method,
        url: mswInfo.request.url,
        body: new TextDecoder('utf-8').decode(await mswInfo.request.clone().arrayBuffer()),
        headers: getSortedEntries(mswInfo.request.headers),
        cookies: getSortedEntries(mswInfo.cookies),
      },
      response: {
        status: response.status,
        statusText: response.statusText,
        body: new TextDecoder('utf-8').decode(await response.arrayBuffer()),
        headers: getSortedEntries(response.headers),
      }
    };
    config.onFetchFromServer?.(clonedInfo(), snapshot);

    // Update snapshot if needed
    let shouldUpdateSnapshots = false
    shouldUpdateSnapshots = shouldUpdateSnapshots || config.updateSnapshots === true;
    shouldUpdateSnapshots = shouldUpdateSnapshots || config.updateSnapshots === 'all';
    shouldUpdateSnapshots = shouldUpdateSnapshots || config.updateSnapshots === 'missing' && !existsSync(snapshotPath);
    if (shouldUpdateSnapshots) {
      mkdirSync(dirname(snapshotPath), { recursive: true });
      writeFileSync(snapshotPath, JSON.stringify(snapshot, undefined, 2));
      config.onSnapshotUpdated?.(clonedInfo(), snapshot);
    }

    // Filter out compression-related headers since we're manually handling the body
    const filteredHeaders = snapshot.response.headers.filter(
      ([key, _]) =>
      !key.toLowerCase().includes('content-encoding') &&
      !key.toLowerCase().includes('transfer-encoding')
    );

    return new Response(new TextEncoder().encode(snapshot.response.body), {
      headers: new Headers(filteredHeaders),
      status: snapshot.response.status,
      statusText: snapshot.response.statusText,
    });
  });
};

/**
 * Get sorted array of [key, val] tuple from ***#entries.
 */
export function getEntries(iter: Record<string, string | string[]> | FormData | URLSearchParams | Headers): [string, string][] {
  if (iter instanceof Headers) {
    const entries: [string, string][] = []
    iter.forEach((v, k) => entries.push([k, v]))
    return entries;
  } else if (iter instanceof FormData) {
    const entries: [string, string][] = []
    iter.forEach((v, k) => entries.push([k, v.toString()]))
    return entries;
  } else if (iter instanceof URLSearchParams) {
    return Array.from(iter.entries());
  }
  return Object.entries(iter).map(([k, v]) => [k, Array.isArray(v) ? v.join(',') : v]);
}

/**
 * Get sorted array of [key, val] tuple from ***#entries.
 */
export function getSortedEntries(iter: Record<string, string | string[]> | FormData | URLSearchParams | Headers): [string, string][] {
  return getEntries(iter).sort(([a], [b]) => a.localeCompare(b));
};

/**
 *  Create hash string from object.
 */
export function toHashString(object: PlainObject): string {
  return createHash('md5').update(JSON.stringify(object), 'binary').digest('hex');
}

/**
 * Create snapshot name from request.
 */
async function createSnapshotPath(info: Info & { context: typeof context }, config: SnapshotConfig) {
  if (config.createSnapshotPath) {
    return await config.createSnapshotPath(info);
  }

  const url = new URL(info.request.url);
  return [
    context.namespace,
    info.request.method,
    url.origin,
    url.pathname,
  ].join('/') + '/' + toHashString([
    getSortedEntries(url.searchParams),
    getSortedEntries(info.request.headers),
    getSortedEntries(info.cookies),
    new TextDecoder('utf-8').decode(await info.request.arrayBuffer()),
  ]);
};
