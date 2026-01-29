/**
 * Electron 主进程入口
 */
const {
  app,
  BrowserWindow,
  ipcMain,
  Menu,
  Tray,
  dialog,
  nativeImage,
  screen,
} = require("electron");
const path = require("node:path");
/**
 * 自动更新模块引用
 * @type {import("electron-updater").AppUpdater | null}
 */
let autoUpdater = null;
/**
 * Node.js HTTP 模块
 * @type {typeof import("node:http")}
 */
const http = require("node:http");

/**
 * 主窗口宽度
 * @type {number}
 */
const WINDOW_WIDTH = 960;

/**
 * 主窗口高度
 * @type {number}
 */
const WINDOW_HEIGHT = 135;

/**
 * 设置弹窗宽度
 * @type {number}
 */
const SETTINGS_WINDOW_WIDTH = 640;

/**
 * 设置弹窗高度
 * @type {number}
 */
const SETTINGS_WINDOW_HEIGHT = 720;

/**
 * 设置弹窗最小宽度
 * @type {number}
 */
const SETTINGS_WINDOW_MIN_WIDTH = 520;

/**
 * 设置弹窗最小高度
 * @type {number}
 */
const SETTINGS_WINDOW_MIN_HEIGHT = 520;

/**
 * 设置弹窗标题
 * @type {string}
 */
const SETTINGS_WINDOW_TITLE = "歌词设置";

/**
 * 主窗口最小高度
 * @type {number}
 */
const MIN_WINDOW_HEIGHT = 80;

/**
 * 透明窗口背景色
 * @type {string}
 */
const WINDOW_BACKGROUND = "#00000000";

/**
 * 是否启用透明窗口
 * @type {boolean}
 */
const ENABLE_TRANSPARENT_WINDOW = true;

/**
 * 是否锁定窗口尺寸（禁止拖拽改变大小）
 * @type {boolean}
 */
const LOCK_WINDOW_SIZE = true;

/**
 * 窗口范围更新通道
 * @type {string}
 */
const WINDOW_BOUNDS_CHANNEL = "window:bounds-changed";

/**
 * 窗口悬停状态通道
 * @type {string}
 */
const WINDOW_HOVER_CHANNEL = "window:hover-changed";

/**
 * 悬停状态轮询间隔
 * @type {number}
 */
const HOVER_POLL_INTERVAL_MS = 30;

/**
 * 悬停交互区域占比（中间五分之一）
 * @type {number}
 */
const HOVER_ACTIVE_REGION_RATIO = 1 / 5;

/**
 * 悬停边缘缓冲像素
 * @type {number}
 */
const HOVER_EDGE_BUFFER_PX = 8;

/**
 * 非透明窗口背景色
 * @type {string}
 */
const WINDOW_SOLID_BACKGROUND = "#0f1826";

/**
 * 应用图标路径
 * @type {string}
 */
const APP_ICON_PATH = path.join(__dirname, "src", "image", "exe.png");

/**
 * 桌面端播放桥接端口
 * @type {number}
 */
const PLAYBACK_BRIDGE_PORT = 3789;
/**
 * 桌面端播放桥接主机
 * @type {string}
 */
const PLAYBACK_BRIDGE_HOST = "127.0.0.1";
/**
 * 桌面端播放桥接路径
 * @type {string}
 */
const PLAYBACK_BRIDGE_PATH = "/spotify-playback";
/**
 * 桌面端播放控制桥接路径
 * @type {string}
 */
const PLAYBACK_CONTROL_PATH = "/spotify-control";
/**
 * 播放桥接请求体最大字节数
 * @type {number}
 */
const PLAYBACK_BRIDGE_MAX_BODY_BYTES = 128 * 1024;
/**
 * 播放控制队列上限
 * @type {number}
 */
const PLAYBACK_CONTROL_QUEUE_LIMIT = 12;
/**
 * 允许的播放控制指令
 * @type {Set<string>}
 */
const PLAYBACK_CONTROL_ACTIONS = new Set(["prev", "next", "toggle"]);

/**
 * 托盘提示文案
 * @type {string}
 */
const TRAY_TOOLTIP = "Spotify Desktop Lyrics";

/**
 * 自动更新检查间隔（毫秒）
 * @type {number}
 */
const AUTO_UPDATE_INTERVAL_MS = 1000 * 60 * 30;

