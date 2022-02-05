import { MockedRequest, ResponseComposition, rest } from "msw";
import { join, dirname } from 'path';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { createHash } from 'crypto';

type PlainObject = string | number | null | boolean | PlainObject[] | {
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
  status: number;
  statusText: string;
  headers: [string, string][];
  body: string;
  bodyJSON: string;
};

/**
 * Create snapshot RequestHandler.
 */
export const snapshot = (config: SnapshotConfig) => {
  return rest.all(/.*/, async (req, res, ctx) => {
    const snapshotName = createSnapshotName(req, config);
    const snapshotPath = join(config.snapshotDir, req.url.hostname, req.url.pathname, `${snapshotName}.json`);
    if (existsSync(snapshotPath) && !config.updateSnapshot) {
      const snapshot = JSON.parse(readFileSync(snapshotPath).toString('utf8')) as Snapshot;
      config.onFetchFromCache?.(req, snapshot);
      return makeResponse(res, snapshot);
    }
    const response = await ctx.fetch(req);
    const body = Buffer.from(await response.arrayBuffer()).toString('base64');
    const snapshot: Snapshot = {
      status: response.status,
      statusText: response.statusText,
      headers: entriesHeaders(response.headers),
      body: body,
      bodyJSON: createBodyJSON(body),

    };
    config.onFetchFromServer?.(req, snapshot);
    mkdirSync(dirname(snapshotPath), { recursive: true });
    writeFileSync(snapshotPath, JSON.stringify(snapshot, undefined, 2));
    return makeResponse(res, snapshot);
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
    req.body?.toString(),
  ]), 'binary').digest('hex');
};

/**
 *  Make response with snapshot.
 */
const makeResponse = (res: ResponseComposition, snapshot: Snapshot) => {
  return res(res => {
    res.status = snapshot.status;
    res.statusText = snapshot.statusText;
    snapshot.headers.forEach(([k, v]) => res.headers.set(k, v))
    res.body = Buffer.from(snapshot.body, 'base64');
    return res;
  });
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

/**
 * Create human readable body text.
 */
const createBodyJSON = (body: string) => {
  try {
    return JSON.parse(Buffer.from(body, 'base64').toString('utf-8'));
  } catch (e) {
    return undefined;
  }
}

