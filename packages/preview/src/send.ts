import type { IncomingMessage, OutgoingHttpHeaders, ServerResponse } from 'http';
import getEtag from 'etag';
import type { SourceMap } from 'rollup';

const alias: Record<string, string | undefined> = {
  js: 'application/javascript',
  css: 'text/css',
  html: 'text/html',
  json: 'application/json',
};

export interface SendOptions {
  etag?: string;
  cacheControl?: string;
  headers?: OutgoingHttpHeaders;
  map?: SourceMap | null;
}

export function send(
  req: IncomingMessage,
  res: ServerResponse,
  content: string | Buffer,
  type: string,
  options: SendOptions = {}
): void {
  const {
    etag = getEtag(content, { weak: true }),
    cacheControl = 'no-cache',
    headers,
    map,
  } = options;

  if (res.writableEnded) {
    return;
  }

  if (req.headers['if-none-match'] === etag) {
    res.statusCode = 304;
    res.end();

    return;
  }

  res.setHeader('Content-Type', alias[type] ?? type);
  res.setHeader('Cache-Control', cacheControl);
  res.setHeader('Etag', etag);

  if (headers != null) {
    for (const name in headers) {
      const value = headers[name];
      if (value != null) {
        res.setHeader(name, value);
      }
    }
  }

  // inject source map reference
  if (map?.mappings != null) {
    if (typeof content === 'string') {
      content += genSourceMapString(map);
    } else {
      content = Buffer.concat([content, Buffer.from(genSourceMapString(map))]);
    }
  }

  res.statusCode = 200;
  res.end(content);
}

function genSourceMapString(map: SourceMap | string | undefined): string {
  if (typeof map !== 'string') {
    map = JSON.stringify(map);
  }

  return `\n//# sourceMappingURL=data:application/json;base64,${Buffer.from(map).toString(
    'base64'
  )}`;
}
