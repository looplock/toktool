<div align="center">

# Toktool

<strong>A local-first usage &amp; cost dashboard for AI coding tools.</strong>

<p>
  <a href="README.zh-CN.md">简体中文</a>
</p>

<p>
  <a href="https://github.com/looplock/toktool/actions/workflows/ci.yml"><img alt="CI" src="https://github.com/looplock/toktool/actions/workflows/ci.yml/badge.svg"></a>
  <a href="https://github.com/looplock/toktool/releases/latest"><img alt="Latest release" src="https://img.shields.io/github/v/release/looplock/toktool"></a>
  <img alt="Platform" src="https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-blue">
  <a href="LICENSE"><img alt="License: MIT" src="https://img.shields.io/badge/license-MIT-blue.svg"></a>
  <a href="https://tauri.app/"><img alt="Tauri 2" src="https://img.shields.io/badge/Tauri-2-24C8DB?logo=tauri&logoColor=white"></a>
  <a href="https://react.dev/"><img alt="React 19" src="https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white"></a>
  <a href="https://www.rust-lang.org/"><img alt="Rust backend" src="https://img.shields.io/badge/Rust-backend-000000?logo=rust&logoColor=white"></a>
  <a href="https://www.typescriptlang.org/"><img alt="TypeScript frontend" src="https://img.shields.io/badge/TypeScript-frontend-3178C6?logo=typescript&logoColor=white"></a>
</p>

</div>

<p align="center">
  <a href="docs/images/cover-light.svg">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="docs/images/cover.svg">
      <img src="docs/images/cover-light.svg" alt="Toktool data flow — 9 tools and gateway traffic streaming into a local SQLite database" width="100%">
    </picture>
  </a>
</p>

## Screenshots

<table>
  <tr>
    <td align="center" width="50%"><strong>Overview</strong></td>
    <td align="center" width="50%"><strong>Details</strong></td>
  </tr>
  <tr>
    <td align="center" width="50%">
      <a href="docs/images/overview-light.png">
        <picture>
          <source media="(prefers-color-scheme: dark)" srcset="docs/images/overview-dark.png">
          <img src="docs/images/overview-light.png" alt="Overview dashboard" width="100%">
        </picture>
      </a>
    </td>
    <td align="center" width="50%">
      <a href="docs/images/details-light.png">
        <picture>
          <source media="(prefers-color-scheme: dark)" srcset="docs/images/details-dark.png">
          <img src="docs/images/details-light.png" alt="Per-request detail table" width="100%">
        </picture>
      </a>
    </td>
  </tr>
  <tr>
    <td align="center" width="50%"><strong>Dashboard cards</strong></td>
    <td align="center" width="50%"><strong>Gateway</strong></td>
  </tr>
  <tr>
    <td align="center" width="50%">
      <a href="docs/images/overview-cards-light.png">
        <picture>
          <source media="(prefers-color-scheme: dark)" srcset="docs/images/overview-cards-dark.png">
          <img src="docs/images/overview-cards-light.png" alt="Dashboard cards — usage flows, heatmap and cost breakdown" width="100%">
        </picture>
      </a>
    </td>
    <td align="center" width="50%">
      <a href="docs/images/gateway-light.png">
        <picture>
          <source media="(prefers-color-scheme: dark)" srcset="docs/images/gateway-dark.png">
          <img src="docs/images/gateway-light.png" alt="Local gateway — endpoint, protocols and metering" width="100%">
        </picture>
      </a>
    </td>
  </tr>
</table>

## Background

Every AI coding tool you use already writes session logs on your machine.

But none of them tell you what a month of coding actually cost.

Toktool fills that gap locally: it scans those logs, aggregates token usage and estimated cost into a local SQLite database, and visualizes it.

A second feature ships alongside: a **local AI API gateway** (reverse proxy + protocol translation + metering), so traffic through the gateway is counted too.

Supported tools: Claude Code, Codex, OpenCode, ZCode, CodeBuddy, WorkBuddy, Grok, Pi, DSH.

```mermaid
flowchart LR
    logs["Session logs<br/>of 9 AI tools"] -->|scan| adapters["9 adapters<br/>parse · dedupe"]
    gw["Local gateway<br/>proxy + protocol translation"] -->|"meter every request"| db
    adapters -->|facts| db[("SQLite (WAL)<br/>~/.toktool/")]
    db --> dashboard["Usage & cost dashboard"]
    db --> transcripts["Session transcripts"]
```

## Privacy guarantees

Toktool reads tool logs read-only and never modifies them; deleting a session goes to the OS trash, never a hard delete.

It never reads API keys, tokens, or environment variables.

> [!IMPORTANT]
> All data stays in `~/.toktool/` — no account, no telemetry, no cloud sync.

Unpriced models show "unknown".

## Install

Grab an installer for your platform from the [Releases](../../releases) page.

> [!WARNING]
> The bundles are **not code-signed yet** — Windows SmartScreen and macOS Gatekeeper show a one-time security prompt on first launch. Expected, not tampering.

Verify the SHA-256 digest shown on each release asset, or build from source.

