/**
 * 布局文档：卡片位置 + 卡片自身配置（看哪个指标、怎么画）存成一份。
 * 合成一份是为了"重置布局"能同时把两者恢复干净，不会留下位置复位、图表还停在饼图的半吊子状态。
 *
 * 持久化键暂不进 `src/constants.ts`：目前只有前端读它，还没成为跨语言契约。
 * 等后端或网关也要读时再上升——那时由 `verify:constants` 盯着两侧。
 */

import type { BreakdownDimension, ChartKind, Metric } from "./types";

const LS_KEY_LAYOUT = "toktool-overview-layout";

const LAYOUT_VERSION = 2;

/** 网格列数：决定横向吸附粒度（容器宽/列数），DashboardGrid 用同一份值初始化。 */
export const LAYOUT_COLUMNS = 48;

// v1 是 12 列坐标系；横向粒度改为 48 列后同一 x/w 表示的宽度变成 1/4，读入时等比放大。
const V1_COLUMNS = 12;

export interface CardConfig {
  readonly metric: Metric;
  readonly chart: ChartKind;
  /** 仅构成卡使用：拆分维度。旧存档没有这个键，读入时按缺省（模型）兜底。 */
  readonly dimension?: BreakdownDimension;
  /** 仅用量卡使用：模型用量 / 缓存用量 / 整体趋势。旧存档按缺省（模型用量）兜底。 */
  readonly view?: UsageView;
  /** 仅日历卡使用：时间窗口（天）。undefined = 365。 */
  readonly calendarWindow?: number;
  /** 仅日历卡使用：颜色分档。undefined = 5 档（GitHub 默认），0 = 连续渐变。 */
  readonly calendarSteps?: number;
  /** 仅组合卡使用：调用次数柱 + 累计费用线，或费用柱 + 调用次数线。undefined = calls。 */
  readonly comboView?: ComboView;
  /** 仅效率卡使用：模型效率 / 会话消耗。旧存档按缺省（模型效率）兜底。 */
  readonly efficiencyView?: EfficiencyView;
  /** 外观设置（抽屉"外观"组）：全部可选，缺省即默认外观，旧存档天然兼容。 */
  readonly palette?: CardPaletteScheme;
  readonly showLegend?: boolean;
  readonly showGridLines?: boolean;
  readonly yAxisFromZero?: boolean;
}

export const CARD_PALETTES = ["default", "indigo", "warm", "gray"] as const;

export type CardPaletteScheme = (typeof CARD_PALETTES)[number];

/** 合并后用量卡的视图：按模型拆分 / 缓存读取 vs 新生成 / 不分段的总柱。 */
export const USAGE_VIEWS = ["model", "cache", "total"] as const;

export type UsageView = (typeof USAGE_VIEWS)[number];

/** 日历卡的时间窗口（天）与颜色分档：分档 0 表示连续渐变，其余为离散档数。 */
export const CALENDAR_WINDOWS = [30, 90, 183, 365] as const;
export const CALENDAR_STEPS = [3, 4, 5, 6] as const;
export const CALENDAR_WINDOW_DEFAULT = 365;
export const CALENDAR_STEPS_DEFAULT = 5;
/** 分档 0 = 连续渐变，其余为离散档数。 */
export const CALENDAR_STEPS_CONTINUOUS = 0;

/** 组合卡的视图：calls = 调用次数柱 + 累计费用线；cost = 费用柱 + 调用次数线。 */
export const COMBO_VIEWS = ["calls", "cost"] as const;

export type ComboView = (typeof COMBO_VIEWS)[number];

/** 效率卡的视图：model = 模型效率气泡；session = 会话消耗气泡（一会话 × 模型一点）。 */
export const EFFICIENCY_VIEWS = ["model", "session"] as const;

export type EfficiencyView = (typeof EFFICIENCY_VIEWS)[number];

export interface LayoutWidget {
  readonly id: string;
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
}

export interface LayoutDoc {
  readonly version: number;
  readonly widgets: readonly LayoutWidget[];
  readonly cards: Readonly<Record<string, CardConfig>>;
}

export const DEFAULT_WIDGETS: readonly LayoutWidget[] = [
  // 默认双列：每行两张半宽卡（24/24），行高统一 10（flow 11 让桑基多呼吸一档）。
  // 左列统计总览打头，右列模型用量紧随——首屏一行即见数字与图。
  { id: "totals", x: 0, y: 0, w: 24, h: 10 },
  { id: "usage", x: 24, y: 0, w: 24, h: 10 },
  { id: "composition", x: 0, y: 10, w: 24, h: 10 },
  { id: "calendar", x: 24, y: 10, w: 24, h: 10 },
  { id: "flow", x: 0, y: 20, w: 24, h: 11 },
  { id: "spread", x: 24, y: 20, w: 24, h: 11 },
  { id: "combo", x: 0, y: 31, w: 24, h: 10 },
  { id: "costWaterfall", x: 24, y: 31, w: 24, h: 10 },
  { id: "modelEfficiency", x: 0, y: 41, w: 24, h: 10 },
];

