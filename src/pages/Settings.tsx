/**
 * 设置页：左侧分区导航 + 右侧内容面板。
 * 外观区两行：明暗（亮色 / 暗色 / 跟随系统，与顶栏循环按钮同一份状态）+
 * 强调色（一组预设色板，落在 <html data-accent> 上）。
 * 工具启用区：按工具开关；禁用的工具不扫描、各页不显示，数据保留在库里。
 * "显示"区：Tokens 列的输入口径。"后台与托盘"：系统托盘与开机自启动。
 * "关于"区：版本展示与手动检查更新（更新源/公钥在 tauri.conf.json）。
 */

import { useRef, useState } from "react";

import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { PageShell } from "../components/PageShell";
import { SideNav } from "../components/ui/SideNav";
import { Switch } from "../components/ui/Switch";
import { Segmented, type SegmentedOption } from "../components/ui/Segmented";
import type { MessageKey, Strings } from "../i18n/strings";
import {
  appRelaunch,
  updaterCheck,
  updaterDownloadAndInstall,
  type UpdaterUpdate,
} from "../lib/api";
import {
  INPUT_SCOPES,
  type InputScope,
} from "../lib/inputScope";
import { LOCALES, type Locale } from "../lib/locale";
import {
  NUMBER_UNITS,
  type NumberUnit,
} from "../lib/numberUnit";
import {
  CHART_ANIMATIONS,
  type ChartAnimation,
} from "../lib/chartAnimation";
import {
  ACCENT_IDS,
  ACCENT_SWATCH_VARS,
  THEME_MODES,
  type AccentId,
  type ThemeMode,
} from "../lib/theme";
import { TOOL_ITEMS } from "../lib/tools";
import { version as APP_VERSION } from "../../package.json";

/** 更新流程的阶段：检查 → 有新版 → 下载安装 → 待重启；任一步失败落 error。 */
type UpdatePhase =
  | "idle"
  | "checking"
  | "uptodate"
  | "available"
  | "downloading"
  | "installing"
  | "ready"
  | "error";

interface SettingsPageProps {
  readonly strings: Strings;
  readonly locale: Locale;
  readonly onLocaleChange: (locale: Locale) => void;
  readonly mode: ThemeMode;
  readonly onModeChange: (mode: ThemeMode) => void;
  readonly accent: AccentId;
  readonly onAccentChange: (accent: AccentId) => void;
  readonly disabledTools: string[];
  readonly onDisabledToolsChange: (next: string[]) => void;
  readonly inputScope: InputScope;
  readonly onInputScopeChange: (scope: InputScope) => void;
  readonly numberUnit: NumberUnit;
  readonly onNumberUnitChange: (unit: NumberUnit) => void;
  /** 图表生长动画偏好（总览各卡片的进场动画），事实源在前端 localStorage。 */
  readonly chartAnimation: ChartAnimation;
  readonly onChartAnimationChange: (animation: ChartAnimation) => void;
  /** 托盘常驻与开机自启动（"后台与托盘"区），事实源在壳与系统。 */
  readonly trayEnabled: boolean;
  readonly onTrayEnabledChange: (enabled: boolean) => void;
  readonly autostart: boolean;
  readonly onAutostartChange: (enabled: boolean) => void;
}

/** 设置分区。label 是导航文案，也是内容区标题。 */
const SECTIONS = ["appearance", "display", "background", "tools", "about"] as const;
type SectionId = (typeof SECTIONS)[number];

const SECTION_LABEL_KEYS: Record<SectionId, MessageKey> = {
  appearance: "settingsAppearance",
  display: "settingsDisplay",
  background: "settingsBackground",
  tools: "settingsTools",
  about: "settingsAbout",
};

const MODE_LABEL_KEYS: Record<ThemeMode, MessageKey> = {
  light: "themeLight",
  dark: "themeDark",
  system: "themeSystem",
};

const ACCENT_LABEL_KEYS: Record<AccentId, MessageKey> = {
  indigo: "accentIndigo",
  blue: "accentBlue",
  cyan: "accentCyan",
  slate: "accentSlate",
  purple: "accentPurple",
  fuchsia: "accentFuchsia",
  pink: "accentPink",
  amber: "accentAmber",
  yellow: "accentYellow",
  green: "accentGreen",
};

const INPUT_SCOPE_LABEL_KEYS: Record<InputScope, MessageKey> = {
  input: "settingsInputScopePlain",
  inputWithCacheRead: "settingsInputScopeWithCache",
};

