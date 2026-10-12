/**
 * 前端侧常量，与 Rust 侧 `toktool_core::paths` 一一镜像；跨语言同步由
 * scripts/verify-constants-parity.mjs 强制（两侧各自的单测发现不了漂移）。
 * 刻意不写"常量等于字面量"的单测——那是把同一句话写两遍的虚假安全感。
 */

export const PRODUCT_NAME = "Toktool";

export const APP_IDENTIFIER = "app.toktool.desktop";

export const DATA_DIR_NAME = ".toktool";

export const GATEWAY_TOKEN_PREFIX = "sk-toktool-";

export const LS_KEY_LOCALE = "toktool-locale";

export const LS_KEY_THEME = "toktool-theme";

export const LS_KEY_ACCENT = "toktool-accent";

export const LS_KEY_TOOLS_DISABLED = "toktool-tools-disabled";

export const LS_KEY_INPUT_SCOPE = "toktool-input-scope";

export const LS_KEY_NUMBER_UNIT = "toktool-number-unit";

export const LS_KEY_CHART_ANIMATION = "toktool-chart-animation";

export const LS_KEY_LAST_PAGE = "toktool-last-page";

