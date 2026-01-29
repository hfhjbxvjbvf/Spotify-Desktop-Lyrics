/**
 * Electron 预加载模块
 */
const { contextBridge, ipcRenderer } = require("electron");

/**
 * 窗口范围数据
 * @typedef {Object} WindowBoundsPayload
 * @property {number} left
 * @property {number} top
 * @property {number} right
 * @property {number} bottom
 * @property {number} width
 * @property {number} height
 */

/**
 * 窗口悬停状态数据
 * @typedef {Object} WindowHoverPayload
 * @property {boolean} isHovering
 */

/**
 * 播放状态更新通道
 * @type {string}
 */
const PLAYBACK_UPDATE_CHANNEL = "spotify-playback-update";

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
 * 桌面窗口控制 API
 * @type {{
 *  setAlwaysOnTop: (alwaysOnTop: boolean) => Promise<void>,
 *  closeWindow: () => Promise<void>,
 *  hideWindow: () => Promise<void>,
 *  setContentHeight: (height: number) => Promise<void>,
 *  onPlaybackUpdate: (callback: (payload: any) => void) => void,
 *  onWindowBounds: (callback: (payload: WindowBoundsPayload) => void) => void,
 *  onWindowHover: (callback: (payload: WindowHoverPayload) => void) => void,
 *  openSettingsWindow: () => Promise<void>,
 *  openDevtools: () => Promise<void>
 * }}
 */
const desktopApi = {
  setAlwaysOnTop: (alwaysOnTop) => {
    // 关键逻辑：通过 IPC 请求置顶状态变更
    return ipcRenderer.invoke("window:set-always-on-top", Boolean(alwaysOnTop));
  },
  closeWindow: () => {
    // 关键逻辑：通过 IPC 请求关闭窗口
    return ipcRenderer.invoke("window:close");
  },
  hideWindow: () => {
    // 关键逻辑：通过 IPC 请求隐藏窗口
    return ipcRenderer.invoke("window:hide");
  },
  setContentHeight: (height) => {
    // 关键逻辑：通过 IPC 同步窗口内容高度
    return ipcRenderer.invoke("window:set-content-height", Number(height));
  },
  /**
   * 监听播放状态更新
   * @param {(payload: any) => void} callback
   * @returns {void}
   */
  onPlaybackUpdate: (callback) => {
    if (typeof callback !== "function") {
      return;
    }

    // 关键逻辑：监听主进程推送的播放状态
    ipcRenderer.on(PLAYBACK_UPDATE_CHANNEL, (event, payload) => {
      callback(payload);
    });
  },
  /**
   * 监听窗口范围更新
   * @param {(payload: WindowBoundsPayload) => void} callback
   * @returns {void}
   */
  onWindowBounds: (callback) => {
    if (typeof callback !== "function") {
      return;
    }

    // 关键逻辑：监听主进程推送的窗口范围
    ipcRenderer.on(WINDOW_BOUNDS_CHANNEL, (event, payload) => {
      callback(payload);
    });
  },
  /**
   * 监听窗口悬停状态
   * @param {(payload: WindowHoverPayload) => void} callback
   * @returns {void}
   */
  onWindowHover: (callback) => {
    if (typeof callback !== "function") {
      return;
    }

    // 关键逻辑：监听主进程推送的悬停状态
    ipcRenderer.on(WINDOW_HOVER_CHANNEL, (event, payload) => {
      callback(payload);
    });
  },
  /**
   * 打开设置弹窗
   * @returns {Promise<void>}
   */
  openSettingsWindow: () => {
    // 关键逻辑：通过 IPC 请求打开设置弹窗
    return ipcRenderer.invoke("window:open-settings");
  },
  /**
   * 打开开发者工具
   * @returns {Promise<void>}
   */
  openDevtools: () => {
    // 关键逻辑：通过 IPC 请求打开开发者工具
    return ipcRenderer.invoke("window:open-devtools");
  },
};

contextBridge.exposeInMainWorld("desktopApi", desktopApi);
