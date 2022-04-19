import { MockedRequest, ResponseTransformer, rest } from "msw";
import { join, dirname } from 'path';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { createHash } from 'crypto';

export * from './mask';

export type PlainObject = string | number | null | boolean | PlainObject[] | {
  [k: string]: PlainObject;
}

type SnapshotConfig = {
  snapshotDir: string;
  updateSnapshot?: boolean;
  createSnapshotName?: (req: MockedRequest) => PlainObject;
  onFetchFromCache?: (req: MockedRequest, snapshot: Snapshot) => void;
  onFetchFromServer?: (req: MockedRequest, snapshot: Snapshot) => void;
};

type Snapshot = {
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
    bodyText: string;
  };
};

/**
 * Create snapshot RequestHandler.
 */
export const snapshot = (config: SnapshotConfig) => {
  return rest.all(/.*/, async (req, res, ctx) => {
    const snapshotName = createSnapshotName(req, config);
    const snapshotPath = join(config.snapshotDir, req.url.hostname, req.url.pathname, `${snapshotName}.json`);
    if (existsSync(snapshotPath) && !config.updateSnapshot) {
      try {
        const snapshot = JSON.parse(readFileSync(snapshotPath).toString('utf8')) as Snapshot;
        config.onFetchFromCache?.(req, snapshot);
        return res(transform(snapshot));
      } catch (e) {
        console.error(`Can't parse snapshot file: ${snapshotPath}`, e);
      }
    }
    const response = await ctx.fetch(req);
    const bodyText = await response.text();
    const snapshot: Snapshot = {
      request: {
        method: req.method,
        url: req.url.toString(),
        body: req.body ?? null,
        headers: entriesHeaders(req.headers),
        cookies: req.cookies,
      },
      response: {
        status: response.status,
        statusText: response.statusText,
        bodyText: bodyText,
        headers: entriesHeaders(response.headers),
      }
    };
    config.onFetchFromServer?.(req, snapshot);
    mkdirSync(dirname(snapshotPath), { recursive: true });
    writeFileSync(snapshotPath, JSON.stringify(snapshot, undefined, 2));
    return res(transform(snapshot));
  });
};

/**
 * Create snapshot name from request.
 */
const createSnapshotName = (req: MockedRequest, config: SnapshotConfig) => {
  if (config.createSnapshotName) {
    const key = config.createSnapshotName(req);
    if (typeof key === 'string') {
      return key;
    }
    return createHash('md5').update(JSON.stringify(key), 'binary').digest('hex')
  }

  return createHash('md5').update(JSON.stringify([
    req.method,
    req.url.origin,
    req.url.searchParams.entries(),
    req.headers.raw(),
    req.cookies,
    req.body?.toString() ?? '',
  ]), 'binary').digest('hex');
};

/**
 * Transform response.
 */
const transform = (snapshot: Snapshot): ResponseTransformer => {
  return res => {
    res.status = snapshot.response.status;
    res.statusText = snapshot.response.statusText;
    res.body = snapshot.response.bodyText
    snapshot.response.headers.forEach(([k, v]) => {
      res.headers.set(k, v)
    });
    return res;
  };
};

/**
 * Headers#entries utility.
 */
const entriesHeaders = (headers: Headers) => {
  const entries: [string, string][] = [];
  headers.forEach((v, k) => {
    entries.push([k, v]);
  });
  return entries;
};

