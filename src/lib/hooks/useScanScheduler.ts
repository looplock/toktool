/**
 * 扫描状态的前端投影。自动循环常驻 Rust 壳（`toktool-core::scan::scheduler`，
 * 与窗口生死无关），前端只做四件事：手动触发（通知壳）、监听 started/finished
 * 维护"扫描中/气泡/最近错误"、started 时拉一次首扫量级（多 GB 大文件首次
 * 解析的剩余量，气泡用它解释"这轮为什么久"）、数据有变化时递增 dataVersion
 * 供数据页刷新。退避规则也在壳里（同口径纯函数），前端没有间隔逻辑。
 *
 * 事件回调依赖 effect 执行，node + SSR 测试环境不可达——状态迁移抽成纯函数
 * [`applyScanFinished`]（同 scanToast 的分层理由），单测覆盖。
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import {
  fetchScanBacklog,
  isTauriRuntime,
  scanTrigger,
  type ScanBacklog,
  type ScanFinishedPayload,
  type ScanReport,
} from "../api";
import type { ScanOutcome } from "../scanToast";

const SCAN_STARTED_EVENT = "scan://started";
const SCAN_FINISHED_EVENT = "scan://finished";

/** 扫描是否带来了新数据（新记录或新会话）。 */
export function scanFoundData(report: ScanReport): boolean {
  return report.recordsInserted > 0 || report.sessionsCreated > 0;
}

/** started/finished 事件驱动的那部分状态：整体 setState，迁移走纯函数。 */
export interface ScanRunState {
  /** 有扫描在飞（自动或手动）。 */
  readonly scanning: boolean;
  /** 在飞的这轮是不是用户点的：气泡据此决定要不要报"正在进行"。 */
  readonly manualRun: boolean;
  /** 最近一轮结束的结果（含失败）；初始为 null = 还没扫过。 */
  readonly outcome: ScanOutcome | null;
  /** 最近一次扫描的错误；成功后清空。 */
  readonly lastError: string | null;
  /** 数据有变化的扫描完成次数（新增记录或新增会话），数据页的刷新信号。 */
  readonly dataVersion: number;
}

export const INITIAL_RUN_STATE: ScanRunState = {
  scanning: false,
  manualRun: false,
  outcome: null,
  lastError: null,
  dataVersion: 0,
};

/**
 * finished 事件的一次状态迁移（纯函数，hook 回调与单测共用）。手动旗标在
 * 完成时一并复位——manualRun 只描述"在飞的这轮是不是用户点的"，不复位它，
 * 点过一次手动后每轮自动扫描开始都会误报"扫描中"气泡。
 */
export function applyScanFinished(
  state: ScanRunState,
  payload: ScanFinishedPayload,
  info: { readonly manual: boolean; readonly seq: number },
): ScanRunState {
  const { ok, report, error } = payload;
  const base: ScanRunState = { ...state, scanning: false, manualRun: false };
  if (ok && report) {
    return {
      ...base,
      outcome: { seq: info.seq, manual: info.manual, report },
      lastError: null,
      dataVersion: scanFoundData(report)
        ? state.dataVersion + 1
        : state.dataVersion,
    };
  }

  return {
    ...base,
    outcome: { seq: info.seq, manual: info.manual, report: null },
    lastError: error ?? "unknown",
  };
}

export interface ScanScheduler {
  /** 有扫描在飞（自动或手动）。 */
  readonly scanning: boolean;
  /** 在飞的这轮是不是用户点的：气泡据此决定要不要报"正在进行"。 */
  readonly manualRun: boolean;
  /** 最近一轮结束的结果（含失败）；初始为 null = 还没扫过。 */
  readonly outcome: ScanOutcome | null;
  /** 最近一次扫描的错误；成功后清空。 */
  readonly lastError: string | null;
  /** 数据有变化的扫描完成次数（新增记录或新增会话），数据页的刷新信号。 */
  readonly dataVersion: number;
  /**
   * 本轮开始时的首扫量级（多 GB 大文件首次解析的剩余量）；非扫描中为 null，
   * 查询失败也为 null。气泡据此解释"这轮为什么久"。
   */
  readonly backlog: ScanBacklog | null;
  /** 手动触发一次扫描。 */
  triggerManual: () => void;
}

export function useScanScheduler(): ScanScheduler {
  const [run, setRun] = useState<ScanRunState>(INITIAL_RUN_STATE);
  const [backlog, setBacklog] = useState<ScanBacklog | null>(null);
  // 触发标记：manualRun 是状态（气泡要读），ref 是事件回调查的"这轮是否手动"。
  const manualRef = useRef(false);
  // 完成序号：连着两轮一模一样的报告也要能被认成两次，"新一轮"不能靠报告内容判断。
  const seqRef = useRef(0);
  // 轮次序号：started 时拉积压量是异步的，finished 先到时慢返回的旧结果
  // 不能再把 backlog 写回去——每次 started 自增，写回前对号。
  const roundRef = useRef(0);

  useEffect(() => {
    if (!isTauriRuntime()) return undefined;
    let alive = true;
    const unlistens: Promise<() => void>[] = [
      listen(SCAN_STARTED_EVENT, () => {
        const round = ++roundRef.current;
        setRun((current) => ({ ...current, scanning: true }));
        fetchScanBacklog()
          .then((info) => {
            if (alive && round === roundRef.current) setBacklog(info);
          })
          .catch(() => {
            if (alive && round === roundRef.current) setBacklog(null);
          });
      }),
      listen<ScanFinishedPayload>(SCAN_FINISHED_EVENT, (event) => {
        roundRef.current += 1; // 作废在途的积压查询
        setBacklog(null);
        if (!alive) return;
        const manual = manualRef.current;
        manualRef.current = false;
        const seq = seqRef.current++;
        setRun((current) =>
          applyScanFinished(current, event.payload, { manual, seq }),
        );
      }),
    ];
    return () => {
      alive = false;
      unlistens.forEach((p) => void p.then((fn) => fn()));
    };
  }, []);

  const triggerManual = useCallback(() => {
    if (!isTauriRuntime()) return;
    // 乐观进"扫描中"：壳的 Started 事件随后会确认；手动触发的旗标由
    // finished 事件消费（这轮的气泡按手动口径展示）。
    manualRef.current = true;
    setRun((current) => ({
      ...current,
      scanning: true,
      manualRun: true,
    }));
    scanTrigger().catch(() => {
      manualRef.current = false;
      setRun((current) => ({
        ...current,
        scanning: false,
        manualRun: false,
        lastError: "trigger failed",
      }));
    });
  }, []);

  return { ...run, backlog, triggerManual };
}
