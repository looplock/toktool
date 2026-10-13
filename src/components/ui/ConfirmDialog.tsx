/**
 * 轻确认弹层：标题 + 一行说明 + 取消/确认两键的居中小对话框。受控组件：
 * open=false 渲染 null，不挂任何节点。遮罩点击与 Esc 都等价于"取消"；
 * 确认键是全应用唯一的危险色实体按钮（破坏性操作的最后道闸），busy 时
 * 禁点防重复提交。焦点自动落在确认键上——回车即确认，Esc 即取消；
 * Tab 被陷阱限制在弹层内，焦点跑不进背景页。
 */

import { useEffect, useRef, type KeyboardEvent as ReactKeyboardEvent } from "react";

interface ConfirmDialogProps {
  readonly open: boolean;
  readonly title: string;
  readonly body: string;
  readonly confirmLabel: string;
  readonly cancelLabel: string;
  /** 确认在途：禁点两个键，确认键文案由调用方换成进行时。 */
  readonly busy?: boolean;
  readonly onConfirm: () => void;
  readonly onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel,
  cancelLabel,
  busy = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);

  // Esc 取消：与页面级 Esc 语义一致（详情视图的 Esc 返回监听在弹层
  // 打开时同样触发，但弹层自身先关掉，返回列表要再按一次——直觉顺序）。
  // 尊重 defaultPrevented：内层节点已消费的 Esc 不重复处置；自己处置了
  // 也标记已消费，让同层后续监听有机会让位。
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || event.defaultPrevented) return;
      event.preventDefault();
      onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onCancel]);

  // 焦点陷阱：Tab / Shift+Tab 在弹层的可聚焦元素间循环，不落到背景页。
  // 弹层只有两个键，但选择器按通用可聚焦元素写，将来加内容不用改这里。
  const trapTab = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    const dialog = dialogRef.current;
    if (event.key !== "Tab" || dialog === null) return;
    const focusables = dialog.querySelectorAll<HTMLElement>(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    );
    if (focusables.length === 0) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (first === undefined || last === undefined) return;
    const active = document.activeElement;
    const inside = active instanceof Node && dialog.contains(active);
    if (event.shiftKey) {
      if (!inside || active === first) {
        event.preventDefault();
        last.focus();
      }
    } else if (!inside || active === last) {
      event.preventDefault();
      first.focus();
    }
  };

  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-6"
      onClick={onCancel}
    >
      <div
        ref={dialogRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-body"
        onClick={(event) => event.stopPropagation()}
        onKeyDown={trapTab}
        className="w-full max-w-sm rounded-card border border-border bg-surface p-5 shadow-xl"
      >
        <h3 id="confirm-dialog-title" className="text-sm font-semibold text-ink-strong">
          {title}
        </h3>
        <p id="confirm-dialog-body" className="mt-1.5 text-xs leading-relaxed text-ink-muted">
          {body}
        </p>
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="rounded-control border border-border bg-surface-subtle px-3 py-1.5 text-sm text-ink transition-colors hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            autoFocus
            className="rounded-control border border-danger bg-danger px-3 py-1.5 text-sm text-white transition-colors hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
