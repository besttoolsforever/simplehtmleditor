import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, isAbsolute, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT_DIR = resolve(fileURLToPath(new URL('../../', import.meta.url)));
const PORT = Number(process.env.PORT || 4173);

const MIME_TYPES = {
    '.css': 'text/css; charset=utf-8',
    '.html': 'text/html; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.mjs': 'application/javascript; charset=utf-8',
    '.svg': 'image/svg+xml',
    '.webp': 'image/webp'
};

/**
 * Maps a request path to a file inside the project root.
 *
 * @param {string} requestUrl - Incoming request URL.
 * @returns {Promise<string|null>} Safe file path or null when outside root.
 */
async function resolveRequestPath(requestUrl) {
    const url = new URL(requestUrl || '/', `http://127.0.0.1:${PORT}`);
    const decodedPath = decodeURIComponent(url.pathname);
    let filePath = resolve(ROOT_DIR, `.${decodedPath}`);
    const relativePath = relative(ROOT_DIR, filePath);

    if (relativePath.startsWith('..') || isAbsolute(relativePath)) {
        return null;
    }

    const fileStat = await stat(filePath).catch(() => null);
    if (fileStat?.isDirectory()) {
        filePath = resolve(filePath, 'index.html');
    }

    return filePath;
}

const server = createServer(async (request, response) => {
    try {
        const filePath = await resolveRequestPath(request.url);
        if (!filePath) {
            response.writeHead(403);
            response.end('Forbidden');
            return;
        }

        const body = await readFile(filePath);
        const contentType = MIME_TYPES[extname(filePath).toLowerCase()] || 'application/octet-stream';
        response.writeHead(200, {
            'content-type': contentType,
            'cache-control': 'no-store'
        });
        response.end(body);
    } catch {
        response.writeHead(404);
        response.end('Not found');
    }
});

server.listen(PORT, '127.0.0.1', () => {
    console.log(`Static test server running at http://127.0.0.1:${PORT}`);
});