/**
 * 播放桥接服务实例
 * @type {import("http").Server | null}
 */
let playbackBridgeServer = null;
/**
 * 播放控制队列
 * @type {{ action: string, receivedAt: number }[]}
 */
let playbackControlQueue = [];

/**
 * 最新播放状态缓存
 * @type {{
 *  trackId: string,
 *  title: string,
 *  artist: string,
 *  positionMs: number,
 *  isPlaying: boolean,
 *  receivedAt: number
 * } | null}
 */
let lastPlaybackState = null;

/**
 * 主窗口实例
 * @type {BrowserWindow | null}
 */
let mainWindow = null;

/**
 * 设置弹窗实例
 * @type {BrowserWindow | null}
 */
let settingsWindow = null;

/**
 * 托盘实例
 * @type {Tray | null}
 */
let trayInstance = null;

/**
 * 悬停轮询定时器
 * @type {NodeJS.Timeout | null}
 */
let hoverPollTimer = null;

/**
 * 上次悬停状态
 * @type {boolean | null}
 */
let lastHoverState = null;

/**
 * 上次鼠标穿透状态
 * @type {boolean | null}
 */
let lastIgnoreMouseEvents = null;

/**
 * 是否正在退出
 * @type {boolean}
 */
let isQuitting = false;

/**
 * 隐藏窗口到托盘
 * @param {BrowserWindow} targetWindow
 * @returns {void}
 */
function hideWindowToTray(targetWindow) {
  // 关键逻辑：隐藏窗口并移出任务栏
  targetWindow.hide();
  targetWindow.setSkipTaskbar(true);
}

/**
 * 获取窗口交互区域范围
 * @param {{ x: number, y: number, width: number, height: number }} bounds
 * @param {boolean} isHovering
 * @returns {{ left: number, top: number, right: number, bottom: number } | null}
 */
function getInteractionBounds(bounds, isHovering) {
  if (!bounds) {
    return null;
  }

  const windowLeft = Number(bounds.x);
  const windowTop = Number(bounds.y);
  const windowWidth = Number(bounds.width);
  const windowHeight = Number(bounds.height);

  if (
    !Number.isFinite(windowLeft) ||
    !Number.isFinite(windowTop) ||
    !Number.isFinite(windowWidth) ||
    !Number.isFinite(windowHeight)
  ) {
    return null;
  }

  const windowRight = windowLeft + windowWidth;
  const windowBottom = windowTop + windowHeight;

  if (isHovering) {
    // 关键逻辑：悬停后恢复全宽交互区域
    return {
      left: windowLeft,
      top: windowTop,
      right: windowRight,
      bottom: windowBottom,
    };
  }

  // 关键逻辑：未悬停时取中间三分之一作为交互区域
  const regionWidth = windowWidth * HOVER_ACTIVE_REGION_RATIO;

  if (!Number.isFinite(regionWidth) || regionWidth <= 0) {
    return null;
  }

  const regionLeft = windowLeft + (windowWidth - regionWidth) / 2;
  const regionRight = regionLeft + regionWidth;

  // 关键逻辑：进入判定时收窄，减少边缘抖动
  const bufferValue = -HOVER_EDGE_BUFFER_PX;
  const safeLeft = Math.max(windowLeft, regionLeft - bufferValue);
  const safeRight = Math.min(windowRight, regionRight + bufferValue);
  const safeTop = windowTop;
  const safeBottom = windowBottom;

  if (safeRight <= safeLeft || safeBottom <= safeTop) {
    return null;
  }

  return {
    left: safeLeft,
    top: safeTop,
    right: safeRight,
    bottom: safeBottom,
  };
}

/**
 * 判断光标是否在矩形范围内
 * @param {{ x: number, y: number }} point
 * @param {{ left: number, top: number, right: number, bottom: number }} bounds
 * @returns {boolean}
 */
function isPointInRect(point, bounds) {
  if (!point || !bounds) {
    return false;
  }

  const pointX = Number(point.x);
  const pointY = Number(point.y);

  if (!Number.isFinite(pointX) || !Number.isFinite(pointY)) {
    return false;
  }

  const left = Number(bounds.left);
  const top = Number(bounds.top);
  const right = Number(bounds.right);
  const bottom = Number(bounds.bottom);

  if (
    !Number.isFinite(left) ||
    !Number.isFinite(top) ||
    !Number.isFinite(right) ||
    !Number.isFinite(bottom)
  ) {
    return false;
  }

  return pointX >= left && pointX <= right && pointY >= top && pointY <= bottom;
}

