# Pixel Jadecraft（像素琢玉）

基于 Phaser 的 2D 像素玉文化游戏，计划串联采矿、鉴赏、玉器加工、纹样定制、图鉴和数字展厅。

## 当前状态

截至 2026 年 11 月 10 日，仓库已建立 Phaser 开发环境和环境就绪页面，生产构建曾通过检查。游戏玩法、美术资产、存档及任务系统处于待开发阶段。

当前页面以 960×540 逻辑分辨率显示环境状态，并启用像素采样。

## 技术环境

- Phaser 4.2.1
- Vite 8.3.7
- JavaScript ES Modules
- 已验证的本地工具为 Node.js 24.14.0 与 npm 11.9.0

依赖版本以 `package-lock.json` 为准。

## 本地运行

在仓库目录安装锁定依赖并启动开发服务。

```powershell
npm ci
npm run dev
```

在浏览器打开终端输出的本地地址，默认端口为 5173。服务运行期间保持终端开启，端口占用时以 Vite 实际输出为准。

## 构建与预览

```powershell
npm run build
npm run preview
```

构建产物位于 `dist/`。预览服务会输出可访问的本地地址。正式部署可将构建产物交给静态托管服务。

## 项目设计

首版交付目标日期为 **2026 年 11 月 30 日**。已确认的完整范围与开发顺序见 [项目计划](docs/PROJECT_PLAN.md)。

六类场景的概念图与说明见 [概念图集](docs/concept-art/README.md)。

详细设计与任务书保存于 Notion，访问权限由页面共享设置决定。[设计与任务书](https://app.notion.com/p/414a0724a2ab818084e1ff97631447d9)

## 主要文件

| 路径 | 用途 |
| --- | --- |
| `index.html` | 页面入口与基础样式 |
| `src/main.js` | Phaser 初始化与环境就绪场景 |
| `package.json` | 依赖与开发命令 |
| `package-lock.json` | 锁定依赖版本 |
| `docs/PROJECT_PLAN.md` | 已确认范围、开发顺序与交接说明 |
