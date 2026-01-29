/**
 * 歌词行结构
 * @typedef {Object} LyricsLine
 * @property {number} time
 * @property {string} text
 */

/**
 * 播放状态
 * @typedef {Object} PlaybackState
 * @property {string} trackId
 * @property {string} title
 * @property {string} artist
 * @property {number} positionMs
 * @property {boolean} isPlaying
 * @property {number} receivedAt
 */

/**
 * 歌词记录
 * @typedef {Object} LyricsRecord
 * @property {string} trackId
 * @property {string} title
 * @property {string} artist
 * @property {LyricsLine[]} lyrics
 * @property {number} offset
 * @property {number} speed
 * @property {string} source
 */

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
 * Electron 桌面 API
 * @type {{
 *  setAlwaysOnTop: (alwaysOnTop: boolean) => Promise<void>,
 *  closeWindow: () => Promise<void>,
 *  hideWindow: () => Promise<void>,
 *  setContentHeight: (height: number) => Promise<void>,
 *  onPlaybackUpdate?: (callback: (payload: PlaybackState) => void) => void,
 *  onWindowBounds?: (callback: (payload: WindowBoundsPayload) => void) => void,
 *  onWindowHover?: (callback: (payload: WindowHoverPayload) => void) => void,
 *  openSettingsWindow?: () => Promise<void>,
 *  openDevtools?: () => Promise<void>
 * } | null}
 */
var desktopApi = window.desktopApi || null;

/**
 * 设置弹窗查询参数键名
 * @type {string}
 */
const SETTINGS_VIEW_QUERY_KEY = "view";

/**
 * 设置弹窗查询参数值
 * @type {string}
 */
const SETTINGS_VIEW_QUERY_VALUE = "settings";

/**
 * 设置弹窗模式样式类名
 * @type {string}
 */
const SETTINGS_WINDOW_CLASS = "is-settings-window";

/**
 * 是否为设置弹窗页面
 * @type {boolean}
 */
const isSettingsWindow =
  new URLSearchParams(window.location.search).get(SETTINGS_VIEW_QUERY_KEY) ===
  SETTINGS_VIEW_QUERY_VALUE;

/**
 * 播放时间刷新间隔
 * @type {number}
 */
const UPDATE_INTERVAL_MS = 200;

/**
 * 歌词偏移步进
 * @type {number}
 */
const OFFSET_STEP_MS = 500;

/**
 * 纯文本歌词默认行间隔
 * @type {number}
 */
const PLAIN_TEXT_INTERVAL_MS = 3000;

/**
 * 操作提示展示时长
 * @type {number}
 */
const ACTION_HINT_DURATION_MS = 2200;

/**
 * 在线请求超时时长
 * @type {number}
 */
const REQUEST_TIMEOUT_MS = 8000;

/**
 * 播放控制桥接地址
 * @type {string}
 */
const PLAYBACK_CONTROL_URL = "http://127.0.0.1:3789/spotify-control";

/**
 * Spotify Access Token 接口
 * @type {string}
 */
const SPOTIFY_ACCESS_TOKEN_URL =
  "https://open.spotify.com/get_access_token?reason=transport&productType=web_player";

/**
 * Spotify 歌词接口基础地址
 * @type {string}
 */
const SPOTIFY_LYRICS_BASE_URL =
  "https://spclient.wg.spotify.com/color-lyrics/v2/track";

/**
 * LRCLIB 歌词接口
 * @type {string}
 */
const LRCLIB_API_URL = "https://lrclib.net/api/get";

/**
 * LRCLIB 搜索接口
 * @type {string}
 */
const LRCLIB_SEARCH_API_URL = "https://lrclib.net/api/search";

/**
 * 网易云搜索接口
 * @type {string}
 */
const NETEASE_SEARCH_API_URL = "https://music.163.com/api/search/get/web";

/**
 * 网易云歌词接口
 * @type {string}
 */
const NETEASE_LYRIC_API_URL = "https://music.163.com/api/song/lyric";

/**
 * 酷狗搜索接口
 * @type {string}
 */
const KUGOU_SEARCH_API_URL = "https://mobilecdn.kugou.com/api/v3/search/song";

/**
 * 酷狗歌词搜索接口
 * @type {string}
 */
const KUGOU_LYRIC_SEARCH_API_URL = "https://krcs.kugou.com/search";

/**
 * 酷狗歌词下载接口
 * @type {string}
 */
const KUGOU_LYRIC_DOWNLOAD_API_URL = "https://krcs.kugou.com/download";

/**
 * lyrics.ovh 歌词接口
 * @type {string}
 */
const LYRICS_OVH_API_URL = "https://api.lyrics.ovh/v1";

/**
 * Spotify Token 刷新缓冲时间
 * @type {number}
 */
const SPOTIFY_TOKEN_REFRESH_BUFFER_MS = 60000;

/**
 * 在线歌词缓存过期时间
 * @type {number}
 */
const ONLINE_LYRICS_CACHE_TTL_MS = 10 * 60 * 1000;

/**
 * 在线歌词缓存上限
 * @type {number}
 */
const ONLINE_LYRICS_CACHE_LIMIT = 60;

/**
 * 按钮提示文案映射
 * @type {Record<string, string>}
 */
const BUTTON_HINT_LABELS = {
  offsetMinus: "歌词偏移减少按钮",
  offsetPlus: "歌词偏移增加按钮",
  prevTrack: "上一曲按钮",
  toggleLyrics: "播放/暂停按钮",
  nextTrack: "下一曲按钮",
  settingsToggle: "设置按钮",
  openDevtools: "打开控制台按钮",
  pinToggle: "锁定按钮",
  closeWindow: "关闭按钮",
  settingsClose: "设置收起按钮",
  refreshLyrics: "刷新歌词按钮",
  importLyrics: "导入歌词按钮",
};

/**
 * 播放控制提示文案映射
 * @type {Record<string, string>}
 */
const PLAYBACK_CONTROL_LABELS = {
  prev: "上一首",
  next: "下一首",
  toggle: "播放/暂停",
};

/**
 * 仍在开发中的按钮 ID
 * @type {Set<string>}
 */
const DEV_ONLY_BUTTON_IDS = new Set([]);

/**
 * Mock 歌曲信息
 * @type {{ trackId: string, title: string, artist: string }}
 */
const MOCK_TRACK = {
  trackId: "mock-track-001",
  title: "示例歌曲",
  artist: "示例歌手",
};

/**
 * Mock 歌词行
 * @type {LyricsLine[]}
 */
const MOCK_LYRICS = [
  { time: 0, text: "示例歌词行 1" },
  { time: 4800, text: "示例歌词行 2" },
  { time: 9200, text: "示例歌词行 3" },
  { time: 13800, text: "示例歌词行 4" },
  { time: 18400, text: "示例歌词行 5" },
  { time: 23200, text: "示例歌词行 6" },
];

/**
 * DOM 引用集合
 * @type {{
 *  appRoot: HTMLElement,
 *  lyricOverlay: HTMLElement,
 *  overlayToolbar: HTMLElement,
 *  actionHint: HTMLElement,
 *  settingsPanel: HTMLElement,
 *  settingsToggle: HTMLButtonElement,
 *  openDevtools: HTMLButtonElement,
 *  settingsClose: HTMLButtonElement,
 *  closeWindow: HTMLButtonElement,
 *  pinToggle: HTMLButtonElement,
 *  currentLineText: HTMLElement,
 *  nextLineText: HTMLElement,
 *  trackTitle: HTMLElement,
 *  trackArtist: HTMLElement,
 *  playbackStatus: HTMLElement,
 *  playbackTime: HTMLElement,
 *  prevTrack: HTMLButtonElement,
 *  toggleLyrics: HTMLButtonElement,
 *  nextTrack: HTMLButtonElement,
 *  refreshLyrics: HTMLButtonElement,
 *  offsetMinus: HTMLButtonElement,
 *  offsetPlus: HTMLButtonElement,
 *  offsetValue: HTMLElement,
 *  lyricsList: HTMLElement,
 *  lyricsInput: HTMLTextAreaElement,
 *  importLyrics: HTMLButtonElement,
 *  hintMessage: HTMLElement
 * }}
 */
const dom = {
  appRoot: document.getElementById("appRoot"),
  lyricOverlay: document.getElementById("lyricOverlay"),
  overlayToolbar: document.querySelector(".overlay-toolbar"),
  actionHint: document.getElementById("actionHint"),
  settingsPanel: document.getElementById("settingsPanel"),
  settingsToggle: document.getElementById("settingsToggle"),
  openDevtools: document.getElementById("openDevtools"),
  settingsClose: document.getElementById("settingsClose"),
  closeWindow: document.getElementById("closeWindow"),
  pinToggle: document.getElementById("pinToggle"),
  currentLineText: document.getElementById("currentLineText"),
  nextLineText: document.getElementById("nextLineText"),
  trackTitle: document.getElementById("trackTitle"),
  trackArtist: document.getElementById("trackArtist"),
  playbackStatus: document.getElementById("playbackStatus"),
  playbackTime: document.getElementById("playbackTime"),
  prevTrack: document.getElementById("prevTrack"),
  toggleLyrics: document.getElementById("toggleLyrics"),
  nextTrack: document.getElementById("nextTrack"),
  refreshLyrics: document.getElementById("refreshLyrics"),
  offsetMinus: document.getElementById("offsetMinus"),
  offsetPlus: document.getElementById("offsetPlus"),
  offsetValue: document.getElementById("offsetValue"),
  lyricsList: document.getElementById("lyricsList"),
  lyricsInput: document.getElementById("lyricsInput"),
  importLyrics: document.getElementById("importLyrics"),
  hintMessage: document.getElementById("hintMessage"),
};

/**
 * 刷新 DOM 引用
 * @returns {void}
 */
function refreshDomRefs() {
  // 关键逻辑：确保在 DOM 就绪后重新获取元素，避免初始化过早导致引用为空
  dom.appRoot = document.getElementById("appRoot");
  dom.lyricOverlay = document.getElementById("lyricOverlay");
  dom.overlayToolbar = document.querySelector(".overlay-toolbar");
  dom.actionHint = document.getElementById("actionHint");
  dom.settingsPanel = document.getElementById("settingsPanel");
  dom.settingsToggle = document.getElementById("settingsToggle");
  dom.openDevtools = document.getElementById("openDevtools");
  dom.settingsClose = document.getElementById("settingsClose");
  dom.closeWindow = document.getElementById("closeWindow");
  dom.pinToggle = document.getElementById("pinToggle");
  dom.currentLineText = document.getElementById("currentLineText");
  dom.nextLineText = document.getElementById("nextLineText");
  dom.trackTitle = document.getElementById("trackTitle");
  dom.trackArtist = document.getElementById("trackArtist");
  dom.playbackStatus = document.getElementById("playbackStatus");
  dom.playbackTime = document.getElementById("playbackTime");
  dom.prevTrack = document.getElementById("prevTrack");
  dom.toggleLyrics = document.getElementById("toggleLyrics");
  dom.nextTrack = document.getElementById("nextTrack");
  dom.refreshLyrics = document.getElementById("refreshLyrics");
  dom.offsetMinus = document.getElementById("offsetMinus");
  dom.offsetPlus = document.getElementById("offsetPlus");
  dom.offsetValue = document.getElementById("offsetValue");
  dom.lyricsList = document.getElementById("lyricsList");
  dom.lyricsInput = document.getElementById("lyricsInput");
  dom.importLyrics = document.getElementById("importLyrics");
  dom.hintMessage = document.getElementById("hintMessage");
}