Walkthrough: [docs/install.md](docs/install.md) (Chinese).

## Usage

- **Overview dashboard** — token usage and estimated cost at a glance, with time / tool / project / model filters and an adjustable card layout.
- **Sessions** — every session with its full transcript: searchable, paged, multi-GB logs included.
- **Gateway** — point local tools at the local endpoint, manage upstreams and mappings, and meter every request that passes through.
- **Always on duty** — background scan loop with a system tray, low-power mode, and autostart.

## Supported tools

| Tool | Usage & cost | Transcript | Thinking | Images | Request duration | Trash delete | Source |
|---|---|---|---|---|---|---|---|
| <img src="docs/images/tool-icons/claude-code.svg" height="16"> **Claude Code** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | Local logs (JSONL) |
| <img src="docs/images/tool-icons/codex.svg" height="16"> **Codex** | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ | Local logs (JSONL) |
| <img src="docs/images/tool-icons/codebuddy.svg" height="16"> **CodeBuddy** | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ | App database (SQLite) |
| <picture><source media="(prefers-color-scheme: dark)" srcset="docs/images/tool-icons/pi-dark.svg"><img src="docs/images/tool-icons/pi.svg" height="16"></picture> **Pi** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | Local logs (JSONL) |
| <picture><source media="(prefers-color-scheme: dark)" srcset="docs/images/tool-icons/opencode-dark.svg"><img src="docs/images/tool-icons/opencode.svg" height="16"></picture> **OpenCode** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | App database (SQLite) |
| <picture><source media="(prefers-color-scheme: dark)" srcset="docs/images/tool-icons/zcode-dark.svg"><img src="docs/images/tool-icons/zcode.svg" height="16"></picture> **ZCode** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | App database + log files |
| <img src="docs/images/tool-icons/dsh.svg" height="16"> **DSH** | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ | Local logs (zstd-compressed) |
| <img src="docs/images/tool-icons/workbuddy.svg" height="16"> **WorkBuddy** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | Local logs (JSONL) |
| <picture><source media="(prefers-color-scheme: dark)" srcset="docs/images/tool-icons/grok-dark.svg"><img src="docs/images/tool-icons/grok.svg" height="16"></picture> **Grok** | ✅ | ✅ | ❌ | ✅ | ✅ | ✅ | Local logs (JSONL) |

Session deletion always goes to the OS trash — never a hard delete — including DB-backed tools (rows are exported to a JSON bundle and trashed first).

*All product names, logos, and brands are the property of their respective owners. Toktool is an independent tool and is not affiliated with any of them.*

## FAQ

<details>
<summary>Does Toktool upload my data anywhere?</summary>

No. It works fully offline — you can keep it air-gapped and nothing breaks.

</details>

<details>
<summary>How is cost estimated?</summary>

Prices come from the models.dev catalog (synced on the Pricing page) combined with your own overrides in `~/.toktool/pricing-overrides.json`. Missing cache-read / cache-write prices fall back to the input price.

</details>

<details>
<summary>Why does a model show "unknown" cost?</summary>

Because its price is not known — Toktool never invents a number.

</details>

<details>
<summary>How large can a session be?</summary>

Multi-GB session logs open instantly: transcripts are read through paged byte-range reads instead of loading whole files.

</details>

<details>
<summary>Where is my data stored?</summary>

Everything lives in a single `~/.toktool/` directory. Delete it and Toktool is gone — no scattered state, no cloud copies.

</details>

## Development

Requirements: Node.js 22+, pnpm 12 (pinned via `packageManager`), Rust stable (MSRV declared as `rust-version` in the root `Cargo.toml`), and the [Tauri 2 platform prerequisites](https://tauri.app/start/prerequisites/).

```bash
pnpm install          # JS dependencies
pnpm tauri dev        # build the Rust shell and open the app window
```

The dev server occupies port 21720 and fails loudly when it is taken — the Tauri config points at it explicitly.

## Tech stack

| Layer | Choice |
|---|---|
| Desktop shell | Tauri 2 (`single-instance`, `autostart`, `opener` plugins) |
| Systems language | Rust (stable, edition 2024) — `toktool-core` (domain) + `toktool-gateway` (axum + tokio) |
| Frontend | React 19 + TypeScript (strict) + Vite 7, pnpm |
| Styling | Tailwind CSS 4 |
| Charts | ECharts 6, driven by a hand-written React hook |
| Storage | SQLite (WAL mode) under `~/.toktool/` |

`toktool-core` must never depend on the gateway or the shell. Business logic in the shell crate is rejected in review.

## Contributing

Architecture rules, quality gates, versioning, and the release process live in [CONTRIBUTING.md](CONTRIBUTING.md). Security topics follow [SECURITY.md](SECURITY.md).

## Project documents

- [Installing releases](docs/install.md) — unsigned-installer walkthrough, SHA256 verification, and building from source (Chinese)
- [Changelog](CHANGELOG.md) — what changed in each release
- [Security](SECURITY.md) — how to report vulnerabilities and privacy-red-line violations

## License

MIT — see [LICENSE](LICENSE).