/**
 * 判断光标是否在交互区域范围内
 * @param {{ x: number, y: number }} point
 * @param {{ x: number, y: number, width: number, height: number }} bounds
 * @param {boolean} isHovering
 * @returns {boolean}
 */
function isPointInBounds(point, bounds, isHovering) {
  if (!point || !bounds) {
    return false;
  }

  const interactionBounds = getInteractionBounds(bounds, Boolean(isHovering));
  if (!interactionBounds) {
    return false;
  }

  // 关键逻辑：根据交互区域判断鼠标是否在范围内
  return isPointInRect(point, interactionBounds);
}

/**
 * 更新窗口鼠标穿透状态
 * @param {BrowserWindow} targetWindow
 * @param {boolean} shouldIgnore
 * @returns {void}
 */
function updateIgnoreMouseEvents(targetWindow, shouldIgnore) {
  if (!targetWindow || targetWindow.isDestroyed()) {
    return;
  }

  if (lastIgnoreMouseEvents === shouldIgnore) {
    return;
  }

  // 关键逻辑：仅在状态变化时更新穿透
  lastIgnoreMouseEvents = shouldIgnore;
  targetWindow.setIgnoreMouseEvents(shouldIgnore);
}

/**
 * 推送窗口悬停状态到渲染进程
 * @param {BrowserWindow} targetWindow
 * @param {boolean} isHovering
 * @returns {void}
 */
function sendWindowHoverState(targetWindow, isHovering) {
  if (!targetWindow || targetWindow.isDestroyed()) {
    return;
  }

  if (targetWindow.webContents?.isDestroyed?.()) {
    return;
  }

  if (lastHoverState === isHovering) {
    return;
  }

  // 关键逻辑：仅在状态变化时推送
  lastHoverState = isHovering;
  targetWindow.webContents.send(WINDOW_HOVER_CHANNEL, { isHovering });
}

/**
 * 启动悬停状态轮询
 * @param {BrowserWindow} targetWindow
 * @returns {void}
 */
function startHoverPolling(targetWindow) {
  if (hoverPollTimer) {
    return;
  }

  hoverPollTimer = setInterval(() => {
    if (!targetWindow || targetWindow.isDestroyed()) {
      stopHoverPolling();
      return;
    }

    if (!targetWindow.isVisible()) {
      updateIgnoreMouseEvents(targetWindow, true);
      sendWindowHoverState(targetWindow, false);
      return;
    }

    const cursorPoint = screen.getCursorScreenPoint();
    const bounds = targetWindow.getBounds();
    const isHovering = isPointInBounds(cursorPoint, bounds, lastHoverState);

    updateIgnoreMouseEvents(targetWindow, !isHovering);
    sendWindowHoverState(targetWindow, isHovering);
  }, HOVER_POLL_INTERVAL_MS);
}

/**
 * 停止悬停状态轮询
 * @returns {void}
 */
function stopHoverPolling() {
  if (!hoverPollTimer) {
    return;
  }

  clearInterval(hoverPollTimer);
  hoverPollTimer = null;
  lastHoverState = null;
  lastIgnoreMouseEvents = null;
}

/**
 * 推送窗口范围到渲染进程
 * @param {BrowserWindow} targetWindow
 * @returns {void}
 */
function sendWindowBounds(targetWindow) {
  if (!targetWindow || targetWindow.isDestroyed()) {
    return;
  }

  const bounds = targetWindow.getBounds();
  if (!bounds) {
    return;
  }

  if (targetWindow.webContents?.isDestroyed?.()) {
    return;
  }

  // 关键逻辑：转换为屏幕范围并推送给渲染进程
  targetWindow.webContents.send(WINDOW_BOUNDS_CHANNEL, {
    left: bounds.x,
    top: bounds.y,
    width: bounds.width,
    height: bounds.height,
    right: bounds.x + bounds.width,
    bottom: bounds.y + bounds.height,
  });
}

/**
 * 处理应用退出前事件
 * @returns {void}
 */
function handleBeforeQuit() {
  // 关键逻辑：退出前允许窗口正常关闭
  isQuitting = true;
  stopHoverPolling();
  stopPlaybackBridgeServer();
}

