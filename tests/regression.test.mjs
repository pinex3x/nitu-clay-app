import test from "node:test";
import assert from "node:assert/strict";
import { readFile, access } from "node:fs/promises";
import { resolveRoute } from "../src/core/router.js";
import { createViews } from "../dist/ui/views.js";

test("路由仅允许实际页面，商品编号始终可用", () => {
  for (const hash of ["", "#/checkout", "#/unknown"])
    assert.equal(resolveRoute(hash, 3).route, "home");
  for (const value of ["-1", "3", "1.5", "Infinity", "abc", ""])
    assert.equal(resolveRoute("#/product/" + value, 3).id, 0);
  assert.deepEqual(resolveRoute("#/craft/2", 3), { route: "craft", id: 2 });
});

test("拆分后的默认页面和组件输出与原始交付版一致", async () => {
  const expected = JSON.parse(
    await readFile(
      new URL("./fixtures/original-views.json", import.meta.url),
      "utf8",
    ),
  );
  const views = createViews({
    selected: 0,
    route: "",
    id: 0,
    phase: 0,
    progress: 0,
    sound: false,
    filter: "全部",
    personFilter: "全部",
    search: "",
    orderFilter: "全部",
    qty: 1,
    photo: 0,
    favs: [],
    orders: [],
    addresses: [],
    cart: [],
    count: () => 0,
    total: () => 0,
  });
  for (const [name, html] of Object.entries(expected))
    assert.equal(views[name](), html, name);
});

test("PWA 预缓存的本地文件全部存在", async () => {
  const sw = await readFile(new URL("../dist/sw.js", import.meta.url), "utf8");
  const shell = sw.match(/const SHELL = (\[[\s\S]*?\]);/)[1];
  for (const item of JSON.parse(shell.replace(/,\s*\]/, "]")))
    await access(new URL("../dist/" + item, import.meta.url));
});