type Storage = Pick<globalThis.Storage, "getItem" | "setItem">;

export const DEFAULT_CARD_CONFIG: CardConfig = { metric: "tokens", chart: "bar" };
/** 按卡片 id 取默认布局。id 必须来自 DEFAULT_WIDGETS（卡片 id 全集）；未知 id
 *  说明调用方与默认表脱节，直接抛错暴露 bug——不再用 as 把 undefined 掩盖成
 *  运行时崩溃。生产路径（withDefaults）保证 doc.widgets 含全部默认卡片，
 *  这里只接住语义上不可能的兜底分支。 */
export function defaultWidgetFor(id: string): LayoutWidget {
  const found = DEFAULT_WIDGETS.find((widget) => widget.id === id);
  if (found === undefined) throw new Error(`unknown widget id: ${id}`);
  return found;
}

function isWidget(value: unknown): value is LayoutWidget {
  if (typeof value !== "object" || value === null) return false;
  const widget = value as Record<string, unknown>;

  return (
    typeof widget["id"] === "string" &&
    [widget["x"], widget["y"]].every((field) => typeof field === "number" && Number.isFinite(field)) &&
    // 尺寸必须为正：gridstack 偶发存出 0 尺寸，读回来会渲染成看不见也拖不到的卡片。
    [widget["w"], widget["h"]].every(
      (field) => typeof field === "number" && Number.isFinite(field) && field > 0,
    )
  );
}

function isCardConfig(value: unknown): value is CardConfig {
  if (typeof value !== "object" || value === null) return false;
  const config = value as Record<string, unknown>;
  const boolOrUndefined = (field: unknown): boolean =>
    field === undefined || typeof field === "boolean";

  return (
    (config["metric"] === "cost" ||
      config["metric"] === "tokens" ||
      config["metric"] === "calls") &&
    (config["chart"] === "bar" ||
      config["chart"] === "line" ||
      config["chart"] === "share" ||
      config["chart"] === "treemap" ||
      config["chart"] === "calendar") &&
    (config["dimension"] === undefined ||
      config["dimension"] === "model" ||
      config["dimension"] === "project" ||
      config["dimension"] === "tool") &&
    (config["view"] === undefined ||
      (USAGE_VIEWS as readonly unknown[]).includes(config["view"])) &&
    (config["calendarWindow"] === undefined ||
      (typeof config["calendarWindow"] === "number" &&
        (CALENDAR_WINDOWS as readonly unknown[]).includes(config["calendarWindow"]))) &&
    (config["calendarSteps"] === undefined ||
      (typeof config["calendarSteps"] === "number" &&
        (config["calendarSteps"] === CALENDAR_STEPS_CONTINUOUS ||
          (CALENDAR_STEPS as readonly unknown[]).includes(config["calendarSteps"])))) &&
    (config["comboView"] === undefined ||
      (COMBO_VIEWS as readonly unknown[]).includes(config["comboView"])) &&
    (config["efficiencyView"] === undefined ||
      (EFFICIENCY_VIEWS as readonly unknown[]).includes(config["efficiencyView"])) &&
    (config["palette"] === undefined ||
      (CARD_PALETTES as readonly unknown[]).includes(config["palette"])) &&
    boolOrUndefined(config["showLegend"]) &&
    boolOrUndefined(config["showGridLines"]) &&
    boolOrUndefined(config["yAxisFromZero"])
  );
}

function readCards(doc: Record<string, unknown>): Record<string, CardConfig> {
  const rawCards =
    typeof doc["cards"] === "object" && doc["cards"] !== null
      ? (doc["cards"] as Record<string, unknown>)
      : {};

  const cards: Record<string, CardConfig> = {};
  for (const [id, value] of Object.entries(rawCards)) {
    // 旧存档的 github 画法已删：校验前归位到 calendar，其余配置（指标/窗口/分档）原样保留。
    const candidate =
      typeof value === "object" &&
      value !== null &&
      (value as Record<string, unknown>)["chart"] === "github"
        ? { ...value, chart: "calendar" }
        : value;
    if (isCardConfig(candidate)) cards[id] = candidate;
  }

  return cards;
}

/** 读本地布局。两条来源：Tauri 下读 `~/.toktool/overview-layout.json`（经 IPC），
 * 纯浏览器（vitest/harness）读 localStorage。校验与版本迁移共用 normalizeDoc。 */
export function readLayout(storage?: Storage): LayoutDoc | null {
  // 同步口保留：纯浏览器路径直读 localStorage；Tauri 路径请用 readLayoutStored，
  // 这里为了兼容旧测试在 Tauri 下也读 localStorage（首帧同步渲染用），异步口会覆盖它。
  const ls = storage ?? (typeof localStorage === "undefined" ? null : localStorage);
  if (ls === null) return null;

  let raw: string | null;
  try {
    raw = ls.getItem(LS_KEY_LAYOUT);
    if (raw === null) return null;
  } catch {
    return null;
  }
  return readLayoutText(raw);
}

