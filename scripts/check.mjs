import { readdir, readFile, access } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { build, root } from "./build.mjs";
await build();
async function check(dir) {
  for (const item of await readdir(dir, { withFileTypes: true })) {
    const file = path.join(dir, item.name);
    if (item.isDirectory()) {
      if (!["assets", "vendor"].includes(item.name)) await check(file);
      continue;
    }
    if (!file.endsWith(".js") && !file.endsWith(".mjs")) continue;
    const result = spawnSync(process.execPath, ["--check", file], {
      encoding: "utf8",
    });
    if (result.status !== 0) throw new Error(result.stderr);
    const code = await readFile(file, "utf8");
    for (const match of code.matchAll(/from\s+['"](\.[^'"]+)['"]/g))
      await access(path.resolve(path.dirname(file), match[1]));
  }
}
await check(path.join(root, "dist"));
await check(path.join(root, "scripts"));
console.log("语法和本地模块引用检查通过");
