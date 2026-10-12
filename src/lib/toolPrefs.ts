/**
 * 工具启用偏好的持久化：localStorage 里存"被禁用"的工具 id 列表（缺省 = 全部
 * 启用，新工具加入后默认可用）。扫描与查询过滤由 App 把这份清单随 IPC 传给
 * `scan_now` / `overview`——Rust 侧不持有状态，数据也不因禁用而删除。
 */

import { LS_KEY_TOOLS_DISABLED } from "../constants";

export function readDisabledTools(): string[] {
  try {
    const raw = localStorage.getItem(LS_KEY_TOOLS_DISABLED);
    const parsed: unknown = raw === null ? [] : JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter((id): id is string => typeof id === "string")
      : [];
  } catch {
    return [];
  }
}

export function writeDisabledTools(disabled: string[]): void {
  // 与 locale/page/theme 等写入者同一约定：localStorage 不可写（隐私模式配
  // 额满）不该让本次会话炸掉——App 在事件处理器里同步调用，抛出即未捕获。
  try {
    localStorage.setItem(LS_KEY_TOOLS_DISABLED, JSON.stringify(disabled));
  } catch {
    // 写不进去就不写：本次会话仍持有内存态，下次会话回到缺省（全部启用）。
  }
}