/**
 * 当前播放状态
 * @type {PlaybackState | null}
 */
let playbackState = null;

/**
 * 当前歌词记录
 * @type {LyricsRecord | null}
 */
let lyricsRecord = null;

/**
 * 已解析歌词行
 * @type {LyricsLine[]}
 */
let lyricsLines = [];

/**
 * 当前高亮行索引
 * @type {number}
 */
let activeLineIndex = -1;

/**
 * 刷新定时器句柄
 * @type {number}
 */
let tickTimerId = 0;

/**
 * Spotify 访问令牌
 * @type {string}
 */
let spotifyAccessToken = "";

/**
 * Spotify 访问令牌过期时间
 * @type {number}
 */
let spotifyAccessTokenExpiresAt = 0;

/**
 * 在线歌词请求状态
 * @type {boolean}
 */
let isOnlineLyricsRequesting = false;

/**
 * 在线歌词缓存
 * @type {Map<string, { result: { lines: LyricsLine[], source: string }, cachedAt: number }>}
 */
let onlineLyricsCache = new Map();

/**
 * 歌词暂停状态
 * @type {boolean}
 */
let isLyricsPaused = false;

/**
 * 设置面板是否展开
 * @type {boolean}
 */
let isSettingsOpen = false;

/**
 * 窗口锁定状态（控制拖拽与按钮显示）
 * @type {boolean}
 */
let isPinned = true;

/**
 * 鼠标是否在窗口范围内
 * @type {boolean}
 */
let isHovering = true;

/**
 * 窗口屏幕范围缓存
 * @type {{ left: number, top: number, right: number, bottom: number, width: number, height: number } | null}
 */
let windowBounds = null;

/**
 * 是否使用主进程推送的窗口范围
 * @type {boolean}
 */
let hasWindowBoundsFromIpc = false;

/**
 * 是否使用主进程推送的悬停状态
 * @type {boolean}
 */
let hasHoverStateFromIpc = false;

/**
 * 暂停时的歌词时间
 * @type {number | null}
 */
let pausedLyricsClockMs = null;

/**
 * 上次同步的内容高度
 * @type {number}
 */
let lastContentHeight = 0;

/**
 * 内容高度同步帧 ID
 * @type {number}
 */
let contentHeightRafId = 0;

/**
 * 操作提示定时器 ID
 * @type {number}
 */
let actionHintTimerId = 0;

/**
 * 内容尺寸观察器
 * @type {ResizeObserver | null}
 */
let contentResizeObserver = null;

/**
 * 将毫秒转换为 mm:ss
 * @param {number} timeMs
 * @returns {string}
 */
function formatTimeMs(timeMs) {
  const safeTime = Math.max(0, timeMs);
  const totalSeconds = Math.floor(safeTime / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(
    2,
    "0"
  )}`;
}

/**
 * 生成偏移显示文案
 * @param {number} offset
 * @returns {string}
 */
function formatOffsetLabel(offset) {
  // 关键逻辑：偏移值统一按秒显示，保持与按钮文案一致
  const seconds = (offset / 1000).toFixed(1);
  const sign = offset > 0 ? "+" : "";
  return `偏移 ${sign}${seconds}s`;
}

/**
 * 格式化歌词来源文案
 * @param {string} source
 * @returns {string}
 */
function formatLyricsSourceLabel(source) {
  const mappedLabel = {
    netease: "网易云",
    kugou: "酷狗",
    spotify: "Spotify",
    lrclib: "LRCLIB",
    lyrics_ovh: "lyrics.ovh",
  };

  // 关键逻辑：优先读取映射值，避免展示内部字段
  return mappedLabel[source] || source || "未知来源";
}

/**
 * 解析时间标签为毫秒
 * @param {string} minutesText
 * @param {string} secondsText
 * @param {string | undefined} fractionText
 * @returns {number}
 */
function parseTimeTagToMs(minutesText, secondsText, fractionText) {
  const minutes = Number(minutesText) || 0;
  const seconds = Number(secondsText) || 0;
  const fraction = fractionText
    ? Number(fractionText.padEnd(3, "0").slice(0, 3))
    : 0;

  return (minutes * 60 + seconds) * 1000 + fraction;
}

/**
 * 解析 LRC 格式歌词
 * @param {string} rawText
 * @returns {LyricsLine[]}
 */
function parseLrcText(rawText) {
  const rows = rawText.split(/\r?\n/);
  const parsedLines = [];

  rows.forEach((row) => {
    const matches = [...row.matchAll(/\[(\d{1,2}):(\d{2})(?:\.(\d{1,3}))?\]/g)];
    if (!matches.length) {
      return;
    }

    // 关键逻辑：剥离时间标签得到歌词文本
    const text = row.replace(/\[[^\]]+\]/g, "").trim();

    matches.forEach((match) => {
      const time = parseTimeTagToMs(match[1], match[2], match[3]);

      parsedLines.push({
        time,
        text: text || "…",
      });
    });
  });

  return normalizeLyricsLines(parsedLines);
}

/**
 * 将纯文本歌词生成时间轴
 * @param {string} rawText
 * @returns {LyricsLine[]}
 */
function buildPlainTextLines(rawText) {
  const lines = rawText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  return lines.map((text, index) => ({
    time: index * PLAIN_TEXT_INTERVAL_MS,
    text,
  }));
}

/**
 * 统一解析歌词输入
 * @param {string} rawText
 * @returns {LyricsLine[]}
 */
function parseLyricsInput(rawText) {
  const text = rawText.trim();
  if (!text) {
    return [];
  }

  // 关键逻辑：优先按 LRC 时间标签解析
  const hasTimeTag = /\[\d{1,2}:\d{2}(?:\.\d{1,3})?\]/.test(text);
  if (hasTimeTag) {
    const parsed = parseLrcText(text);
    if (parsed.length) {
      return parsed;
    }
  }

  return normalizeLyricsLines(buildPlainTextLines(text));
}

/**
 * 规范化歌词行
 * @param {LyricsLine[]} lines
 * @returns {LyricsLine[]}
 */
function normalizeLyricsLines(lines) {
  const sanitized = lines
    .filter((line) => Number.isFinite(line.time))
    .map((line) => ({
      time: Math.max(0, Math.round(line.time)),
      text: line.text || "…",
    }))
    .sort((a, b) => a.time - b.time);

  const uniqueLines = [];

  sanitized.forEach((line) => {
    const last = uniqueLines[uniqueLines.length - 1];
    if (last && last.time === line.time && last.text === line.text) {
      return;
    }

    uniqueLines.push(line);
  });

  return uniqueLines;
}

/**
 * 带超时的请求封装
 * @param {string} url
 * @param {RequestInit | undefined} options
 * @param {number} timeoutMs
 * @returns {Promise<Response>}
 */
async function fetchWithTimeout(url, options, timeoutMs) {
  const controller = new AbortController();
  // 关键逻辑：超时终止请求，避免长时间卡住
  const timerId = window.setTimeout(() => {
    controller.abort();
  }, timeoutMs);

  const requestOptions = options
    ? { ...options, signal: controller.signal }
    : { signal: controller.signal };

  try {
    return await fetch(url, requestOptions);
  } finally {
    window.clearTimeout(timerId);
  }
}

/**
 * 打开设置弹窗
 * @returns {Promise<void>}
 */
async function openSettingsWindow() {
  if (!desktopApi?.openSettingsWindow) {
    showActionHint("当前环境不支持打开设置弹窗");
    return;
  }

  try {
    // 关键逻辑：触发主进程创建设置弹窗
    await desktopApi.openSettingsWindow();
  } catch (error) {
    console.warn("[Lyrics][Window] 打开设置弹窗失败", error);
    showActionHint("打开设置弹窗失败");
  }
}

/**
 * 关闭设置弹窗
 * @returns {void}
 */
function closeSettingsWindow() {
  if (desktopApi?.closeWindow) {
    // 关键逻辑：通过 IPC 关闭当前窗口
    void desktopApi.closeWindow();
    return;
  }

  window.close();
}

/**
 * 规范化 Spotify TrackId
 * @param {string} trackId
 * @returns {string}
 */
function normalizeSpotifyTrackId(trackId) {
  const rawId = (trackId || "").trim();
  if (!rawId) {
    return "";
  }

  // 关键逻辑：兼容 spotify:track:xxx 与 URL
  if (rawId.startsWith("spotify:track:")) {
    return rawId.split(":").pop() || "";
  }

  const urlMatch = rawId.match(/open\.spotify\.com\/track\/([a-zA-Z0-9]+)/);
  if (urlMatch?.[1]) {
    return urlMatch[1];
  }

  return rawId;
}

/**
 * 规范化歌词检索文本
 * @param {string} text
 * @returns {string}
 */
function normalizeLyricsSearchText(text) {
  const trimmed = (text || "").trim();
  if (!trimmed) {
    return "";
  }

  // 关键逻辑：移除括号/书名号等副标题
  let value = trimmed
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/\u3000/g, " ")
    .replace(/[\(（\[【].*?[\)）\]】]/g, "")
    .replace(/《.*?》/g, "");

  const dashParts = value.split(/\s[-–—]\s/);
  if (dashParts.length > 1) {
    value = dashParts[0];
  }

  return value.replace(/\s+/g, " ").trim();
}

/**
 * 构建用于模糊匹配的比较键
 * @param {string} text
 * @returns {string}
 */
function buildLyricsMatchKey(text) {
  const normalized = normalizeLyricsSearchText(text).toLowerCase();
  if (!normalized) {
    return "";
  }

  // 关键逻辑：忽略符号与空白，仅保留字母/数字/汉字
  return normalized.replace(/[^\p{L}\p{N}]+/gu, "");
}

/**
 * 构建标题候选列表
 * @param {string} title
 * @returns {string[]}
 */
function buildTitleSearchCandidates(title) {
  const candidates = new Set();
  const trimmed = (title || "").trim();

  if (trimmed) {
    candidates.add(trimmed);
  }

  const normalized = normalizeLyricsSearchText(trimmed);
  if (normalized && normalized !== trimmed) {
    candidates.add(normalized);
  }

  return Array.from(candidates);
}

/**
 * 构建在线歌词缓存键
 * @param {{ trackId: string, title: string, artist: string }} trackInfo
 * @returns {string}
 */
function buildOnlineLyricsCacheKey(trackInfo) {
  const trackId = (trackInfo?.trackId || "").trim();
  const titleKey = buildLyricsMatchKey(trackInfo?.title || "");
  const artistKey = buildLyricsMatchKey(trackInfo?.artist || "");
  const metaKey = [titleKey, artistKey].filter(Boolean).join("|");

  // 关键逻辑：trackId + 标题/艺人组合，避免同名冲突
  if (trackId && metaKey) {
    return `${trackId}|${metaKey}`;
  }

  return trackId || metaKey;
}

/**
 * 读取在线歌词缓存
 * @param {string} cacheKey
 * @returns {{ lines: LyricsLine[], source: string } | null}
 */
function getOnlineLyricsCache(cacheKey) {
  const safeKey = (cacheKey || "").trim();
  if (!safeKey) {
    return null;
  }

  const cached = onlineLyricsCache.get(safeKey);
  if (!cached) {
    return null;
  }

  // 关键逻辑：过期即清理
  if (Date.now() - cached.cachedAt > ONLINE_LYRICS_CACHE_TTL_MS) {
    onlineLyricsCache.delete(safeKey);
    return null;
  }

  // 关键逻辑：命中后更新 LRU 顺序
  onlineLyricsCache.delete(safeKey);
  onlineLyricsCache.set(safeKey, cached);

  return cached.result || null;
}

/**
 * 写入在线歌词缓存
 * @param {string} cacheKey
 * @param {{ lines: LyricsLine[], source: string }} result
 * @returns {void}
 */
function setOnlineLyricsCache(cacheKey, result) {
  const safeKey = (cacheKey || "").trim();
  if (!safeKey || !result?.lines?.length) {
    return;
  }

  // 关键逻辑：写入时更新 LRU 顺序
  if (onlineLyricsCache.has(safeKey)) {
    onlineLyricsCache.delete(safeKey);
  }

  onlineLyricsCache.set(safeKey, {
    result,
    cachedAt: Date.now(),
  });

  // 关键逻辑：超过上限时淘汰最早数据
  if (onlineLyricsCache.size > ONLINE_LYRICS_CACHE_LIMIT) {
    const oldestKey = onlineLyricsCache.keys().next().value;
    if (oldestKey) {
      onlineLyricsCache.delete(oldestKey);
    }
  }
}

/**
 * 构建歌词搜索关键字
 * @param {string} title
 * @param {string} artist
 * @returns {string}
 */
function buildLyricsSearchKeyword(title, artist) {
  const safeTitle = normalizeLyricsSearchText(title) || (title || "").trim();
  const safeArtist =
    normalizeLyricsSearchText(artist) || (artist || "").trim();
  const keyword = `${safeTitle} ${safeArtist}`.trim();

  return keyword;
}

/**
 * 构建歌手候选列表
 * @param {string} artist
 * @returns {string[]}
 */
function buildArtistSearchCandidates(artist) {
  const candidates = new Set();
  const trimmed = (artist || "").trim();

  if (trimmed) {
    candidates.add(trimmed);
  }

  const normalized = normalizeLyricsSearchText(trimmed);
  if (normalized && normalized !== trimmed) {
    candidates.add(normalized);
  }

  // 关键逻辑：仅取第一个艺人，避免合辑导致匹配失败
  const firstArtist = trimmed
    .split(/\s*(?:,|，|、|&|＆|\/|;|；|feat\.|featuring)\s*/i)[0]
    .trim();
  if (firstArtist && firstArtist !== trimmed) {
    candidates.add(firstArtist);
  }

  return Array.from(candidates);
}

/**
 * 解析 Spotify 歌词响应
 * @param {any} data
 * @returns {LyricsLine[]}
 */
function parseSpotifyLyricsResponse(data) {
  const lines = Array.isArray(data?.lyrics?.lines) ? data.lyrics.lines : [];
  const syncType = data?.lyrics?.syncType || "";

  if (!lines.length) {
    return [];
  }

  const hasTimeline =
    syncType === "LINE_SYNCED" ||
    syncType === "SYNCED" ||
    lines.some((line) => Number.isFinite(Number(line?.startTimeMs)));

  const mappedLines = lines.map((line, index) => {
    const text = (line?.words || line?.text || line?.line || "").trim();
    const startTimeMs = Number(line?.startTimeMs);
    // 关键逻辑：无时间戳时按固定间隔生成时间轴
    const time =
      hasTimeline && Number.isFinite(startTimeMs)
        ? startTimeMs
        : index * PLAIN_TEXT_INTERVAL_MS;

    return {
      time,
      text: text || "…",
    };
  });

  return normalizeLyricsLines(mappedLines);
}

/**
 * 拉取 Spotify 访问令牌
 * @returns {Promise<{ accessToken: string, expiresAt: number }>}
 */
async function requestSpotifyAccessToken() {
  const response = await fetchWithTimeout(
    SPOTIFY_ACCESS_TOKEN_URL,
    { credentials: "include" },
    REQUEST_TIMEOUT_MS
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Spotify Token 请求失败（${response.status}）：${errorText}`);
  }

  const data = await response.json();
  if (data?.isAnonymous) {
    // 关键逻辑：未登录时直接提示
    throw new Error("未检测到 Spotify 登录状态");
  }

  const accessToken = data?.accessToken || "";
  const expiresAt = Number(data?.accessTokenExpirationTimestampMs) || 0;

  if (!accessToken) {
    throw new Error("未获取到 Spotify Token");
  }

  return {
    accessToken,
    expiresAt: expiresAt || Date.now() + 5 * 60 * 1000,
  };
}