/**
 * 读取请求体文本
 * @param {import("http").IncomingMessage} req
 * @returns {Promise<string>}
 */
function readRequestBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let totalSize = 0;

    req.on("data", (chunk) => {
      totalSize += chunk.length;
      // 关键逻辑：限制请求体大小，避免异常请求占用内存
      if (totalSize > PLAYBACK_BRIDGE_MAX_BODY_BYTES) {
        reject(new Error("请求体过大"));
        req.destroy();
        return;
      }

      chunks.push(chunk);
    });

    req.on("end", () => {
      resolve(Buffer.concat(chunks).toString("utf8"));
    });

    req.on("error", (error) => {
      reject(error);
    });
  });
}

/**
 * 输出 JSON 响应
 * @param {import("http").ServerResponse} res
 * @param {number} statusCode
 * @param {Record<string, any>} payload
 * @returns {void}
 */
function sendJsonResponse(res, statusCode, payload) {
  res.statusCode = statusCode;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(payload));
}

/**
 * 将播放控制指令加入队列
 * @param {string} action
 * @returns {boolean}
 */
function enqueuePlaybackControl(action) {
  if (!PLAYBACK_CONTROL_ACTIONS.has(action)) {
    return false;
  }

  playbackControlQueue.push({ action, receivedAt: Date.now() });

  if (playbackControlQueue.length > PLAYBACK_CONTROL_QUEUE_LIMIT) {
    // 关键逻辑：超出上限时移除最早指令
    playbackControlQueue.shift();
  }

  return true;
}

/**
 * 取出一条播放控制指令
 * @returns {{ action: string, receivedAt: number } | null}
 */
function dequeuePlaybackControl() {
  return playbackControlQueue.shift() || null;
}

/**
 * 处理播放控制请求
 * @param {import("http").IncomingMessage} req
 * @param {import("http").ServerResponse} res
 * @returns {void}
 */
function handlePlaybackControlRequest(req, res) {
  if (req.method === "GET") {
    const nextControl = dequeuePlaybackControl();
    // 关键逻辑：输出控制指令出队日志便于排查
    console.info("[PlaybackBridge] control dequeue", {
      action: nextControl?.action || "",
      queueLength: playbackControlQueue.length,
    });
    sendJsonResponse(res, 200, { ok: true, action: nextControl?.action || "" });
    return;
  }

  if (req.method !== "POST") {
    sendJsonResponse(res, 405, { ok: false, error: "Method Not Allowed" });
    return;
  }

  readRequestBody(req)
    .then((rawBody) => {
      let requestData = {};

      try {
        requestData = rawBody ? JSON.parse(rawBody) : {};
      } catch (error) {
        sendJsonResponse(res, 400, { ok: false, error: "JSON 解析失败" });
        return;
      }

      const action = String(requestData?.action || "").trim().toLowerCase();
      if (!action) {
        sendJsonResponse(res, 400, { ok: false, error: "缺少 action" });
        return;
      }

      const queued = enqueuePlaybackControl(action);
      // 关键逻辑：输出控制指令入队日志便于排查
      console.info("[PlaybackBridge] control enqueue", {
        action,
        queued,
        queueLength: playbackControlQueue.length,
      });
      if (!queued) {
        sendJsonResponse(res, 400, { ok: false, error: "不支持的指令" });
        return;
      }

      sendJsonResponse(res, 200, { ok: true });
    })
    .catch((error) => {
      console.warn("[PlaybackBridge] control request parse failed", error);
      sendJsonResponse(res, 400, {
        ok: false,
        error: error?.message || "请求解析失败",
      });
    });
}

/**
 * 处理播放桥接请求
 * @param {import("http").IncomingMessage} req
 * @param {import("http").ServerResponse} res
 * @returns {void}
 */
