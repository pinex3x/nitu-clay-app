// 所有可以直接访问的页面；checkout 是弹窗流程，不是独立页面。
export const routes = [
  "home",
  "craft",
  "people",
  "person",
  "shop",
  "product",
  "me",
  "cart",
  "addresses",
  "orders",
  "favorites",
  "settings",
];

export function resolveRoute(hash, productCount) {
  const [name, rawId] = hash.replace(/^#\/?/, "").split("/");
  const parsed = Number(rawId);
  const id =
    Number.isInteger(parsed) && parsed >= 0 && parsed < productCount
      ? parsed
      : 0;
  return { route: routes.includes(name) ? name : "home", id };
}
