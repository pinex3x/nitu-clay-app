// 保留旧版本存储键，升级不会清空用户数据。
export const read = (k, f) => {
    try {
      return JSON.parse(localStorage.getItem("nitu-app-" + k)) ?? f;
    } catch {
      return f;
    }
  },
  save = (k, v) => localStorage.setItem("nitu-app-" + k, JSON.stringify(v));