function handlePlaybackBridgeRequest(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  const requestPath = (req.url || "").split("?")[0];

  // 关键逻辑：处理预检请求
  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    res.end();
    return;
  }

  if (requestPath === PLAYBACK_CONTROL_PATH) {
    handlePlaybackControlRequest(req, res);
    return;
  }

  // 关键逻辑：只接受指定路径的 POST
  if (req.method !== "POST" || requestPath !== PLAYBACK_BRIDGE_PATH) {
    sendJsonResponse(res, 404, { ok: false, error: "Not Found" });
    return;
  }

  readRequestBody(req)
    .then((rawBody) => {
      let requestData = {};

      try {
        requestData = rawBody ? JSON.parse(rawBody) : {};
      } catch (error) {
        sendJsonResponse(res, 400, { ok: false, error: "JSON 解析失败" });
        return;
      }

      const payload = requestData?.payload || {};
      const trackId = String(payload.trackId || "").trim();

      if (!trackId) {
        sendJsonResponse(res, 400, { ok: false, error: "缺少 trackId" });
        return;
      }

      const nextPlaybackState = {
        trackId,
        title: String(payload.title || ""),
        artist: String(payload.artist || ""),
        positionMs: Number(payload.positionMs) || 0,
        isPlaying: Boolean(payload.isPlaying),
        receivedAt: Date.now(),
      };

      // 关键逻辑：缓存最新播放状态供新窗口同步
      lastPlaybackState = nextPlaybackState;

      // 关键逻辑：将播放状态转发到渲染层
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send("spotify-playback-update", nextPlaybackState);
      }

      if (settingsWindow && !settingsWindow.isDestroyed()) {
        settingsWindow.webContents.send(
          "spotify-playback-update",
          nextPlaybackState
        );
      }

      sendJsonResponse(res, 200, { ok: true });
    })
    .catch((error) => {
      console.warn("[PlaybackBridge] request parse failed", error);
      sendJsonResponse(res, 400, { ok: false, error: error?.message || "请求解析失败" });
    });
}

/**
 * 启动播放桥接服务
 * @returns {void}
 */
function startPlaybackBridgeServer() {
  if (playbackBridgeServer) {
    return;
  }

  playbackBridgeServer = http.createServer(handlePlaybackBridgeRequest);

  playbackBridgeServer.on("error", (error) => {
    console.error("[PlaybackBridge] server start failed", error);
    playbackBridgeServer = null;
  });

  playbackBridgeServer.listen(PLAYBACK_BRIDGE_PORT, PLAYBACK_BRIDGE_HOST, () => {
    console.info(
      `[PlaybackBridge] listening http://${PLAYBACK_BRIDGE_HOST}:${PLAYBACK_BRIDGE_PORT}${PLAYBACK_BRIDGE_PATH}`
    );
  });
}

/**
 * 停止播放桥接服务
 * @returns {void}
 */
function stopPlaybackBridgeServer() {
  if (!playbackBridgeServer) {
    return;
  }

  // 关键逻辑：释放本地端口资源
  playbackBridgeServer.close(() => {
    console.info("[PlaybackBridge] server closed");
  });
  playbackBridgeServer = null;
}

/**
 * 注册窗口相关 IPC
 * @returns {void}
 */
function registerIpcHandlers() {
  ipcMain.handle("window:set-always-on-top", (event, alwaysOnTop) => {
    // 关键逻辑：基于当前 webContents 获取窗口实例
    const targetWindow = BrowserWindow.fromWebContents(event.sender);
    if (!targetWindow) {
      return;
    }

    targetWindow.setAlwaysOnTop(Boolean(alwaysOnTop));
  });

  ipcMain.handle("window:set-content-height", (event, height) => {
    if (LOCK_WINDOW_SIZE) {
      return;
    }

    // 关键逻辑：按内容高度调整窗口尺寸
    const targetWindow = BrowserWindow.fromWebContents(event.sender);
    if (!targetWindow) {
      return;
    }

    // 关键逻辑：确保高度为有效数值
    const safeHeight = Math.max(MIN_WINDOW_HEIGHT, Math.round(Number(height) || 0));
    if (!safeHeight) {
      return;
    }

    // 关键逻辑：计算窗口边框差值并调整真实窗口高度
    const bounds = targetWindow.getBounds();
    const contentBounds = targetWindow.getContentBounds();
    const frameHeight = bounds.height - contentBounds.height;
    const nextHeight = safeHeight + Math.max(0, frameHeight);

    if (bounds.height === nextHeight) {
      return;
    }

    targetWindow.setBounds({
      x: bounds.x,
      y: bounds.y,
      width: bounds.width,
      height: nextHeight,
    });
  });

  ipcMain.handle("window:hide", (event) => {
    // 关键逻辑：隐藏窗口以进入托盘
    const targetWindow = BrowserWindow.fromWebContents(event.sender);
    if (!targetWindow) {
      return;
    }

    hideWindowToTray(targetWindow);
  });

  ipcMain.handle("window:close", (event) => {
    // 关键逻辑：确保关闭触发对应窗口
    const targetWindow = BrowserWindow.fromWebContents(event.sender);
    if (!targetWindow) {
      return;
    }

    targetWindow.close();
  });

  ipcMain.handle("window:open-devtools", (event) => {
    // 关键逻辑：打开调用方的开发者工具
    event.sender.openDevTools({ mode: "detach" });
  });

  ipcMain.handle("window:open-settings", () => {
    // 关键逻辑：打开设置弹窗
    createSettingsWindow();
  });
}

