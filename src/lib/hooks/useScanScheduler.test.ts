/**
 * 扫描的纯逻辑单测。自动循环与退避规则已下沉 Rust 壳
 * （toktool-core::scan::scheduler，退避口径的测试在 Rust 侧），
 * 前端只剩"扫到新数据"这一个纯判断，供事件回调与气泡共用。
 */

import { expect, it } from "vitest";

import type { ScanReport } from "../api";
import {
  INITIAL_RUN_STATE,
  applyScanFinished,
  scanFoundData,
} from "./useScanScheduler";

function report(partial: Partial<ScanReport>): ScanReport {
  return {
    filesScanned: 0,
    filesMissing: 0,
    filesSkipped: 0,
    sessionsCreated: 0,
    recordsInserted: 0,
    parseErrors: 0,
    ...partial,
  };
}

it("扫到新记录或新会话都算有数据", () => {
  expect(scanFoundData(report({ recordsInserted: 1 }))).toBe(true);
  expect(scanFoundData(report({ sessionsCreated: 1 }))).toBe(true);
  expect(scanFoundData(report({}))).toBe(false);
});

it("finished 复位扫描中与手动旗标：手动→完成→自动开始不再出 running 气泡", () => {
  // 手动触发后进入扫描中（triggerManual 的乐观置位）。
  const running = { ...INITIAL_RUN_STATE, scanning: true, manualRun: true };

  // 手动一轮完成：outcome 记手动口径，但 manualRun 归位——它只描述"在飞的
  // 这轮"，不复位的话后续每轮自动扫描开始都会误报"扫描中"气泡。
  const done = applyScanFinished(
    running,
    { ok: true, report: report({}) },
    { manual: true, seq: 0 },
  );
  expect(done.scanning).toBe(false);
  expect(done.manualRun).toBe(false);
  expect(done.outcome?.manual).toBe(true);

  // 随后的自动扫描开始：scanning 为真但 manual 为假 → scanToastView 不出气泡
  //（该分支由 scanToast 的单测覆盖，这里守住状态侧的前提）。
  const auto = applyScanFinished(
    { ...done, scanning: true, manualRun: false },
    { ok: true, report: report({ recordsInserted: 2 }) },
    { manual: false, seq: 1 },
  );
  expect(auto.scanning).toBe(false);
  expect(auto.manualRun).toBe(false);
  expect(auto.dataVersion).toBe(1);
});

it("finished 失败分支：同样复位旗标，错误落 lastError", () => {
  const failed = applyScanFinished(
    { ...INITIAL_RUN_STATE, scanning: true, manualRun: true },
    { ok: false, error: "disk full" },
    { manual: true, seq: 7 },
  );
  expect(failed.scanning).toBe(false);
  expect(failed.manualRun).toBe(false);
  expect(failed.outcome?.report).toBeNull();
  expect(failed.outcome?.seq).toBe(7);
  expect(failed.lastError).toBe("disk full");
});
