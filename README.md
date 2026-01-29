# Spotify Desktop Lyrics（Electron）

> 一个常驻桌面的 Spotify 歌词悬浮层原型，提供透明浮窗、歌词同步、播放控制桥接与设置面板。

## 功能特性
- 透明无边框歌词悬浮窗，支持悬停显隐与锁定
- 设置面板（独立窗口）可查看歌词列表、导入歌词、调整偏移
- 播放控制桥接：上一曲/下一曲/播放暂停指令通过本地 HTTP 服务对接
- 多源歌词获取与缓存：网易云 / 酷狗 / Spotify / LRCLIB / lyrics.ovh
- 托盘常驻与自动更新（打包后启用）

## 运行截图
![预览](src/image/example.png)

## 环境要求
- Node.js 18+
- Windows（当前打包配置仅支持 Windows NSIS）

## 安装与运行
```bash
# 安装依赖
pnpm install

# 开发模式启动
pnpm dev
```
如果使用 npm：
```bash
npm install
npm run dev
```

## 打包构建
```bash
pnpm dist
```
生成产物默认输出到 `dist/`。

## 目录结构
```
.
├── main.js                # Electron 主进程入口
├── preload.js             # 预加载脚本（暴露桌面 API）
├── src/
│   ├── index.html         # 视图模板（歌词层 + 设置面板）
│   ├── renderer.js        # 渲染进程逻辑
│   ├── styles.css         # 样式
│   └── image/             # 应用图标与截图
└── 接口逻辑汇总.md         # 接口逻辑参考（历史项目总结）
```

## 核心机制说明
### 1. 主进程（main.js）
- 创建歌词主窗口与设置窗口
- 托盘常驻与退出控制
- 监听 IPC：窗口置顶、窗口隐藏、打开设置、打开 DevTools
- 启动本地播放桥接服务（`http://127.0.0.1:3789`）

### 2. 预加载桥接（preload.js）
通过 `contextBridge` 暴露 `desktopApi`：
- 窗口控制：置顶、关闭、隐藏、打开设置/控制台
- 监听播放状态、窗口范围、悬停状态

### 3. 播放桥接协议（本地 HTTP）
> 由外部模块/脚本对接 Spotify 播放状态与控制指令。

- **播放状态推送**（外部 -> 本应用）
  - `POST http://127.0.0.1:3789/spotify-playback`
  - Body：
  ```json
  {
    "payload": {
      "trackId": "spotify:track:xxx",
      "title": "Song Name",
      "artist": "Artist Name",
      "positionMs": 12345,
      "isPlaying": true
    }
  }
  ```

- **播放控制入队**（本应用 -> 外部）
  - `POST http://127.0.0.1:3789/spotify-control`
  - Body：
  ```json
  { "action": "prev|next|toggle" }
  ```

- **控制指令取出**（外部轮询）
  - `GET http://127.0.0.1:3789/spotify-control`
  - 返回：
  ```json
  { "ok": true, "action": "prev|next|toggle" }
  ```

### 4. 歌词来源与策略
渲染层会依次尝试以下来源（命中即停止）：
1. 网易云
2. 酷狗
3. Spotify（需要有效登录态 Cookie）
4. LRCLIB
5. lyrics.ovh

命中结果会缓存（默认 10 分钟，最多 60 条）。

## 调试说明
- 开发环境允许打开渲染进程控制台
- 自动更新仅在打包后生效（`electron-updater`）

## 已知限制
- 当前未内置 Spotify 登录流程，Spotify 歌词接口依赖已有登录态
- 仅配置了 Windows 打包目标

## 参考文档
- `接口逻辑汇总.md`：历史项目接口与多源歌词策略汇总

## License
本项目采用 CC BY-NC 4.0 许可协议：
- 允许个人/学习/分享/修改/二次分发
- 禁止任何商业用途（含直接盈利）
- 需保留署名与许可声明，修改需标注

协议详情：https://creativecommons.org/licenses/by-nc/4.0/
