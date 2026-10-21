import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { build, root } from "./build.mjs";

await build();
const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".webmanifest": "application/manifest+json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".webp": "image/webp",
  ".bin": "application/octet-stream",
};
// 开发时直接读取源码和静态资源；刷新即可看到修改，无需监听器。
createServer(async (req, res) => {
  try {
    const pathname = decodeURIComponent(
      new URL(req.url, "http://localhost").pathname,
    );
    const relative = pathname === "/" ? "index.html" : pathname.slice(1);
    if (relative.split("/").includes("..")) throw new Error("Invalid path");
    if (relative === "sw.js") {
      res.writeHead(200, {
        "Content-Type": "text/javascript",
        "Cache-Control": "no-store",
      });
      res.end(
        'self.addEventListener("install", () => self.skipWaiting()); self.addEventListener("activate", e => e.waitUntil(self.registration.unregister().then(() => self.clients.claim())));',
      );
      return;
    }
    let file = path.join(root, "src", relative);
    try {
      await stat(file);
    } catch {
      file = path.join(root, "public", relative);
    }
    const body = await readFile(file);
    res.writeHead(200, {
      "Content-Type": types[path.extname(file)] || "application/octet-stream",
      "Cache-Control": "no-store",
    });
    res.end(body);
  } catch {
    res.writeHead(404);
    res.end("Not found");
  }
}).listen(8080, "127.0.0.1", () =>
  console.log("开发预览 http://localhost:8080；修改后刷新。Ctrl+C 停止。"),
);
