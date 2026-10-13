#!/usr/bin/env bash
#
# Linux 构建依赖的单一事实源。
#
# CI 检查线（.github/workflows/ci.yml）与发布线（.github/workflows/release.yml）
# 共用本脚本。升级 Tauri 需要增删系统包时，只改这里一处，两条工作流同时生效。
#
# 本地 Linux 开发者也可以直接运行它来搭建构建环境：
#   bash scripts/install-linux-deps.sh
#
# 依据：Tauri 2 的 Linux 前置依赖
# https://v2.tauri.app/start/prerequisites/

set -euo pipefail

if ! command -v apt-get >/dev/null 2>&1; then
  echo "错误：本脚本依赖 apt-get，需要 Debian / Ubuntu 系发行版。" >&2
  exit 1
fi

sudo apt-get update
sudo apt-get install -y \
  build-essential \
  curl \
  wget \
  file \
  pkg-config \
  libwebkit2gtk-4.1-dev \
  libappindicator3-dev \
  librsvg2-dev \
  patchelf \
  libssl-dev

# 前端样式用了 :has() 选择器，WebKitGTK < 2.40 不支持且会静默丢掉相关规则
#（看板卡片焦点态的缩放边/拖拽手柄不再显形）。老发行版装出来的就是旧
# WebKitGTK，这里显式探测并告警，别让降级无感发生。
if command -v pkg-config >/dev/null 2>&1; then
  webkit_ver=$(pkg-config --modversion webkit2gtk-4.1 2>/dev/null || true)
  if [ -n "$webkit_ver" ] \
    && [ "$(printf '%s\n' "2.40" "$webkit_ver" | sort -V | head -n1)" != "2.40" ]; then
    echo "警告：WebKitGTK ${webkit_ver} 低于 2.40，部分样式（:has() 选择器）会静默降级。" >&2
    echo "建议使用 WebKitGTK >= 2.40 的发行版构建，否则界面功能不完整。" >&2
  fi
fi
