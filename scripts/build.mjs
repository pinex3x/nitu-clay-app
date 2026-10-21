import { cp, mkdir, readdir, readFile, writeFile, rm } from "node:fs/promises";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import path from "node:path";

export const root = fileURLToPath(new URL("../", import.meta.url));
export async function build() {
  const output = path.join(root, "dist");
  // 清理生成目录，保证移除的资源不会残留到下一次部署。
  await rm(output, { recursive: true, force: true });
  await mkdir(output, { recursive: true });
  await cp(path.join(root, "public"), output, {
    recursive: true,
    filter: (file) => !file.endsWith(".npz"),
  });
  await cp(path.join(root, "src"), output, { recursive: true });
  // 版本来自产物内容：代码或资产更新都会触发 Service Worker 更新。
  const hash = createHash("sha256");
  async function digest(directory) {
    const entries = (await readdir(directory, { withFileTypes: true })).sort(
      (a, b) => a.name.localeCompare(b.name, "en"),
    );
    for (const entry of entries) {
      const file = path.join(directory, entry.name);
      if (entry.isDirectory()) await digest(file);
      else {
        hash.update(path.relative(output, file).split(path.sep).join("/"));
        hash.update(await readFile(file));
      }
    }
  }
  await digest(output);
  const version = hash.digest("hex").slice(0, 16);
  const sw = path.join(output, "sw.js");
  await writeFile(
    sw,
    (await readFile(sw, "utf8")).replace("__BUILD_VERSION__", version),
  );
  console.log(`已构建 dist/，缓存版本 ${version}`);
}
if (process.argv[1] === fileURLToPath(import.meta.url)) await build();
