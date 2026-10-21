import test from "node:test";
import assert from "node:assert/strict";
import { readFile, access } from "node:fs/promises";
import vm from "node:vm";

const base = "https://pinex3x.github.io/nitu-clay-app/";
const workerSource = await readFile(
  new URL("../dist/sw.js", import.meta.url),
  "utf8",
);
function worker(scope = base) {
  const handlers = {},
    deleted = [],
    puts = [],
    stores = new Map();
  const prefix = `nitu:${scope}:`;
  stores.set(`${prefix}old`, new Map());
  stores.set("nitu:https://pinex3x.github.io/other/:old", new Map());
  stores.set("nitu-mobile-v3", new Map());
  let offline = false;
  const context = vm.createContext({
    URL,
    Response,
    self: {
      registration: { scope },
      clients: { claim: async () => {} },
      skipWaiting() {},
      addEventListener(name, fn) {
        handlers[name] = fn;
      },
    },
    caches: {
      keys: async () => [...stores.keys()],
      delete: async (key) => {
        deleted.push(key);
        return stores.delete(key);
      },
      open: async (key) => {
        if (!stores.has(key)) stores.set(key, new Map());
        return {
          addAll: async (urls) => {
            for (const url of urls)
              stores
                .get(key)
                .set(new URL(url, scope).href, new Response("shell"));
          },
          put: async (req, response) => {
            puts.push(req.url);
            stores.get(key).set(req.url, response);
          },
          match: async (req) => stores.get(key).get(req.url)?.clone(),
        };
      },
    },
    fetch: async () => {
      if (offline) throw new Error("offline");
      return new Response("network-v2");
    },
  });
  vm.runInContext(workerSource, context);
  return {
    handlers,
    deleted,
    puts,
    stores,
    setOffline: () => {
      offline = true;
    },
  };
}
async function lifecycle(w, name) {
  const jobs = [];
  w.handlers[name]({ waitUntil: (p) => jobs.push(p) });
  await Promise.all(jobs);
}
async function request(w, url) {
  const jobs = [];
  let response;
  w.handlers.fetch({
    request: { url, method: "GET" },
    waitUntil: (p) => jobs.push(p),
    respondWith: (p) => {
      response = p;
    },
  });
  const result = await response;
  await Promise.all(jobs);
  return result;
}

test("manifest 和所有预缓存资源位于项目子路径", async () => {
  const manifest = JSON.parse(
    await readFile(
      new URL("../dist/manifest.webmanifest", import.meta.url),
      "utf8",
    ),
  );
  for (const value of [
    manifest.id,
    manifest.scope,
    manifest.start_url,
    ...manifest.icons.map((i) => i.src),
  ])
    assert.ok(new URL(value, base).href.startsWith(base));
  assert.equal(new URL(manifest.id, base).href, base);
  const shell = JSON.parse(
    workerSource
      .match(/const SHELL = (\[[\s\S]*?\]);/)[1]
      .replace(/,\s*\]/, "]"),
  );
  for (const item of shell) {
    assert.ok(new URL(item, base).href.startsWith(base));
    await access(new URL("../dist/" + item, import.meta.url));
  }
  assert.ok(!workerSource.includes("__BUILD_VERSION__"));
});

test("激活只删除本项目旧缓存，不触及同源其他应用和旧根目录缓存", async () => {
  const w = worker();
  await lifecycle(w, "install");
  await lifecycle(w, "activate");
  assert.deepEqual(w.deleted, [`nitu:${base}:old`]);
  assert.ok(w.stores.has("nitu:https://pinex3x.github.io/other/:old"));
  assert.ok(w.stores.has("nitu-mobile-v3"));
});

test("网络更新写入本项目缓存，离线仅读取本项目；未访问资源返回503", async () => {
  const w = worker();
  await lifecycle(w, "install");
  const url = base + "assets/models/0.json";
  assert.equal(await (await request(w, url)).text(), "network-v2");
  w.setOffline();
  assert.equal(await (await request(w, url)).text(), "network-v2");
  assert.equal((await request(w, base + "missing.bin")).status, 503);
  assert.equal(
    await request(w, "https://pinex3x.github.io/other/app.js"),
    undefined,
  );
  assert.equal(await request(w, "https://example.com/font.woff"), undefined);
});