/**
 * 获取可用 Spotify 访问令牌
 * @returns {Promise<string>}
 */
async function getSpotifyAccessToken() {
  if (
    spotifyAccessToken &&
    spotifyAccessTokenExpiresAt - SPOTIFY_TOKEN_REFRESH_BUFFER_MS > Date.now()
  ) {
    return spotifyAccessToken;
  }

  // 关键逻辑：刷新并缓存 token
  const tokenInfo = await requestSpotifyAccessToken();
  spotifyAccessToken = tokenInfo.accessToken;
  spotifyAccessTokenExpiresAt = tokenInfo.expiresAt;
  return spotifyAccessToken;
}

/**
 * 请求 Spotify 歌词
 * @param {string} trackId
 * @returns {Promise<LyricsLine[]>}
 */
async function requestSpotifyLyrics(trackId) {
  if (!trackId) {
    return [];
  }

  const token = await getSpotifyAccessToken();
  const url = `${SPOTIFY_LYRICS_BASE_URL}/${encodeURIComponent(
    trackId
  )}?format=json&market=from_token`;

  const response = await fetchWithTimeout(
    url,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "app-platform": "WebPlayer",
      },
    },
    REQUEST_TIMEOUT_MS
  );

  if (response.status === 404) {
    return [];
  }

  if (response.status === 401) {
    // 关键逻辑：Token 过期后重试一次
    spotifyAccessToken = "";
    spotifyAccessTokenExpiresAt = 0;
    const retryToken = await getSpotifyAccessToken();

    const retryResponse = await fetchWithTimeout(
      url,
      {
        headers: {
          Authorization: `Bearer ${retryToken}`,
          "app-platform": "WebPlayer",
        },
      },
      REQUEST_TIMEOUT_MS
    );

    if (!retryResponse.ok) {
      const retryText = await retryResponse.text();
      throw new Error(
        `Spotify 歌词接口错误（${retryResponse.status}）：${retryText}`
      );
    }

    const retryData = await retryResponse.json();
    return parseSpotifyLyricsResponse(retryData);
  }

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Spotify 歌词接口错误（${response.status}）：${errorText}`);
  }

  const data = await response.json();
  return parseSpotifyLyricsResponse(data);
}

/**
 * 通过网易云搜索接口检索歌曲
 * @param {{ title: string, artist?: string }} payload
 * @returns {Promise<any[]>}
 */
async function requestNeteaseSearch(payload) {
  const title = payload?.title?.trim() || "";
  const artist = payload?.artist?.trim() || "";
  const keyword = buildLyricsSearchKeyword(title, artist);

  if (!keyword) {
    return [];
  }

  const url = new URL(NETEASE_SEARCH_API_URL);
  url.searchParams.set("s", keyword);
  url.searchParams.set("type", "1");
  url.searchParams.set("offset", "0");
  url.searchParams.set("limit", "10");

  const response = await fetchWithTimeout(
    url.toString(),
    undefined,
    REQUEST_TIMEOUT_MS
  );

  if (response.status === 404) {
    return [];
  }

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`网易云搜索接口错误（${response.status}）：${errorText}`);
  }

  const data = await response.json();
  const songs = data?.result?.songs;
  return Array.isArray(songs) ? songs : [];
}

/**
 * 选择网易云搜索结果中的最佳匹配
 * @param {any[]} results
 * @param {string} title
 * @param {string} artist
 * @returns {any | null}
 */
function pickBestNeteaseSong(results, title, artist) {
  if (!Array.isArray(results) || !results.length) {
    return null;
  }

  const titleKey = buildLyricsMatchKey(title);
  const artistKey = buildLyricsMatchKey(artist);
  let bestMatch = null;
  let bestScore = -1;

  results.forEach((item) => {
    const candidateTitle = item?.name || "";
    const artistList = Array.isArray(item?.artists)
      ? item.artists
      : Array.isArray(item?.ar)
        ? item.ar
        : [];
    const candidateArtist = artistList
      .map((artistItem) => artistItem?.name || "")
      .filter(Boolean)
      .join(" ");
    const candidateTitleKey = buildLyricsMatchKey(candidateTitle);
    const candidateArtistKey = buildLyricsMatchKey(candidateArtist);
    if (!candidateTitleKey) {
      return;
    }

    let score = 0;
    // 关键逻辑：标题优先匹配，忽略符号/空白
    if (titleKey && candidateTitleKey === titleKey) {
      score += 3;
    } else if (
      titleKey &&
      (candidateTitleKey.includes(titleKey) || titleKey.includes(candidateTitleKey))
    ) {
      score += 1;
    }

    if (artistKey && candidateArtistKey === artistKey) {
      score += 2;
    } else if (
      artistKey &&
      (candidateArtistKey.includes(artistKey) || artistKey.includes(candidateArtistKey))
    ) {
      score += 1;
    }

    if (score > bestScore) {
      bestScore = score;
      bestMatch = item;
    }
  });

  return bestScore > 0 ? bestMatch : null;
}

/**
 * 通过网易云歌曲 ID 拉取歌词
 * @param {number | string} songId
 * @returns {Promise<{ lines: LyricsLine[], source: string } | null>}
 */
async function requestNeteaseLyricsById(songId) {
  if (!songId) {
    return null;
  }

  const url = new URL(NETEASE_LYRIC_API_URL);
  url.searchParams.set("id", String(songId));
  url.searchParams.set("lv", "1");
  url.searchParams.set("kv", "1");
  url.searchParams.set("tv", "-1");

  const response = await fetchWithTimeout(
    url.toString(),
    undefined,
    REQUEST_TIMEOUT_MS
  );

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`网易云歌词接口错误（${response.status}）：${errorText}`);
  }

  const data = await response.json();
  const lyricText = data?.lrc?.lyric || "";
  const parsedLines = parseLyricsInput(lyricText);

  if (!parsedLines.length) {
    return null;
  }

  return {
    lines: parsedLines,
    source: "netease",
  };
}

/**
 * 通过网易云拉取歌词
 * @param {{ title: string, artist: string }} payload
 * @returns {Promise<{ lines: LyricsLine[], source: string } | null>}
 */
async function requestNeteaseLyrics(payload) {
  const title = payload?.title?.trim() || "";
  const artist = payload?.artist?.trim() || "";

  if (!title || !artist) {
    return null;
  }

  const results = await requestNeteaseSearch({ title, artist });
  const candidateLimit = 3;
  const candidates = [];
  const bestMatch = pickBestNeteaseSong(results, title, artist);
  const bestMatchId = bestMatch?.id;

  // 关键逻辑：优先最佳匹配
  if (bestMatch) {
    candidates.push(bestMatch);
  }

  // 关键逻辑：补充前几项结果作为兜底
  for (const item of results) {
    if (candidates.length >= candidateLimit) {
      break;
    }

    const itemId = item?.id;
    if (!itemId || itemId === bestMatchId) {
      continue;
    }

    candidates.push(item);
  }

  // 关键逻辑：逐个尝试候选歌词
  for (const candidate of candidates) {
    const songId = candidate?.id;
    if (!songId) {
      continue;
    }

    const lyricResult = await requestNeteaseLyricsById(songId);
    if (lyricResult?.lines?.length) {
      return lyricResult;
    }
  }

  return null;
}

/**
 * 通过酷狗搜索接口检索歌曲
 * @param {{ title: string, artist?: string }} payload
 * @returns {Promise<any[]>}
 */
async function requestKugouSearch(payload) {
  const title = payload?.title?.trim() || "";
  const artist = payload?.artist?.trim() || "";
  const keyword = buildLyricsSearchKeyword(title, artist);

  if (!keyword) {
    return [];
  }

  const url = new URL(KUGOU_SEARCH_API_URL);
  url.searchParams.set("format", "json");
  url.searchParams.set("keyword", keyword);
  url.searchParams.set("page", "1");
  url.searchParams.set("pagesize", "10");

  const response = await fetchWithTimeout(
    url.toString(),
    undefined,
    REQUEST_TIMEOUT_MS
  );

  if (response.status === 404) {
    return [];
  }

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`酷狗搜索接口错误（${response.status}）：${errorText}`);
  }

  const data = await response.json();
  const songs = data?.data?.info || data?.info;
  return Array.isArray(songs) ? songs : [];
}

/**
 * 选择酷狗搜索结果中的最佳匹配
 * @param {any[]} results
 * @param {string} title
 * @param {string} artist
 * @returns {any | null}
 */
function pickBestKugouSong(results, title, artist) {
  if (!Array.isArray(results) || !results.length) {
    return null;
  }

  const titleKey = buildLyricsMatchKey(title);
  const artistKey = buildLyricsMatchKey(artist);
  let bestMatch = null;
  let bestScore = -1;

  results.forEach((item) => {
    const candidateTitle = item?.songname || item?.songname_original || "";
    const candidateArtist = item?.singername || "";
    const candidateTitleKey = buildLyricsMatchKey(candidateTitle);
    const candidateArtistKey = buildLyricsMatchKey(candidateArtist);
    if (!candidateTitleKey) {
      return;
    }

    let score = 0;
    // 关键逻辑：标题优先匹配，忽略符号/空白
    if (titleKey && candidateTitleKey === titleKey) {
      score += 3;
    } else if (
      titleKey &&
      (candidateTitleKey.includes(titleKey) || titleKey.includes(candidateTitleKey))
    ) {
      score += 1;
    }

    if (artistKey && candidateArtistKey === artistKey) {
      score += 2;
    } else if (
      artistKey &&
      (candidateArtistKey.includes(artistKey) || artistKey.includes(candidateArtistKey))
    ) {
      score += 1;
    }

    if (score > bestScore) {
      bestScore = score;
      bestMatch = item;
    }
  });

  return bestScore > 0 ? bestMatch : null;
}

/**
 * 通过酷狗歌曲 Hash 拉取歌词
 * @param {{ hash: string, keyword: string }} payload
 * @returns {Promise<{ lines: LyricsLine[], source: string } | null>}
 */
async function requestKugouLyricsByHash(payload) {
  const hash = payload?.hash || "";
  const keyword = payload?.keyword || "";

  if (!hash || !keyword) {
    return null;
  }

  const searchUrl = new URL(KUGOU_LYRIC_SEARCH_API_URL);
  searchUrl.searchParams.set("ver", "1");
  searchUrl.searchParams.set("man", "yes");
  searchUrl.searchParams.set("client", "pc");
  searchUrl.searchParams.set("hash", hash);
  searchUrl.searchParams.set("keyword", keyword);

  const response = await fetchWithTimeout(
    searchUrl.toString(),
    undefined,
    REQUEST_TIMEOUT_MS
  );

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`酷狗歌词搜索接口错误（${response.status}）：${errorText}`);
  }

  const data = await response.json();
  const candidates = Array.isArray(data?.candidates)
    ? data.candidates
    : Array.isArray(data?.data?.candidates)
      ? data.data.candidates
      : [];
  const targetCandidate = candidates[0];
  if (!targetCandidate?.id || !targetCandidate?.accesskey) {
    return null;
  }

  const downloadUrl = new URL(KUGOU_LYRIC_DOWNLOAD_API_URL);
  downloadUrl.searchParams.set("ver", "1");
  downloadUrl.searchParams.set("client", "pc");
  downloadUrl.searchParams.set("id", String(targetCandidate.id));
  downloadUrl.searchParams.set("accesskey", targetCandidate.accesskey);
  downloadUrl.searchParams.set("fmt", "lrc");

  const downloadResponse = await fetchWithTimeout(
    downloadUrl.toString(),
    undefined,
    REQUEST_TIMEOUT_MS
  );

  if (downloadResponse.status === 404) {
    return null;
  }

  if (!downloadResponse.ok) {
    const errorText = await downloadResponse.text();
    throw new Error(`酷狗歌词下载接口错误（${downloadResponse.status}）：${errorText}`);
  }

  const downloadData = await downloadResponse.json();
  const rawContent = downloadData?.content || downloadData?.data?.content || "";
  let lyricText = rawContent;

  if (rawContent) {
    try {
      // 关键逻辑：酷狗接口常返回 Base64 歌词内容
      lyricText = window.atob(rawContent);
    } catch (error) {
      lyricText = rawContent;
    }
  }

  const parsedLines = parseLyricsInput(lyricText);
  if (!parsedLines.length) {
    return null;
  }

  return {
    lines: parsedLines,
    source: "kugou",
  };
}

/**
 * 通过酷狗拉取歌词
 * @param {{ title: string, artist: string }} payload
 * @returns {Promise<{ lines: LyricsLine[], source: string } | null>}
 */
async function requestKugouLyrics(payload) {
  const title = payload?.title?.trim() || "";
  const artist = payload?.artist?.trim() || "";
  const keyword = buildLyricsSearchKeyword(title, artist);

  if (!title || !artist || !keyword) {
    return null;
  }

  const results = await requestKugouSearch({ title, artist });
  const candidateLimit = 3;
  const candidates = [];
  const bestMatch = pickBestKugouSong(results, title, artist);
  const bestMatchHash = bestMatch?.hash;

  // 关键逻辑：优先最佳匹配
  if (bestMatch) {
    candidates.push(bestMatch);
  }

  // 关键逻辑：补充前几项结果作为兜底
  for (const item of results) {
    if (candidates.length >= candidateLimit) {
      break;
    }

    const itemHash = item?.hash;
    if (!itemHash || itemHash === bestMatchHash) {
      continue;
    }

    candidates.push(item);
  }

  // 关键逻辑：逐个尝试候选歌词
  for (const candidate of candidates) {
    const candidateHash = candidate?.hash || "";
    if (!candidateHash) {
      continue;
    }

    const candidateTitle =
      candidate?.songname || candidate?.songname_original || title;
    const candidateArtist = candidate?.singername || artist;
    const candidateKeyword =
      buildLyricsSearchKeyword(candidateTitle, candidateArtist) || keyword;
    const lyricResult = await requestKugouLyricsByHash({
      hash: candidateHash,
      keyword: candidateKeyword,
    });

    if (lyricResult?.lines?.length) {
      return lyricResult;
    }
  }

  return null;
}

/**
 * 通过 LRCLIB 搜索接口检索歌词
 * @param {{ title: string, artist?: string, durationMs?: number }} payload
 * @returns {Promise<any[]>}
 */
async function requestLrclibSearch(payload) {
  const title = payload?.title?.trim() || "";
  const artist = payload?.artist?.trim() || "";

  if (!title) {
    return [];
  }

  const url = new URL(LRCLIB_SEARCH_API_URL);
  url.searchParams.set("track_name", title);
  if (artist) {
    url.searchParams.set("artist_name", artist);
  }
  if (Number.isFinite(payload?.durationMs)) {
    // 关键逻辑：搜索接口使用毫秒
    url.searchParams.set("duration", String(Math.round(payload.durationMs)));
  }

  const response = await fetchWithTimeout(
    url.toString(),
    undefined,
    REQUEST_TIMEOUT_MS
  );

  if (response.status === 404) {
    return [];
  }

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`LRCLIB 搜索接口错误（${response.status}）：${errorText}`);
  }

  const data = await response.json();
  return Array.isArray(data) ? data : [];
}

/**
 * 选择 LRCLIB 搜索结果中的最佳匹配
 * @param {any[]} results
 * @param {string} title
 * @param {string} artist
 * @returns {any | null}
 */
function pickBestLrclibSearchResult(results, title, artist) {
  if (!Array.isArray(results) || !results.length) {
    return null;
  }

  const titleKey = buildLyricsMatchKey(title);
  const artistKey = buildLyricsMatchKey(artist);
  let bestMatch = null;
  let bestScore = -1;

  results.forEach((item) => {
    const candidateTitle = item?.trackName || item?.name || "";
    const candidateArtist = item?.artistName || "";
    const candidateTitleKey = buildLyricsMatchKey(candidateTitle);
    const candidateArtistKey = buildLyricsMatchKey(candidateArtist);
    if (!candidateTitleKey) {
      return;
    }

    let score = 0;
    // 关键逻辑：标题优先匹配，忽略符号/空白
    if (titleKey && candidateTitleKey === titleKey) {
      score += 3;
    } else if (
      titleKey &&
      (candidateTitleKey.includes(titleKey) || titleKey.includes(candidateTitleKey))
    ) {
      score += 1;
    }

    if (artistKey && candidateArtistKey === artistKey) {
      score += 2;
    } else if (
      artistKey &&
      (candidateArtistKey.includes(artistKey) || artistKey.includes(candidateArtistKey))
    ) {
      score += 1;
    }

    if (score > bestScore) {
      bestScore = score;
      bestMatch = item;
    }
  });

  return bestScore > 0 ? bestMatch : null;
}

/**
 * 通过 LRCLIB 拉取歌词
 * @param {{ title: string, artist: string, album?: string, durationMs?: number, allowSearchFallback?: boolean }} payload
 * @returns {Promise<{ lines: LyricsLine[], source: string } | null>}
 */
async function requestLrclibLyrics(payload) {
  const title = payload?.title?.trim() || "";
  const artist = payload?.artist?.trim() || "";
  const allowSearchFallback = payload?.allowSearchFallback !== false;

  if (!title || !artist) {
    return null;
  }

  const url = new URL(LRCLIB_API_URL);
  url.searchParams.set("track_name", title);
  url.searchParams.set("artist_name", artist);

  if (payload?.album) {
    url.searchParams.set("album_name", payload.album.trim());
  }

  if (Number.isFinite(payload?.durationMs)) {
    // 关键逻辑：LRCLIB 使用秒级时长
    url.searchParams.set(
      "duration",
      String(Math.round(payload.durationMs / 1000))
    );
  }

  const response = await fetchWithTimeout(
    url.toString(),
    undefined,
    REQUEST_TIMEOUT_MS
  );

  if (response.status === 404) {
    if (allowSearchFallback) {
      const searchResult = await requestLrclibSearch({ title, artist });
      const bestMatch = pickBestLrclibSearchResult(searchResult, title, artist);
      if (bestMatch) {
        return requestLrclibLyrics({
          title: bestMatch.trackName || bestMatch.name || title,
          artist: bestMatch.artistName || artist,
          album: bestMatch.albumName,
          durationMs: Number.isFinite(Number(bestMatch.duration))
            ? Number(bestMatch.duration) * 1000
            : payload?.durationMs,
          allowSearchFallback: false,
        });
      }
    }

    return null;
  }

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`LRCLIB 接口错误（${response.status}）：${errorText}`);
  }

  const data = await response.json();
  // 关键逻辑：优先读取 LRC，否则回退纯文本
  const parsedLines = parseLyricsInput(
    data?.syncedLyrics || data?.plainLyrics || ""
  );

  if (!parsedLines.length) {
    if (allowSearchFallback) {
      const searchResult = await requestLrclibSearch({ title, artist });
      const bestMatch = pickBestLrclibSearchResult(searchResult, title, artist);
      if (bestMatch) {
        return requestLrclibLyrics({
          title: bestMatch.trackName || bestMatch.name || title,
          artist: bestMatch.artistName || artist,
          album: bestMatch.albumName,
          durationMs: Number.isFinite(Number(bestMatch.duration))
            ? Number(bestMatch.duration) * 1000
            : payload?.durationMs,
          allowSearchFallback: false,
        });
      }
    }

    return null;
  }

  return {
    lines: parsedLines,
    source: "lrclib",
  };
}

/**
 * 通过 lyrics.ovh 拉取歌词
 * @param {{ title: string, artist: string }} payload
 * @returns {Promise<{ lines: LyricsLine[], source: string } | null>}
 */
async function requestLyricsOvh(payload) {
  const title = payload?.title?.trim() || "";
  const artist = payload?.artist?.trim() || "";

  if (!title || !artist) {
    return null;
  }

  const url = `${LYRICS_OVH_API_URL}/${encodeURIComponent(artist)}/${encodeURIComponent(
    title
  )}`;
  const response = await fetchWithTimeout(
    url,
    undefined,
    REQUEST_TIMEOUT_MS
  );

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`lyrics.ovh 接口错误（${response.status}）：${errorText}`);
  }

  const data = await response.json();
  const parsedLines = parseLyricsInput(data?.lyrics || "");

  if (!parsedLines.length) {
    return null;
  }

  return {
    lines: parsedLines,
    source: "lyrics_ovh",
  };
}

/**
 * 获取在线歌词（多源兜底）
 * @param {{ trackId: string, title: string, artist: string }} trackInfo
 * @returns {Promise<{ lines: LyricsLine[], source: string } | null>}
 */
async function requestOnlineLyricsForTrack(trackInfo) {
  if (!trackInfo?.title || !trackInfo?.artist) {
    return null;
  }

  // 关键逻辑：先读取缓存，避免重复请求
  const cacheKey = buildOnlineLyricsCacheKey(trackInfo);
  const cachedResult = getOnlineLyricsCache(cacheKey);
  if (cachedResult?.lines?.length) {
    return cachedResult;
  }

  const spotifyTrackId = normalizeSpotifyTrackId(trackInfo.trackId);
  const titleCandidates = buildTitleSearchCandidates(trackInfo.title);
  const artistCandidates = buildArtistSearchCandidates(trackInfo.artist);
  const searchPairs = [];

  // 关键逻辑：组合标题与艺人候选，提升命中率
  for (const title of titleCandidates) {
    for (const artist of artistCandidates) {
      searchPairs.push({ title, artist });
    }
  }

  try {
    // 关键逻辑：优先尝试网易云歌词
    for (const pair of searchPairs) {
      const neteaseResult = await requestNeteaseLyrics(pair);
      if (neteaseResult?.lines?.length) {
        setOnlineLyricsCache(cacheKey, neteaseResult);
        return neteaseResult;
      }
    }
  } catch (error) {
    console.warn("[Lyrics][Netease] 请求失败", error);
  }

  try {
    // 关键逻辑：网易云失败后回退酷狗
    for (const pair of searchPairs) {
      const kugouResult = await requestKugouLyrics(pair);
      if (kugouResult?.lines?.length) {
        setOnlineLyricsCache(cacheKey, kugouResult);
        return kugouResult;
      }
    }
  } catch (error) {
    console.warn("[Lyrics][Kugou] 请求失败", error);
  }

  if (spotifyTrackId) {
    try {
      // 关键逻辑：网易云/酷狗失败后回退 Spotify
      const spotifyLines = await requestSpotifyLyrics(spotifyTrackId);
      if (spotifyLines.length) {
        const spotifyResult = {
          lines: spotifyLines,
          source: "spotify",
        };
        setOnlineLyricsCache(cacheKey, spotifyResult);
        return spotifyResult;
      }
    } catch (error) {
      console.warn("[Lyrics][Spotify] 请求失败", error);
    }
  }

  try {
    // 关键逻辑：Spotify 失败后回退 LRCLIB
    for (const [index, pair] of searchPairs.entries()) {
      const lrclibResult = await requestLrclibLyrics({
        ...pair,
        allowSearchFallback: index === 0,
      });
      if (lrclibResult?.lines?.length) {
        setOnlineLyricsCache(cacheKey, lrclibResult);
        return lrclibResult;
      }
    }
  } catch (error) {
    console.warn("[Lyrics][LRCLIB] 请求失败", error);
  }

  try {
    // 关键逻辑：LRCLIB 失败后回退 lyrics.ovh
    for (const pair of searchPairs) {
      const ovhResult = await requestLyricsOvh(pair);
      if (ovhResult?.lines?.length) {
        setOnlineLyricsCache(cacheKey, ovhResult);
        return ovhResult;
      }
    }
  } catch (error) {
    console.warn("[Lyrics][lyrics.ovh] 请求失败", error);
  }

  return null;
}

/**
 * 获取当前歌曲信息
 * @returns {{ trackId: string, title: string, artist: string } | null}
 */
function getCurrentTrackInfo() {
  const baseInfo = playbackState || lyricsRecord;
  if (!baseInfo) {
    return null;
  }

  // 关键逻辑：优先读取播放状态，否则使用已有歌词记录
  return {
    trackId: baseInfo.trackId || "",
    title: baseInfo.title || "",
    artist: baseInfo.artist || "",
  };
}

/**
 * 应用在线歌词结果
 * @param {{ trackId: string, title: string, artist: string }} trackInfo
 * @param {{ lines: LyricsLine[], source: string }} result
 * @returns {void}
 */
function applyOnlineLyricsResult(trackInfo, result) {
  const shouldReset = !lyricsRecord || lyricsRecord.trackId !== trackInfo.trackId;
  const nextOffset = shouldReset ? 0 : lyricsRecord?.offset ?? 0;
  const nextSpeed = shouldReset ? 1 : lyricsRecord?.speed ?? 1;

  // 关键逻辑：切歌时重置偏移/速度
  lyricsRecord = {
    trackId: trackInfo.trackId,
    title: trackInfo.title,
    artist: trackInfo.artist,
    lyrics: result.lines,
    offset: nextOffset,
    speed: nextSpeed,
    source: result.source,
  };

  lyricsLines = normalizeLyricsLines(result.lines);
  activeLineIndex = -1;
  renderLyricsList(lyricsLines);
  updateControlLabels();

  if (!playbackState) {
    // 关键逻辑：无播放状态时补齐基础信息
    playbackState = {
      trackId: trackInfo.trackId,
      title: trackInfo.title,
      artist: trackInfo.artist,
      positionMs: 0,
      isPlaying: false,
      receivedAt: Date.now(),
    };
  }

  updateHeader();
}

/**
 * 应用桥接播放状态更新
 * @param {PlaybackState} nextPlaybackState
 * @returns {void}
 */
function applyPlaybackUpdate(nextPlaybackState) {
  if (!nextPlaybackState?.trackId) {
    return;
  }

  const isTrackChanged =
    !playbackState || playbackState.trackId !== nextPlaybackState.trackId;

  // 关键逻辑：同步播放状态
  playbackState = {
    trackId: nextPlaybackState.trackId,
    title: nextPlaybackState.title || "",
    artist: nextPlaybackState.artist || "",
    positionMs: Number(nextPlaybackState.positionMs) || 0,
    isPlaying: Boolean(nextPlaybackState.isPlaying),
    receivedAt: Number(nextPlaybackState.receivedAt) || Date.now(),
  };

  if (isTrackChanged) {
    // 关键逻辑：切歌时清空旧歌词，避免串台
    lyricsRecord = {
      trackId: playbackState.trackId,
      title: playbackState.title,
      artist: playbackState.artist,
      lyrics: [],
      offset: 0,
      speed: 1,
      source: "none",
    };
    lyricsLines = [];
    activeLineIndex = -1;
    renderLyricsList(lyricsLines);
  } else if (lyricsRecord) {
    // 关键逻辑：同步标题与歌手
    lyricsRecord.title = playbackState.title || lyricsRecord.title;
    lyricsRecord.artist = playbackState.artist || lyricsRecord.artist;
  }

  // 关键逻辑：播放状态同步到歌词暂停状态
  if (playbackState.isPlaying) {
    isLyricsPaused = false;
    pausedLyricsClockMs = null;
  } else {
    isLyricsPaused = true;
    pausedLyricsClockMs = getCurrentLyricsClockMs();
  }

  updateHeader();
  updateControlLabels();

  if (isTrackChanged) {
    // 关键逻辑：切歌后自动拉取在线歌词
    void requestOnlineLyrics();
  }
}

/**
 * 初始化 Mock 状态
 * @returns {void}
 */
function initMockState() {
  // 关键逻辑：确保演示时有基础歌词与播放信息
  playbackState = {
    trackId: MOCK_TRACK.trackId,
    title: MOCK_TRACK.title,
    artist: MOCK_TRACK.artist,
    positionMs: 0,
    isPlaying: true,
    receivedAt: Date.now(),
  };

  lyricsRecord = {
    trackId: MOCK_TRACK.trackId,
    title: MOCK_TRACK.title,
    artist: MOCK_TRACK.artist,
    lyrics: MOCK_LYRICS,
    offset: 0,
    speed: 1,
    source: "mock",
  };

  lyricsLines = normalizeLyricsLines(MOCK_LYRICS);
}

/**
 * 绑定播放桥接更新
 * @returns {void}
 */
function bindPlaybackBridgeUpdates() {
  if (!desktopApi?.onPlaybackUpdate) {
    return;
  }

  // 关键逻辑：监听主进程推送的播放状态
  desktopApi.onPlaybackUpdate((payload) => {
    if (!payload?.trackId) {
      return;
    }

    applyPlaybackUpdate(payload);
  });
}

/**
 * 获取当前播放时间
 * @returns {number}
 */
function getCurrentPlaybackPositionMs() {
  if (!playbackState) {
    return 0;
  }

  if (!playbackState.isPlaying) {
    return playbackState.positionMs;
  }

  // 关键逻辑：播放中基于接收时间推算当前进度
  const elapsed = Date.now() - playbackState.receivedAt;
  return playbackState.positionMs + Math.max(0, elapsed);
}

/**
 * 获取当前歌词逻辑时间
 * @returns {number}
 */
function getCurrentLyricsClockMs() {
  if (!lyricsRecord) {
    return 0;
  }

  if (isLyricsPaused && pausedLyricsClockMs !== null) {
    return pausedLyricsClockMs;
  }

  // 关键逻辑：应用偏移与速度得到歌词逻辑时间
  const offset = lyricsRecord.offset ?? 0;
  const speed = lyricsRecord.speed ?? 1;
  const basePosition = getCurrentPlaybackPositionMs();

  return (basePosition + offset) * speed;
}

/**
 * 计算当前高亮行索引
 * @param {number} currentTimeMs
 * @returns {number}
 */
function getActiveLineIndex(currentTimeMs) {
  if (!lyricsLines.length) {
    return -1;
  }

  let currentIndex = -1;

  // 关键逻辑：线性扫描获取最后一条不超过当前时间的行
  for (let index = 0; index < lyricsLines.length; index += 1) {
    if (lyricsLines[index].time <= currentTimeMs) {
      currentIndex = index;
    } else {
      break;
    }
  }

  return currentIndex;
}

/**
 * 更新顶部歌曲信息
 * @returns {void}
 */
function updateHeader() {
  if (!playbackState) {
    dom.trackTitle.textContent = "未检测到歌曲";
    dom.trackArtist.textContent = "—";
    dom.playbackStatus.textContent = "等待中";
    dom.playbackTime.textContent = "00:00";
    return;
  }

  dom.trackTitle.textContent = playbackState.title || "未知歌曲";
  dom.trackArtist.textContent = playbackState.artist || "未知歌手";
  dom.playbackStatus.textContent = playbackState.isPlaying
    ? "播放中"
    : "已暂停";
  dom.playbackTime.textContent = formatTimeMs(getCurrentPlaybackPositionMs());
}

/**
 * 更新控制面板文案
 * @returns {void}
 */
function updateControlLabels() {
  const offset = lyricsRecord?.offset ?? 0;

  // 关键逻辑：设置面板控件不存在时跳过文案更新
  if (dom.offsetValue) {
    dom.offsetValue.textContent = formatOffsetLabel(offset);
  }
  dom.toggleLyrics.textContent = isLyricsPaused ? "▶" : "⏸";
}

/**
 * 更新窗口交互状态
 * @returns {void}
 */
function updateWindowInteractionState() {
  if (!dom.appRoot) {
    return;
  }

  const shouldShowControls = isSettingsWindow ? true : isHovering;
  const bodyElement = document.body;

  // 关键逻辑：同步悬停与锁定状态到样式
  dom.appRoot.classList.toggle(
    "is-hovering",
    isSettingsWindow ? true : isHovering
  );
  dom.appRoot.classList.toggle("is-controls-hidden", !shouldShowControls);
  dom.appRoot.classList.toggle(
    "is-locked",
    isSettingsWindow ? false : isPinned
  );
  dom.appRoot.classList.toggle(
    "is-unlocked",
    isSettingsWindow ? false : !isPinned
  );
  dom.appRoot.classList.toggle(SETTINGS_WINDOW_CLASS, isSettingsWindow);

  if (bodyElement) {
    bodyElement.classList.toggle(
      "is-locked",
      isSettingsWindow ? false : isPinned
    );
    bodyElement.classList.toggle(
      "is-unlocked",
      isSettingsWindow ? false : !isPinned
    );
    bodyElement.classList.toggle(SETTINGS_WINDOW_CLASS, isSettingsWindow);
  }
}

/**
 * 处理鼠标进入窗口
 * @param {MouseEvent} event
 * @returns {void}
 */
function handleWindowMouseEnter(event) {
  if (hasHoverStateFromIpc) {
    return;
  }

  // 关键逻辑：刷新窗口屏幕范围，确保拖拽后命中准确
  refreshWindowBounds();

  if (isHovering) {
    return;
  }

  // 关键逻辑：输出悬停进入日志便于排查
  console.info("[Lyrics][Hover] enter window", {
    eventType: event?.type,
    isPinned,
  });

  // 关键逻辑：记录悬停状态并更新样式
  isHovering = true;
  updateWindowInteractionState();
}

/**
 * 处理鼠标离开窗口
 * @param {MouseEvent} event
 * @returns {void}
 */
function handleWindowMouseLeave(event) {
  if (hasHoverStateFromIpc) {
    return;
  }

  if (!isHovering) {
    return;
  }

  // 关键逻辑：输出悬停离开日志便于排查
  console.info("[Lyrics][Hover] leave window", {
    eventType: event?.type,
    isPinned,
  });

  // 关键逻辑：离开时收起控制按钮
  isHovering = false;
  updateWindowInteractionState();
}

/**
 * 处理窗口范围更新
 * @param {WindowBoundsPayload} payload
 * @returns {void}
 */
function handleWindowBoundsUpdate(payload) {
  if (!payload) {
    return;
  }

  const left = Number(payload.left);
  const top = Number(payload.top);
  const right = Number(payload.right);
  const bottom = Number(payload.bottom);
  const width = Number(payload.width);
  const height = Number(payload.height);

  if (
    !Number.isFinite(left) ||
    !Number.isFinite(top) ||
    !Number.isFinite(right) ||
    !Number.isFinite(bottom) ||
    !Number.isFinite(width) ||
    !Number.isFinite(height)
  ) {
    return;
  }

  // 关键逻辑：使用主进程推送的窗口范围，避免渲染层延迟
  hasWindowBoundsFromIpc = true;
  windowBounds = {
    left,
    top,
    right,
    bottom,
    width,
    height,
  };
}

/**
 * 处理窗口悬停状态更新
 * @param {WindowHoverPayload} payload
 * @returns {void}
 */
function handleWindowHoverUpdate(payload) {
  const nextHovering = Boolean(payload?.isHovering);

  // 关键逻辑：使用主进程推送的悬停状态
  hasHoverStateFromIpc = true;

  if (isHovering === nextHovering) {
    return;
  }

  isHovering = nextHovering;
  updateWindowInteractionState();
}

/**
 * 刷新窗口屏幕范围缓存
 * @returns {void}
 */
function refreshWindowBounds() {
  if (hasWindowBoundsFromIpc) {
    return;
  }

  const windowLeft = Number.isFinite(window.screenX) ? window.screenX : 0;
  const windowTop = Number.isFinite(window.screenY) ? window.screenY : 0;
  const windowWidth = Number.isFinite(window.outerWidth)
    ? window.outerWidth
    : window.innerWidth;
  const windowHeight = Number.isFinite(window.outerHeight)
    ? window.outerHeight
    : window.innerHeight;

  if (!Number.isFinite(windowWidth) || !Number.isFinite(windowHeight)) {
    return;
  }

  // 关键逻辑：根据窗口位置与尺寸计算屏幕命中范围
  windowBounds = {
    left: windowLeft,
    top: windowTop,
    width: windowWidth,
    height: windowHeight,
    right: windowLeft + windowWidth,
    bottom: windowTop + windowHeight,
  };
}

/**
 * 判断鼠标事件是否仍在窗口范围内
 * @param {MouseEvent} event
 * @returns {boolean}
 */
function isPointerInWindow(event) {
  const pointerX = event?.screenX;
  const pointerY = event?.screenY;

  if (!Number.isFinite(pointerX) || !Number.isFinite(pointerY)) {
    return false;
  }

  // 关键逻辑：同步窗口范围，确保移动窗口后仍能正确命中
  refreshWindowBounds();

  if (!windowBounds) {
    return false;
  }

  // 关键逻辑：使用屏幕坐标判断鼠标是否仍在窗口范围内
  return (
    pointerX >= windowBounds.left &&
    pointerX <= windowBounds.right &&
    pointerY >= windowBounds.top &&
    pointerY <= windowBounds.bottom
  );
}

/**
 * 处理鼠标移出窗口
 * @param {MouseEvent} event
 * @returns {void}
 */
function handleWindowMouseOut(event) {
  if (hasHoverStateFromIpc) {
    return;
  }

  // 旧逻辑暂时停用：仅保留基于窗口屏幕坐标的判断
  // const relatedTarget = event?.relatedTarget;
  //
  // // 关键逻辑：仅在鼠标真正离开窗口时触发收起
  // if (relatedTarget && document.contains(relatedTarget)) {
  //   return;
  // }

  if (isPointerInWindow(event)) {
    return;
  }

  handleWindowMouseLeave(event);
}

/**
 * 获取窗口内容高度
 * @returns {number}
 */
function getContentHeight() {
  if (!dom.appRoot) {
    return 0;
  }

  // 关键逻辑：同时取布局高度与滚动高度，避免 gap/缩放误差
  const layoutHeight = dom.appRoot.getBoundingClientRect().height || 0;
  const scrollHeight = dom.appRoot.scrollHeight || 0;

  return Math.ceil(Math.max(layoutHeight, scrollHeight));
}

/**
 * 同步窗口内容高度
 * @returns {void}
 */
function syncWindowHeight() {
  if (isSettingsWindow) {
    return;
  }

  if (!desktopApi?.setContentHeight || !dom.appRoot) {
    return;
  }

  if (contentHeightRafId) {
    window.cancelAnimationFrame(contentHeightRafId);
  }

  contentHeightRafId = window.requestAnimationFrame(() => {
    // 关键逻辑：读取真实内容高度并同步窗口
    const nextHeight = getContentHeight();

    if (!nextHeight || Math.abs(nextHeight - lastContentHeight) < 1) {
      contentHeightRafId = 0;
      return;
    }

    lastContentHeight = nextHeight;
    contentHeightRafId = 0;
    void desktopApi.setContentHeight(nextHeight);
  });
}

/**
 * 绑定内容尺寸监听
 * @returns {void}
 */
function bindContentResizeObserver() {
  if (!dom.appRoot || contentResizeObserver) {
    return;
  }

  if (typeof ResizeObserver === "undefined") {
    syncWindowHeight();
    return;
  }

  // 关键逻辑：监听内容尺寸变化
  contentResizeObserver = new ResizeObserver(() => {
    syncWindowHeight();
  });

  contentResizeObserver.observe(dom.appRoot);
}


/**
 * 切换设置面板显示状态
 * @param {boolean} nextOpen
 * @returns {void}
 */
function setSettingsPanelOpen(nextOpen) {
  if (!dom.settingsPanel || !dom.appRoot) {
    return;
  }

  if (isSettingsOpen === nextOpen) {
    return;
  }

  // 关键逻辑：同步面板显示与容器布局状态
  isSettingsOpen = nextOpen;
  dom.settingsPanel.classList.toggle("is-hidden", !nextOpen);
  dom.appRoot.classList.toggle("is-settings-open", nextOpen);
  // 关键逻辑：更新面板显示后同步交互状态
  updateWindowInteractionState();
  syncWindowHeight();
}

/**
 * 渲染歌词列表
 * @param {LyricsLine[]} lines
 * @returns {void}
 */
function renderLyricsList(lines) {
  dom.lyricsList.innerHTML = "";

  if (!lines.length) {
    const emptyLine = document.createElement("div");
    emptyLine.className = "lyrics-line is-empty";
    emptyLine.textContent = "暂无歌词";
    dom.lyricsList.appendChild(emptyLine);
    updateSingleLineText(-1);
    return;
  }

  lines.forEach((line, index) => {
    const lineElement = document.createElement("div");
    lineElement.className = "lyrics-line";
    lineElement.dataset.index = String(index);
    lineElement.textContent = line.text || "…";
    dom.lyricsList.appendChild(lineElement);
  });

  updateSingleLineText(activeLineIndex);
}

/**
 * 更新单行歌词显示
 * @param {number} activeIndex
 * @returns {void}
 */
function updateSingleLineText(activeIndex) {
  if (!dom.currentLineText || !dom.nextLineText) {
    return;
  }

  if (!lyricsLines.length) {
    dom.currentLineText.textContent = "暂无歌词";
    dom.nextLineText.textContent = "";
    return;
  }

  // 关键逻辑：未开始时也展示首句与下一句
  const safeIndex =
    activeIndex >= 0 && activeIndex < lyricsLines.length ? activeIndex : 0;
  const currentText = lyricsLines[safeIndex]?.text || "…";
  const nextText = lyricsLines[safeIndex + 1]?.text || "";

  dom.currentLineText.textContent = currentText;
  dom.nextLineText.textContent = nextText;
}

/**
 * 高亮指定歌词行
 * @param {number} index
 * @returns {void}
 */
function highlightLine(index) {
  const lineElements = dom.lyricsList.querySelectorAll(".lyrics-line");

  if (activeLineIndex >= 0 && lineElements[activeLineIndex]) {
    lineElements[activeLineIndex].classList.remove("is-active");
  }

  if (index >= 0 && lineElements[index]) {
    lineElements[index].classList.add("is-active");
  }

  activeLineIndex = index;
  updateSingleLineText(index);
}

/**
 * 更新当前高亮歌词行
 * @returns {void}
 */
function updateActiveLine() {
  if (!lyricsLines.length) {
    updateSingleLineText(-1);
    return;
  }

  const currentTime = getCurrentLyricsClockMs();
  const nextIndex = getActiveLineIndex(currentTime);

  if (nextIndex === activeLineIndex) {
    return;
  }

  highlightLine(nextIndex);

  const activeElement = dom.lyricsList.querySelector(
    `.lyrics-line[data-index="${nextIndex}"]`
  );

  if (activeElement) {
    activeElement.scrollIntoView({ behavior: "smooth", block: "center" });
  }
}

/**
 * 显示提示信息
 * @param {string} message
 * @param {boolean} isError
 * @returns {void}
 */
function showHint(message, isError) {
  dom.hintMessage.textContent = message;
  dom.hintMessage.classList.toggle("is-error", Boolean(isError));
}

/**
 * 获取按钮提示文案
 * @param {HTMLButtonElement} button
 * @returns {string}
 */
function getActionHintLabel(button) {
  const mappedLabel = BUTTON_HINT_LABELS[button.id];
  if (mappedLabel) {
    return mappedLabel;
  }

  const fallbackLabel =
    button.getAttribute("aria-label") || button.textContent || "";
  return fallbackLabel.trim() || "功能按钮";
}

/**
 * 展示操作提示
 * @param {string} message
 * @returns {void}
 */
function showActionHint(message) {
  if (!dom.actionHint) {
    return;
  }

  // 关键逻辑：更新提示内容并触发展示动画
  dom.actionHint.textContent = message;
  dom.actionHint.classList.add("is-visible");

  if (actionHintTimerId) {
    window.clearTimeout(actionHintTimerId);
  }

  actionHintTimerId = window.setTimeout(() => {
    dom.actionHint.classList.remove("is-visible");
    actionHintTimerId = 0;
  }, ACTION_HINT_DURATION_MS);
}

/**
 * 注册全局异常监听
 * @returns {void}
 */
function registerGlobalErrorHandlers() {
  // 关键逻辑：捕获脚本运行错误并输出到终端
  window.addEventListener("error", (event) => {
    // 关键逻辑：整理错误信息，便于主进程打印
    const errorMessage = event?.message || "未知脚本错误";
    const errorStack = event?.error?.stack || "";
    const fullMessage = errorStack
      ? `${errorMessage}\n${errorStack}`
      : errorMessage;

    console.error(`[Lyrics][Renderer] 脚本错误：${fullMessage}`);
    showActionHint(`渲染脚本错误：${errorMessage}`);
  });

  window.addEventListener("unhandledrejection", (event) => {
    // 关键逻辑：处理未捕获的 Promise 异常
    const reason = event?.reason;
    const reasonMessage =
      reason instanceof Error
        ? reason.message
        : String(reason ?? "未知异常");
    const reasonStack = reason instanceof Error ? reason.stack || "" : "";
    const fullMessage = reasonStack
      ? `${reasonMessage}\n${reasonStack}`
      : reasonMessage;

    console.error(`[Lyrics][Renderer] Promise 异常：${fullMessage}`);
    showActionHint(`Promise 异常：${reasonMessage}`);
  });
}

/**
 * 处理按钮点击提示
 * @param {MouseEvent} event
 * @returns {void}
 */
function handleActionButtonHint(event) {
  if (!(event.target instanceof Element)) {
    return;
  }

  const targetButton = event.target.closest("button");
  if (!targetButton) {
    return;
  }

  if (!DEV_ONLY_BUTTON_IDS.has(targetButton.id)) {
    return;
  }

  const label = getActionHintLabel(targetButton);
  showActionHint(`你当前点击${label}，功能正在开发中`);
}

/**
 * 绑定按钮提示事件
 * @returns {void}
 */
function bindActionHintEvents() {
  if (!dom.actionHint) {
    return;
  }

  document.addEventListener("click", handleActionButtonHint);
}

/**
 * 绑定窗口范围更新事件
 * @returns {void}
 */
function bindWindowBoundsEvents() {
  if (!desktopApi?.onWindowBounds) {
    return;
  }

  // 关键逻辑：监听主进程推送的窗口范围
  desktopApi.onWindowBounds(handleWindowBoundsUpdate);
}

/**
 * 绑定窗口悬停状态事件
 * @returns {void}
 */
function bindWindowHoverEvents() {
  if (!desktopApi?.onWindowHover) {
    return;
  }

  // 关键逻辑：监听主进程推送的悬停状态
  desktopApi.onWindowHover(handleWindowHoverUpdate);
}

/**
 * 绑定窗口悬停事件
 * @returns {void}
 */
function bindHoverEvents() {
  if (!dom.appRoot) {
    return;
  }

  dom.appRoot.addEventListener("mouseenter", handleWindowMouseEnter);
  dom.appRoot.addEventListener("mouseleave", handleWindowMouseLeave);
  window.addEventListener("mouseenter", handleWindowMouseEnter);
  window.addEventListener("mouseleave", handleWindowMouseLeave);
  window.addEventListener("mousemove", handleWindowMouseEnter);
  window.addEventListener("mouseout", handleWindowMouseOut);
}

/**
 * 同步播放状态
 * @param {boolean} isPlaying
 * @returns {void}
 */
function setPlaybackPlaying(isPlaying) {
  if (!playbackState) {
    return;
  }

  if (playbackState.isPlaying === isPlaying) {
    return;
  }

  // 关键逻辑：切换播放状态时刷新进度基准
  const currentPosition = getCurrentPlaybackPositionMs();
  playbackState.positionMs = currentPosition;
  playbackState.receivedAt = Date.now();
  playbackState.isPlaying = isPlaying;
}

/**
 * 向界面更新歌词设置
 * @param {{ offset?: number }} settings
 * @returns {void}
 */
function updateLyricsSettings(settings) {
  if (!lyricsRecord) {
    return;
  }

  // 关键逻辑：仅允许更新偏移值，避免速度调整入口
  if (typeof settings.offset === "number") {
    lyricsRecord.offset = settings.offset;
  }

  updateControlLabels();
}

/**
 * 发送播放控制指令
 * @param {string} action
 * @returns {Promise<void>}
 */
async function sendPlaybackControl(action) {
  const safeAction = String(action || "").trim();
  if (!safeAction) {
    showActionHint("播放控制指令无效");
    return;
  }

  try {
    // 关键逻辑：请求桌面端播放控制桥接
    const response = await fetchWithTimeout(
      PLAYBACK_CONTROL_URL,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action: safeAction }),
      },
      REQUEST_TIMEOUT_MS
    );

    if (!response.ok) {
      showActionHint("播放控制失败");
      return;
    }

    const responseData = await response.json().catch(() => ({}));
    if (responseData?.ok === false) {
      showActionHint(responseData?.error || "播放控制失败");
      return;
    }

    // 关键逻辑：使用更直观的播放控制提示
    const actionLabel = PLAYBACK_CONTROL_LABELS[safeAction] || "播放控制";
    showActionHint(`${actionLabel}指令已发送`);
  } catch (error) {
    console.warn("[Playback][Control] 播放控制请求异常", error);
    showActionHint("播放控制失败");
  }
}

/**
 * 切换歌词暂停状态
 * @returns {void}
 */
function toggleLyricsPause() {
  // 关键逻辑：输出播放/暂停点击日志便于排查
  console.info("[Lyrics][Control] toggle click", {
    hasTrack: Boolean(playbackState?.trackId),
  });

  if (!playbackState?.trackId) {
    showHint("未检测到歌曲", true);
    return;
  }

  // 关键逻辑：发送播放/暂停控制指令
  void sendPlaybackControl("toggle");
}

/**
 * 请求上一曲
 * @returns {void}
 */
function requestPrevTrack() {
  // 关键逻辑：输出上一曲点击日志便于排查
  console.info("[Lyrics][Control] prev click", {
    hasTrack: Boolean(playbackState?.trackId),
  });

  if (!playbackState?.trackId) {
    showHint("未检测到歌曲", true);
    return;
  }

  // 关键逻辑：发送上一曲控制指令
  void sendPlaybackControl("prev");
}

/**
 * 请求下一曲
 * @returns {void}
 */
function requestNextTrack() {
  // 关键逻辑：输出下一曲点击日志便于排查
  console.info("[Lyrics][Control] next click", {
    hasTrack: Boolean(playbackState?.trackId),
  });

  if (!playbackState?.trackId) {
    showHint("未检测到歌曲", true);
    return;
  }

  // 关键逻辑：发送下一曲控制指令
  void sendPlaybackControl("next");
}

/**
 * 处理在线刷新请求
 * @returns {void}
 */
async function requestOnlineLyrics() {
  if (isOnlineLyricsRequesting) {
    showHint("在线歌词正在请求中", false);
    return;
  }

  const trackInfo = getCurrentTrackInfo();
  if (!trackInfo?.title || !trackInfo?.artist) {
    showHint("未检测到歌曲", true);
    return;
  }

  isOnlineLyricsRequesting = true;
  showHint("正在请求在线歌词...", false);

  try {
    const result = await requestOnlineLyricsForTrack(trackInfo);
    if (!result?.lines?.length) {
      showHint("未找到可用在线歌词", true);
      return;
    }

    applyOnlineLyricsResult(trackInfo, result);
    // 关键逻辑：提示当前命中的歌词来源
    showHint(`已从${formatLyricsSourceLabel(result.source)}获取歌词`, false);
  } catch (error) {
    console.warn("[Lyrics][Online] 请求失败", error);
    showHint("在线歌词请求失败，请稍后重试", true);
  } finally {
    isOnlineLyricsRequesting = false;
  }
}

/**
 * 导入歌词
 * @returns {void}
 */
function importLyricsFromInput() {
  if (!lyricsRecord) {
    showHint("未检测到歌曲", true);
    return;
  }

  const inputText = dom.lyricsInput.value;
  const parsedLines = parseLyricsInput(inputText);

  if (!parsedLines.length) {
    showHint("未识别到可用歌词", true);
    return;
  }

  lyricsRecord.lyrics = parsedLines;
  lyricsLines = normalizeLyricsLines(parsedLines);
  activeLineIndex = -1;
  dom.lyricsInput.value = "";
  renderLyricsList(lyricsLines);
  showHint("歌词已导入", false);
}

/**
 * 更新锁定按钮状态
 * @returns {void}
 */
function updatePinToggle() {
  if (!dom.pinToggle) {
    return;
  }

  dom.pinToggle.textContent = isPinned ? "🔒" : "🔓";
  dom.pinToggle.classList.toggle("is-active", isPinned);
}

/**
 * 设置窗口置顶
 * @param {boolean} nextPinned
 * @returns {Promise<void>}
 */
async function applyAlwaysOnTop(nextPinned) {
  if (!desktopApi?.setAlwaysOnTop) {
    return;
  }

  try {
    await desktopApi.setAlwaysOnTop(nextPinned);
  } catch (error) {
    console.warn("[Lyrics][Window] 置顶切换失败", error);
    showHint("置顶切换失败", true);
  }
}

/**
 * 切换锁定按钮状态
 * @returns {void}
 */
function togglePinState() {
  isPinned = !isPinned;
  updatePinToggle();
  // 关键逻辑：切换锁定状态后刷新交互样式
  updateWindowInteractionState();
}

/**
 * 打开开发者工具
 * @returns {Promise<void>}
 */
async function openDevtoolsPanel() {
  if (!desktopApi?.openDevtools) {
    showActionHint("当前环境不支持打开控制台");
    return;
  }

  try {
    // 关键逻辑：触发主进程打开开发者工具
    await desktopApi.openDevtools();
  } catch (error) {
    console.warn("[Lyrics][Window] 打开控制台失败", error);
    showActionHint("打开控制台失败");
  }
}

/**
 * 关闭歌词窗口
 * @returns {void}
 */
function closeLyricsWindow() {
  if (desktopApi?.hideWindow) {
    void desktopApi.hideWindow();
    return;
  }

  if (desktopApi?.closeWindow) {
    void desktopApi.closeWindow();
    return;
  }

  window.close();
}

/**
 * 启动刷新定时器
 * @returns {void}
 */
function startTicker() {
  if (tickTimerId) {
    return;
  }

  tickTimerId = window.setInterval(() => {
    updateHeader();
    updateActiveLine();
  }, UPDATE_INTERVAL_MS);
}

/**
 * 绑定交互事件
 * @returns {void}
 */
function bindEvents() {
  // 关键逻辑：确保核心按钮存在，避免事件绑定时抛错导致后续失效
  if (
    !dom.settingsToggle ||
    !dom.openDevtools ||
    !dom.settingsClose ||
    !dom.pinToggle ||
    !dom.closeWindow ||
    !dom.prevTrack ||
    !dom.toggleLyrics ||
    !dom.nextTrack ||
    !dom.refreshLyrics ||
    !dom.importLyrics ||
    !dom.offsetMinus ||
    !dom.offsetPlus
  ) {
    showActionHint("界面初始化失败，请检查 DOM 元素");
    return;
  }

  bindActionHintEvents();

  dom.settingsToggle.addEventListener("click", () => {
    if (isSettingsWindow) {
      setSettingsPanelOpen(true);
      return;
    }

    void openSettingsWindow();
  });

  dom.openDevtools.addEventListener("click", () => {
    // 关键逻辑：手动打开控制台便于排查
    void openDevtoolsPanel();
  });

  dom.settingsClose.addEventListener("click", () => {
    if (isSettingsWindow) {
      closeSettingsWindow();
      return;
    }

    setSettingsPanelOpen(false);
  });

  dom.pinToggle.addEventListener("click", togglePinState);
  dom.closeWindow.addEventListener("click", closeLyricsWindow);
  dom.prevTrack.addEventListener("click", requestPrevTrack);
  dom.toggleLyrics.addEventListener("click", toggleLyricsPause);
  dom.nextTrack.addEventListener("click", requestNextTrack);
  dom.refreshLyrics.addEventListener("click", () => {
    // 关键逻辑：手动刷新在线歌词
    void requestOnlineLyrics();
  });
  dom.importLyrics.addEventListener("click", importLyricsFromInput);

  dom.offsetMinus.addEventListener("click", () => {
    // 关键逻辑：计算偏移后更新界面并提示
    const nextOffset = (lyricsRecord?.offset ?? 0) - OFFSET_STEP_MS;
    updateLyricsSettings({ offset: nextOffset });
    showActionHint(formatOffsetLabel(nextOffset));
  });

  dom.offsetPlus.addEventListener("click", () => {
    // 关键逻辑：计算偏移后更新界面并提示
    const nextOffset = (lyricsRecord?.offset ?? 0) + OFFSET_STEP_MS;
    updateLyricsSettings({ offset: nextOffset });
    showActionHint(formatOffsetLabel(nextOffset));
  });

}

/**
 * 初始化窗口状态
 * @returns {void}
 */
function initWindowState() {
  // 关键逻辑：初始化窗口范围，确保进入/离开判断基于屏幕坐标
  refreshWindowBounds();
  updatePinToggle();
  updateWindowInteractionState();
  if (!isSettingsWindow) {
    // 关键逻辑：窗口始终保持置顶
    void applyAlwaysOnTop(true);
  }
}

/**
 * 初始化歌词窗口
 * @returns {void}
 */
function init() {
  refreshDomRefs();
  initMockState();
  if (!isSettingsWindow) {
    bindHoverEvents();
    bindWindowBoundsEvents();
    bindWindowHoverEvents();
  }
  bindEvents();
  bindPlaybackBridgeUpdates();
  // 关键逻辑：用于确认渲染初始化是否成功
  showActionHint("界面已初始化");
  setSettingsPanelOpen(isSettingsWindow);
  updateHeader();
  updateControlLabels();
  renderLyricsList(lyricsLines);
  if (!isSettingsWindow) {
    bindContentResizeObserver();
    syncWindowHeight();
  }
  startTicker();
  initWindowState();
}

/**
 * 启动初始化入口
 * @returns {void}
 */
function bootstrap() {
  registerGlobalErrorHandlers();
  // 关键逻辑：避免 DOMContentLoaded 已触发导致初始化遗漏
  if (document.readyState === "loading") {
    window.addEventListener("DOMContentLoaded", init);
    return;
  }

  init();
}

bootstrap();