/** 字符串 → LayoutDoc：脏数据返回 null（不猜、不静默用半份）；v1 坐标等比迁移到 48 列。 */
function readLayoutText(text: string): LayoutDoc | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return null;
  }
  return normalizeDoc(parsed);
}

function normalizeDoc(parsed: unknown): LayoutDoc | null {
  if (typeof parsed !== "object" || parsed === null) return null;
  const doc = parsed as Record<string, unknown>;
  // v1 只在读入时迁移，不原样回写——下次保存自然就是 v2。
  if (doc["version"] !== LAYOUT_VERSION && doc["version"] !== 1) return null;
  if (!Array.isArray(doc["widgets"])) return null;

  const widgets = doc["widgets"].filter(isWidget);
  if (doc["version"] !== 1) {
    return { version: LAYOUT_VERSION, widgets, cards: readCards(doc) };
  }

  const scale = LAYOUT_COLUMNS / V1_COLUMNS;
  return {
    version: LAYOUT_VERSION,
    widgets: widgets.map((widget) => ({ ...widget, x: widget.x * scale, w: widget.w * scale })),
    cards: readCards(doc),
  };
}

/** 用默认表补齐：新加的卡片要出现（追加到用户布局最底部，不打扰已有排列），
 * 删掉的卡片不能残留。
 *
 * 位置策略：存量卡片沿用用户的位置；只有用户没见过的卡片（新版本新增）
 * 才落到 `max(y+h)` 之下，用的是新默认尺寸——版本升级不再打乱用户摆好的布局。 */
export function withDefaults(defaults: readonly LayoutWidget[], doc: LayoutDoc | null): LayoutDoc {
  if (doc === null) return { version: LAYOUT_VERSION, widgets: [...defaults], cards: {} };

  const cards = doc.cards;
  const knownIds = new Set(doc.widgets.map((widget) => widget.id));
  // 存量卡片按默认表顺序排列（沿用用户位置）；缺的先不放——统一在尾部 append，
  // 避免"默认位置插队"打乱用户已摆好的布局。
  const widgets = defaults.flatMap((fallback) => {
    const found = doc.widgets.find((w) => w.id === fallback.id);
    return found === undefined ? [] : [found];
  });

  // append 起点：用户存档（含已废弃 id 的残影）的最深底边。
  const bottom = doc.widgets.reduce((max, w) => Math.max(max, w.y + w.h), 0);
  let cursor = bottom;
  for (const fallback of defaults) {
    if (knownIds.has(fallback.id)) continue;
    widgets.push({ ...fallback, y: cursor });
    cursor += fallback.h;
  }

  return { version: LAYOUT_VERSION, widgets, cards };
}

export function writeLayout(doc: LayoutDoc, storage: Storage = localStorage): void {
  try {
    storage.setItem(LS_KEY_LAYOUT, JSON.stringify(doc));
  } catch {
    // 写不进去（隐私模式等）就静默跳过，本次会话照样能拖。
  }
}

/** Tauri 运行时判定：布局文件走 IPC，vitest/纯浏览器里没有壳，回落 localStorage。 */
function inTauri(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

/** 从 `~/.toktool/overview-layout.json` 读布局。
 * 迁移：文件不存在时回读 localStorage 旧键——找到就把旧布局返回并顺手写入文件
 * （inTauri 才写），之后 localStorage 键废弃（不再读也不再写）。
 * 纯浏览器（测试/harness）保持 localStorage 直读，行为不变。 */
export async function readLayoutStored(): Promise<LayoutDoc | null> {
  if (!inTauri()) return readLayout();

  try {
    const { invoke } = await import("@tauri-apps/api/core");
    const text = await invoke<string | null>("layout_read");
    if (text !== null && text !== "") {
      const fromFile = readLayoutText(text);
      if (fromFile !== null) return fromFile;
    }
  } catch {
    // 壳读不出（文件损坏等）→ 走 localStorage 迁移兜底。
  }

  const legacy = readLayout();
  if (legacy !== null) {
    // 旧存档迁入文件；失败（磁盘等）也不阻塞本次会话，下次保存还会再试。
    writeLayoutStored(legacy).catch(() => {});
    return legacy;
  }
  return null;
}

/** 写布局到 `~/.toktool/overview-layout.json`。纯浏览器回落 localStorage。 */
export async function writeLayoutStored(doc: LayoutDoc): Promise<void> {
  const text = JSON.stringify(doc);
  if (!inTauri()) {
    writeLayout(doc);
    return;
  }
  try {
    const { invoke } = await import("@tauri-apps/api/core");
    await invoke("layout_write", { text });
  } catch {
    // 写失败静默跳过（与 localStorage 时代同一纪律）：本次会话照常能拖。
  }
}
