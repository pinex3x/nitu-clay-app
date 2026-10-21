# 泥途 · 掌心里的泥塑

手机优先的泥塑展示与模拟商城。原生 JavaScript ES Modules + Three.js + PWA，无后端。人物、价格、订单均为演示数据，不涉及真实支付。

正式网站：**https://pinex3x.github.io/nitu-clay-app/**（公开访问，无需登录）

源码仓库：https://github.com/pinex3x/nitu-clay-app

推送 `main` 后由 GitHub Actions 检查并自动部署 `dist/`，PR 仅检查。完整流程见 [使用与部署说明](使用与部署说明.md)。

## 开始开发

需要 Node.js 22 或更新版本。

```bash
npm ci
npm run dev
```

打开 http://localhost:8080，修改 `src/` 后刷新浏览器。开发服务仅监听本机，禁用离线缓存；部署版本仍支持 PWA。

```bash
npm run check        # 构建、语法与模块引用检查
npm test             # 路由边界与页面回归
npm run format:check # 格式检查
npm run build        # 输出可直接发布的 dist/
```

## 修改入口

| 需要修改                         | 文件                                     |
| -------------------------------- | ---------------------------------------- |
| 商品、价格、工序文案             | `src/data/catalog.js`                    |
| 页面 HTML 与公共页面组件         | `src/ui/views.js`                        |
| SVG 图标                         | `src/ui/icons.js`                        |
| 页面事件、播放、购物车和模拟结算 | `src/app.js`                             |
| 可访问路由与参数校验             | `src/core/router.js`                     |
| 浏览器存储与 HTML 转义           | `src/core/storage.js`、`src/core/dom.js` |
| 三维材质、交互及兼容模式         | `src/rendering/clay.js`                  |
| 样式                             | `src/style.css`                          |
| 静态资源、Three.js 与许可        | `public/`                                |
| PWA 缓存                         | `src/sw.js`                              |
| 模型生成和离线渲染               | `scripts/*.py`                           |

`src/` 和 `public/` 是维护入口，`dist/` 是生成结果，不直接修改。构建不打包、不压缩，发布文件仍可阅读。`public` 内容复制到发布根目录，因此源码中的模型 URL 和 vendor 导入按发布目录解析。旧的 Python 静态服务器命令仍可预览构建后的 `dist`。

接手流程、模块边界、验收清单和未完成事项见 [开发交接](docs/HANDOFF.md)。模型再生成和托管背景见 [使用与部署说明](使用与部署说明.md)。

原始导出代码和说明已保存在 `archive/original-source-v2.zip`，不包含重复的大体积静态资产。`SOURCE_VERSION.json` 记录原始来源与本次本地整理；原始校验清单保留在本地归档中（不提交），根目录 `SHA256SUMS.txt` 对应纳入版本控制的文件（不含清单自身）。
