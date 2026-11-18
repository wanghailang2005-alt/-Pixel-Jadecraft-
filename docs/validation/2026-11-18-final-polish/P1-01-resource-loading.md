# P1-01 资源与加载（2026-11-18）

## 改动

新增 `vite.config.js`：将 `phaser` 运行时拆为独立、可缓存的 vendor chunk；应用入口从原来的约 1.69 MB 降到约 325.49 kB（gzip 126.01 kB）。Phaser 发布包本身约 1.37 MB，作为显式 vendor 预算设置 `chunkSizeWarningLimit: 1400`，避免把已知依赖误报为应用回归；没有改动场景加载、素材 URL 或存档逻辑。

## 验证

- `npm test`：137/137 通过，432/432 加工组合通过。
- `npm run build`：通过，无 Vite chunk 警告。
- `dist/assets/index-DR0Oj7w9.js`：325.49 kB。
- `dist/assets/phaser-C831z-fk.js`：1,367.07 kB，gzip 357.00 kB，作为明确的依赖预算保留。
- 生产预览 `vite preview --host 127.0.0.1 --port 4173` 在无头 Chromium 下打开成功；网络记录确认 `index-DR0Oj7w9.js`、`phaser-C831z-fk.js`、字体和 v1 场景素材均返回 200，页面错误为空。
- 四尺寸菜单截图：`.tmp/validation/2026-11-18-final-polish/p1-menu-1280x720.png`、`p1-menu-1024x768.png`、`p1-menu-800x700.png`、`p1-menu-640x700.png`。

## 已知差距

当前项目的 Phaser 依赖仍是单一 vendor 模块，继续拆分需要改变第三方运行时边界，暂不为隐藏警告而冒险改动。

## 2026-11-19 P1-4 发布预览复验

- `npm run build` 通过。Phaser 场景注册为 Boot、menu、workshop、gallery。检查了发布资产清单与入口脚本中的矿洞和矿工资源名。
- 生产预览完成 800×700 与 640×700 的新档、矿洞旧档导入回归。详细步骤、截图索引与上线核查清单见 [跨模块可靠性门](cross-module-reliability.md)。