const NUMBER_UNIT_LABEL_KEYS: Record<NumberUnit, MessageKey> = {
  chinese: "settingsNumberUnitChinese",
  english: "settingsNumberUnitEnglish",
  plain: "settingsNumberUnitPlain",
};

const CHART_ANIMATION_LABEL_KEYS: Record<ChartAnimation, MessageKey> = {
  on: "settingsAnimationOn",
  off: "settingsAnimationOff",
};

// 语言名用各自的"自称"（中文/English），不随界面语言翻译——这是语言切换器的通行做法。
const LOCALE_ENDONYMS: Record<Locale, string> = {
  // 语言自称（语言切换器里各语言用自己的名字），不随界面语言翻译——通行做法。
  "zh-CN": "中文", // i18n-exempt: 语言自称
  en: "English",
};

export function SettingsPage({
  strings,
  locale,
  onLocaleChange,
  mode,
  onModeChange,
  accent,
  onAccentChange,
  disabledTools,
  onDisabledToolsChange,
  inputScope,
  onInputScopeChange,
  numberUnit,
  onNumberUnitChange,
  chartAnimation,
  onChartAnimationChange,
  trayEnabled,
  onTrayEnabledChange,
  autostart,
  onAutostartChange,
}: SettingsPageProps) {
  const [section, setSection] = useState<SectionId>("appearance");

  const [updatePhase, setUpdatePhase] = useState<UpdatePhase>("idle");
  const [availableVersion, setAvailableVersion] = useState<string | null>(null);
  const [updateFailure, setUpdateFailure] = useState<string | null>(null);
  // Update 对象带方法、不可结构化克隆进 state，跨渲染用 ref 持有。
  const pendingUpdate = useRef<UpdaterUpdate>(null);

  const updateBusy =
    updatePhase === "checking" ||
    updatePhase === "downloading" ||
    updatePhase === "installing";

  async function runUpdateCheck(): Promise<void> {
    setUpdatePhase("checking");
    setUpdateFailure(null);
    try {
      const update = await updaterCheck();
      if (update === null) {
        setUpdatePhase("uptodate");
        return;
      }
      pendingUpdate.current = update;
      setAvailableVersion(update.version);
      setUpdatePhase("available");
    } catch (err) {
      setUpdateFailure(String(err));
      setUpdatePhase("error");
    }
  }

  async function runUpdateInstall(): Promise<void> {
    const update = pendingUpdate.current;
    if (update === null) return;
    setUpdatePhase("downloading");
    setUpdateFailure(null);
    try {
      // Started/Finished 事件把"下载中"与"安装中"分开（Windows 上 Finished
      // 后安装器会直接退出应用）。
      await updaterDownloadAndInstall(update, (event) => {
        if (event.event === "Started") setUpdatePhase("downloading");
        else if (event.event === "Finished") setUpdatePhase("installing");
      });
      setUpdatePhase("ready");
    } catch (err) {
      setUpdateFailure(String(err));
      setUpdatePhase("error");
    }
  }

  const modeOptions: SegmentedOption<ThemeMode>[] = THEME_MODES.map(
    (value) => ({
      value,
      label: strings[MODE_LABEL_KEYS[value]],
    }),
  );

  const inputScopeOptions: SegmentedOption<InputScope>[] = INPUT_SCOPES.map(
    (value) => ({
      value,
      label: strings[INPUT_SCOPE_LABEL_KEYS[value]],
    }),
  );

  const numberUnitOptions: SegmentedOption<NumberUnit>[] = NUMBER_UNITS.map(
    (value) => ({
      value,
      label: strings[NUMBER_UNIT_LABEL_KEYS[value]],
    }),
  );

  const chartAnimationOptions: SegmentedOption<ChartAnimation>[] =
    CHART_ANIMATIONS.map((value) => ({
      value,
      label: strings[CHART_ANIMATION_LABEL_KEYS[value]],
    }));

  const localeOptions: SegmentedOption<Locale>[] = LOCALES.map((value) => ({
    value,
    label: LOCALE_ENDONYMS[value],
  }));

  function toggleTool(toolId: string, enabled: boolean): void {
    onDisabledToolsChange(
      enabled
        ? disabledTools.filter((id) => id !== toolId)
        : [...disabledTools, toolId],
    );
  }

  return (
    /* fill：两栏卡片顶满页面高度（同网关页）；设置页以分区导航为骨架，页面标题是多余的。 */
    <PageShell fill>
      <div className="grid min-h-0 flex-1 grid-cols-[230px_minmax(0,1fr)] gap-4">
        <SideNav
          label={strings.navSettings}
          items={SECTIONS.map((id) => ({ id, label: strings[SECTION_LABEL_KEYS[id]] }))}
          active={section}
          onChange={setSection}
        />

        <Card className="min-h-0 overflow-y-auto">
          {SECTIONS.map((id) => (
            <Card
              as="section"
              key={id}
              /* 全部分区常驻、非激活的用 hidden：切换零重挂，静态测试也能看到全部内容。 */
              hidden={section !== id}
            >
              <h2 className="text-sm font-semibold">
                {strings[SECTION_LABEL_KEYS[id]]}
              </h2>

              {id === "appearance" && (
                <>
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-3 py-2">
                    <div className="min-w-0">
                      <p className="text-sm">{strings.settingsTheme}</p>
                      <p className="mt-0.5 text-xs text-ink-muted">
                        {strings.settingsThemeHint}
                      </p>
                    </div>
                    <Segmented
                      label={strings.settingsTheme}
                      options={modeOptions}
                      value={mode}
                      onChange={onModeChange}
                    />
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-3 py-2">
                    <div className="min-w-0">
                      <p className="text-sm">{strings.settingsAccent}</p>
                      <p className="mt-0.5 text-xs text-ink-muted">
                        {strings.settingsAccentHint}
                      </p>
                    </div>
                    <div
                      role="group"
                      aria-label={strings.settingsAccent}
                      className="flex flex-wrap items-center gap-2"
                    >
                      {ACCENT_IDS.map((id) => (
                        <button
                          key={id}
                          type="button"
                          aria-pressed={accent === id}
                          aria-label={strings[ACCENT_LABEL_KEYS[id]]}
                          title={strings[ACCENT_LABEL_KEYS[id]]}
                          onClick={() => onAccentChange(id)}
                          style={{
                            backgroundColor: `var(${ACCENT_SWATCH_VARS[id]})`,
                          }}
                          className={`size-7 rounded-full ring-offset-2 ring-offset-surface transition-shadow ${
                            accent === id
                              ? "ring-2 ring-ring"
                              : "hover:ring-2 hover:ring-border"
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                </>
              )}

              {id === "display" && (
                <>
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-3 py-2">
                    <div className="min-w-0">
                      <p className="text-sm">{strings.settingsLanguage}</p>
                      <p className="mt-0.5 text-xs text-ink-muted">
                        {strings.settingsLanguageHint}
                      </p>
                    </div>
                    <Segmented
                      label={strings.settingsLanguage}
                      options={localeOptions}
                      value={locale}
                      onChange={onLocaleChange}
                    />
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-3 py-2">
                    <div className="min-w-0">
                      <p className="text-sm">{strings.settingsInputScope}</p>
                      <p className="mt-0.5 text-xs text-ink-muted">
                        {strings.settingsInputScopeHint}
                      </p>
                    </div>
                    <Segmented
                      label={strings.settingsInputScope}
                      options={inputScopeOptions}
                      value={inputScope}
                      onChange={onInputScopeChange}
                    />
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-3 py-2">
                    <div className="min-w-0">
                      <p className="text-sm">{strings.settingsNumberUnit}</p>
                      <p className="mt-0.5 text-xs text-ink-muted">
                        {strings.settingsNumberUnitHint}
                      </p>
                    </div>
                    <Segmented
                      label={strings.settingsNumberUnit}
                      options={numberUnitOptions}
                      value={numberUnit}
                      onChange={onNumberUnitChange}
                    />
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-3 py-2">
                    <div className="min-w-0">
                      <p className="text-sm">{strings.settingsChartAnimation}</p>
                      <p className="mt-0.5 text-xs text-ink-muted">
                        {strings.settingsChartAnimationHint}
                      </p>
                    </div>
                    <Segmented
                      label={strings.settingsChartAnimation}
                      options={chartAnimationOptions}
                      value={chartAnimation}
                      onChange={onChartAnimationChange}
                    />
                  </div>
                </>
              )}

              {id === "background" && (
                <ul className="mt-2">
                  <li className="flex items-center justify-between gap-4 border-b border-border py-3">
                    <div className="min-w-0">
                      <p className="text-sm">{strings.settingsTray}</p>
                      <p className="mt-0.5 text-xs text-ink-muted">
                        {strings.settingsTrayHint}
                      </p>
                    </div>
                    <Switch
                      label={strings.settingsTray}
                      labelHidden
                      checked={trayEnabled}
                      onChange={onTrayEnabledChange}
                    />
                  </li>
                  <li className="flex items-center justify-between gap-4 py-3">
                    <div className="min-w-0">
                      <p className="text-sm">{strings.settingsAutostart}</p>
                      <p className="mt-0.5 text-xs text-ink-muted">
                        {strings.settingsAutostartHint}
                      </p>
                    </div>
                    <Switch
                      label={strings.settingsAutostart}
                      labelHidden
                      checked={autostart}
                      onChange={onAutostartChange}
                    />
                  </li>
                </ul>
              )}

              {id === "tools" && (
                <>
                  <p className="mt-1 text-xs text-ink-muted">
                    {strings.settingsToolsHint}
                  </p>
                  <ul className="mt-2">
                    {TOOL_ITEMS.map((tool) => (
                      <li
                        key={tool.id}
                        className="flex items-center justify-between gap-4 border-b border-border py-3 last:border-0"
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          {tool.icon ? (
                            /* 内联 SVG：彩色版带品牌色，mono 版 currentColor 随主题变色。 */
                            <span
                              aria-hidden="true"
                              className="inline-flex size-5 shrink-0 items-center justify-center [&_svg]:size-5"
                              dangerouslySetInnerHTML={{ __html: tool.icon }}
                            />
                          ) : (
                            <span
                              aria-hidden="true"
                              style={{ backgroundColor: tool.badge }}
                              className="inline-flex size-5 shrink-0 items-center justify-center rounded-control text-[10px] font-semibold text-white"
                            >
                              {tool.label.charAt(0)}
                            </span>
                          )}
                          <span className="text-sm">{tool.label}</span>
                        </div>
                        <Switch
                          label={
                            strings[enabledKey(disabledTools.includes(tool.id))]
                          }
                          labelHidden
                          checked={!disabledTools.includes(tool.id)}
                          onChange={(checked) => toggleTool(tool.id, checked)}
                        />
                      </li>
                    ))}
                  </ul>
                </>
              )}
              {id === "about" && (
                <ul className="mt-2">
                  <li className="flex items-center justify-between gap-4 py-3">
                    <div className="min-w-0">
                      <p className="text-sm">{strings.settingsVersionLabel}</p>
                      <p className="mt-0.5 font-mono text-xs text-ink-muted">
                        {APP_VERSION}
                      </p>
                      {updatePhase === "uptodate" && (
                        <p className="mt-1 text-xs text-ink-muted">
                          {strings.settingsUpdateUpToDate}
                        </p>
                      )}
                      {updatePhase === "available" && (
                        <p className="mt-1 text-xs text-ink-strong">
                          {strings.settingsUpdateAvailable.replace(
                            "{version}",
                            availableVersion ?? "",
                          )}
                        </p>
                      )}
                      {updatePhase === "ready" && (
                        <p className="mt-1 text-xs text-ink-strong">
                          {strings.settingsUpdateReady}
                        </p>
                      )}
                      {updateFailure === null ? null : (
                        <p className="mt-1 text-xs text-danger">
                          {strings.settingsUpdateFailed}: {updateFailure}
                        </p>
                      )}
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      {updatePhase === "ready" && (
                        <Button
                          variant="primary"
                          onClick={() => {
                            appRelaunch().catch(() => {});
                          }}
                        >
                          {strings.settingsUpdateRestart}
                        </Button>
                      )}
                      <Button
                        variant="secondary"
                        disabled={updateBusy}
                        onClick={() => {
                          if (updatePhase === "available") {
                            void runUpdateInstall();
                          } else {
                            void runUpdateCheck();
                          }
                        }}
                      >
                        {updatePhase === "checking"
                          ? strings.settingsUpdateChecking
                          : updatePhase === "downloading"
                            ? strings.settingsUpdateDownloading
                            : updatePhase === "installing"
                              ? strings.settingsUpdateInstalling
                              : updatePhase === "available"
                                ? strings.settingsUpdateDownload
                                : strings.settingsUpdateCheck}
                      </Button>
                    </div>
                  </li>
                  {updatePhase === "ready" && (
                    <li className="py-1 text-xs text-ink-muted">
                      {strings.settingsUpdateInstallHint}
                    </li>
                  )}
                </ul>
              )}
            </Card>
          ))}
        </Card>
      </div>
    </PageShell>
  );
}

/** 开关的无障碍名随状态变：说清"按下去会变成什么"。 */
function enabledKey(disabled: boolean): MessageKey {
  return disabled ? "settingsToolDisabled" : "settingsToolEnabled";
}