/**
 * 创建主窗口
 * @returns {BrowserWindow}
 */
function createMainWindow() {
  // 关键逻辑：无边框 + 透明磨砂窗口
  mainWindow = new BrowserWindow({
    width: WINDOW_WIDTH,
    height: WINDOW_HEIGHT,
    minWidth: LOCK_WINDOW_SIZE ? WINDOW_WIDTH : 520,
    maxWidth: LOCK_WINDOW_SIZE ? WINDOW_WIDTH : undefined,
    minHeight: LOCK_WINDOW_SIZE ? WINDOW_HEIGHT : MIN_WINDOW_HEIGHT,
    maxHeight: LOCK_WINDOW_SIZE ? WINDOW_HEIGHT : undefined,
    show: false,
    frame: false,
    transparent: ENABLE_TRANSPARENT_WINDOW,
    alwaysOnTop: true,
    backgroundColor: ENABLE_TRANSPARENT_WINDOW
      ? WINDOW_BACKGROUND
      : WINDOW_SOLID_BACKGROUND,
    autoHideMenuBar: true,
    resizable: !LOCK_WINDOW_SIZE,
    useContentSize: true,
    // 关键逻辑：使用统一应用图标
    icon: APP_ICON_PATH,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  mainWindow.loadFile(path.join(__dirname, "src", "index.html"));

  mainWindow.webContents.on("did-finish-load", () => {
    sendWindowBounds(mainWindow);
    if (lastPlaybackState) {
      // 关键逻辑：窗口加载后同步最新播放状态
      mainWindow.webContents.send("spotify-playback-update", lastPlaybackState);
    }
  });

  // 关键逻辑：开发模式下输出渲染层日志
  if (!app.isPackaged) {
    mainWindow.webContents.on(
      "console-message",
      (event, level, message) => {
        console.log(`[Renderer] ${message}`);
      }
    );
  }

  // 关键逻辑：确保窗口接收鼠标事件
  mainWindow.setIgnoreMouseEvents(false);

  // 关键逻辑：启动主进程悬停轮询
  startHoverPolling(mainWindow);

  mainWindow.once("ready-to-show", () => {
    mainWindow?.show();
  });

  mainWindow.on("show", () => {
    sendWindowBounds(mainWindow);
  });

  mainWindow.on("move", () => {
    sendWindowBounds(mainWindow);
  });

  mainWindow.on("resize", () => {
    sendWindowBounds(mainWindow);
  });

  mainWindow.on("close", (event) => {
    if (isQuitting) {
      return;
    }

    // 关键逻辑：关闭按钮改为隐藏到托盘
    event.preventDefault();
    if (mainWindow) {
      hideWindowToTray(mainWindow);
    }
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
    stopHoverPolling();
  });

  return mainWindow;
}

/**
 * 创建设置弹窗
 * @returns {BrowserWindow}
 */
function createSettingsWindow() {
  if (settingsWindow && !settingsWindow.isDestroyed()) {
    settingsWindow.show();
    settingsWindow.focus();
    return settingsWindow;
  }

  // 关键逻辑：设置弹窗采用独立窗口展示完整功能面板
  settingsWindow = new BrowserWindow({
    width: SETTINGS_WINDOW_WIDTH,
    height: SETTINGS_WINDOW_HEIGHT,
    minWidth: SETTINGS_WINDOW_MIN_WIDTH,
    minHeight: SETTINGS_WINDOW_MIN_HEIGHT,
    show: false,
    frame: true,
    transparent: false,
    resizable: true,
    autoHideMenuBar: true,
    title: SETTINGS_WINDOW_TITLE,
    backgroundColor: WINDOW_SOLID_BACKGROUND,
    useContentSize: true,
    // 关键逻辑：使用统一应用图标
    icon: APP_ICON_PATH,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  settingsWindow.loadFile(path.join(__dirname, "src", "index.html"), {
    query: {
      view: "settings",
    },
  });

  settingsWindow.webContents.on("did-finish-load", () => {
    if (lastPlaybackState) {
      // 关键逻辑：设置弹窗加载后同步最新播放状态
      settingsWindow.webContents.send(
        "spotify-playback-update",
        lastPlaybackState
      );
    }
  });

  settingsWindow.once("ready-to-show", () => {
    settingsWindow?.show();
  });

  settingsWindow.on("closed", () => {
    settingsWindow = null;
  });

  return settingsWindow;
}

/**
 * 生成托盘图标
 * @returns {Electron.NativeImage}
 */
function createTrayImage() {
  return nativeImage.createFromPath(APP_ICON_PATH);
}

/**
 * 创建托盘与菜单
 * @returns {void}
 */
function createTray() {
  if (trayInstance) {
    return;
  }

  const trayIcon = createTrayImage();
  trayInstance = new Tray(trayIcon);
  trayInstance.setToolTip(TRAY_TOOLTIP);

  const contextMenu = Menu.buildFromTemplate([
    {
      label: "退出",
      click: () => {
        // 关键逻辑：从托盘菜单退出应用
        isQuitting = true;
        app.quit();
      },
    },
  ]);

  trayInstance.setContextMenu(contextMenu);
  trayInstance.on("click", () => {
    if (!mainWindow) {
      if (isQuitting) {
        return;
      }

      // 关键逻辑：窗口不存在时重新创建
      createMainWindow();
      return;
    }

    // 关键逻辑：点击托盘恢复窗口
    mainWindow.setSkipTaskbar(false);
    mainWindow.show();
    mainWindow.focus();
  });

  trayInstance.on("right-click", () => {
    trayInstance?.popUpContextMenu();
  });
}

/**
 * 初始化自动更新逻辑
 * @returns {void}
 */
function initAutoUpdater() {
  if (!app.isPackaged) {
    // 关键逻辑：开发环境不启用自动更新
    console.info("[Updater] dev mode skip");
    return;
  }

  if (!autoUpdater) {
    try {
      // 关键逻辑：按需加载自动更新模块，避免开发环境报错
      ({ autoUpdater } = require("electron-updater"));
    } catch (error) {
      console.warn("[Updater] electron-updater missing", error);
      return;
    }
  }

  // 关键逻辑：配置自动更新策略
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = false;

  autoUpdater.on("checking-for-update", () => {
    console.info("[Updater] checking for update");
  });

  autoUpdater.on("update-available", (info) => {
    console.info("[Updater] update available", {
      version: info?.version || "",
    });
  });

  autoUpdater.on("update-not-available", (info) => {
    console.info("[Updater] update not available", {
      version: info?.version || "",
    });
  });

  autoUpdater.on("error", (error) => {
    console.error("[Updater] error", error);
  });

  autoUpdater.on("update-downloaded", () => {
    // 关键逻辑：提示用户重启以完成更新
    dialog
      .showMessageBox({
        type: "info",
        buttons: ["立即重启", "稍后"],
        defaultId: 0,
        cancelId: 1,
        title: "更新已就绪",
        message: "新版本已下载，重启后完成更新。",
      })
      .then(({ response }) => {
        if (response === 0) {
          // 关键逻辑：确认后执行更新安装
          autoUpdater.quitAndInstall();
        }
      })
      .catch((error) => {
        console.warn("[Updater] restart prompt failed", error);
      });
  });

  // 关键逻辑：启动后立即检查并定时轮询
  const checkUpdates = () => {
    autoUpdater.checkForUpdates().catch((error) => {
      console.warn("[Updater] check failed", error);
    });
  };

  checkUpdates();
  setInterval(checkUpdates, AUTO_UPDATE_INTERVAL_MS);
}

/**
 * 初始化应用
 * @returns {void}
 */
function initApp() {
  createTray();
  registerIpcHandlers();
  createMainWindow();
  startPlaybackBridgeServer();
  initAutoUpdater();
}

app.whenReady().then(initApp);

app.on("before-quit", handleBeforeQuit);

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createMainWindow();
  }
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("before-quit", () => {
  isQuitting = true;
});
