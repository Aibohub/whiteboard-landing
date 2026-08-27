import { copyFile, mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const serverDir = resolve("dist/server");
const serverEntry = resolve(serverDir, "index.js");
const indexHtml = resolve("dist/index.html");
const notFoundHtml = resolve("dist/404.html");

const worker = `export default {
  async fetch(request, env) {
    if (!env?.ASSETS?.fetch) {
      return new Response("Site assets are unavailable.", { status: 503 });
    }

    const response = await env.ASSETS.fetch(request);
    if (response.status !== 404 || request.method !== "GET") {
      return response;
    }

    const fallbackUrl = new URL("/index.html", request.url);
    return env.ASSETS.fetch(new Request(fallbackUrl, request));
  },
};
`;

await mkdir(serverDir, { recursive: true });
await writeFile(serverEntry, worker, "utf8");
await copyFile(indexHtml, notFoundHtml);
