# 乔木电台 · Qiaomu Radio

**中文** | [English](#english) · [在线电台](https://radio.qiaomu.ai/) · [GitHub Releases](https://github.com/joeseesun/qiaomu-radio/releases)

[![Version](https://img.shields.io/github/v/release/joeseesun/qiaomu-radio?display_name=tag)](https://github.com/joeseesun/qiaomu-radio/releases)
[![License: GPL v3+](https://img.shields.io/badge/License-GPLv3%2B-blue.svg)](LICENSE)
[![Obsidian](https://img.shields.io/badge/Obsidian-1.8.9%2B-7c3aed)](https://obsidian.md/)

> 在 Obsidian 里发现和收听全球直播电台，让音乐陪你阅读、写作与思考。
>
> Discover and play live radio stations inside Obsidian while you read, write, and think.

**已验证：** Obsidian 1.13.7 桌面端隔离 Vault；全球目录、搜索、MP3 直播、暂停、喜欢及最近收听读回均已真实操作。切台与音量控制已实现并通过代码测试，尚未完成 iOS/Android 真机验收。

## 这是什么

乔木电台是一个原生 Obsidian 社区插件，也是 [radio.qiaomu.ai](https://radio.qiaomu.ai/) 的笔记场景版本。它不在笔记里嵌网页，而是提供独立电台视图：打开就能选台，搜索、频道、播放控制、喜欢和历史都在同一个安静的播放器里。

## 核心能力

| 能力 | 你得到什么 |
| --- | --- |
| 全球电台目录 | 通过 Radio Browser 发现真实直播电台，目录失败时使用乔木审核过的备用台单 |
| 场景频道 | 专注、松弛、爵士、古典、能量与世界音乐快速切换 |
| 本地推荐 | 根据喜欢、跳过和最近收听对“为你推荐”重新排序 |
| 连续收听 | 播放失败时解释原因并自动尝试下一家电台 |
| 搜索与收藏 | 按电台名称搜索，把喜欢的电台留在当前 Vault |
| 原生体验 | Obsidian 命令、功能区入口、设置页、深浅主题与键盘焦点完整适配 |

## 安装

### Obsidian 社区插件

插件正在提交 Obsidian 社区目录。审核通过并公开后，可在 Obsidian 中打开“设置 → 第三方插件 → 浏览”，搜索 `Qiaomu Radio` 安装。

### BRAT

1. 安装并启用 [BRAT](https://github.com/TfTHacker/obsidian42-brat)。
2. 选择 **Add Beta plugin**。
3. 输入 `joeseesun/qiaomu-radio`。

### 手动安装

从 [GitHub Releases](https://github.com/joeseesun/qiaomu-radio/releases) 下载同一版本的 `main.js`、`manifest.json` 和 `styles.css`，放到 `<Vault>/.obsidian/plugins/qiaomu-radio/`，然后在第三方插件设置中启用 **Qiaomu Radio**。

## 使用

1. 点击 Obsidian 左侧功能区的电台图标，或从命令面板运行“Qiaomu Radio: 打开电台”。
2. 从“为你推荐”或场景频道选择一家电台。
3. 用播放器暂停、切换上一家/下一家和调整音量。
4. 点击心形加入喜欢；“喜欢”和“最近”频道只读取当前 Vault 的插件数据。

直播源由各广播机构提供，随时可能下线、限流或限制地区。单个源失败不代表插件或目录失效。

## 隐私与网络

- 不需要账号，不包含客户端遥测，不上传你的笔记内容。
- 喜欢、跳过、音量和收听历史保存在当前 Vault 的 `.obsidian/plugins/qiaomu-radio/data.json`。
- 插件会请求 Radio Browser 的公共目录；目录不可用时请求 `radio.qiaomu.ai` 的备用目录。
- 播放时直接连接所选广播机构的直播地址。电台运营方可能看到普通网络请求信息，例如 IP 地址和 User-Agent。
- 插件不会读取、修改或上传 Vault 中的 Markdown 文件。

## Web 版

同一仓库还包含可独立运行的 [乔木电台 Web 版](https://radio.qiaomu.ai/)：六种完整播放器环境、3D 实体交互、全球电台、中文公开直播源和本地口味推荐。Obsidian 插件采用更轻、更原生的界面，不打包 3D 模型和服务端代码。

![乔木电台 Web 版主视觉](public/og-radio.png)

> 上图是 Web 版主视觉，不是 Obsidian 插件截图；插件功能以当前 Release 与真实宿主验收为准。

## 从源码构建

需要 Node.js 20 或更高版本。

```bash
npm install
npm run build:plugin
npm run test:plugin
```

构建输出位于仓库根目录：`main.js`、`manifest.json`、`styles.css`。

完整仓库同时包含 Web 版：

```bash
npm run check
npm run dev
```

## 项目结构

```text
plugin-src/          Obsidian 插件源码与测试
src/                 Web 播放器源码
server.mjs           Web 版目录与播放服务
manifest.json        Obsidian 插件清单
main.js              Obsidian 发布构建
styles.css           Obsidian 插件样式
versions.json        Obsidian 版本兼容映射
```

## 实测与边界

- `npm run check`：19 个测试文件、53 项测试通过；Web 与插件生产构建通过。
- Obsidian 1.13.7 / macOS：隔离 Vault 全新安装、加载全球目录、搜索 `rock`、播放 SomaFM MP3、暂停、收藏和收藏频道读回通过。
- 插件构建约 600 KiB，低于本项目 5 MiB 发布预算。
- 官方 Obsidian 市场审核、客户端公开搜索和移动真机属于独立验收阶段；GitHub Release 不等于已上架。

## 许可与商业授权

源码按 [GNU GPL v3 或更高版本](LICENSE) 开源。闭源集成、白标或与 GPL 不兼容的分发方式，可参阅 [商业许可说明](COMMERCIAL-LICENSE.md) 联系向阳乔木。

- 主页：[qiaomu.ai](https://qiaomu.ai/)
- 博客：[blog.qiaomu.ai](https://blog.qiaomu.ai/)
- 推荐：[tuijian.qiaomu.ai](https://tuijian.qiaomu.ai/)
- X：[@vista8](https://x.com/vista8)
- GitHub：[@joeseesun](https://github.com/joeseesun)
- 微信公众号：向阳乔木推荐看

欢迎提交 Issue 与 Pull Request。安全问题请按 [SECURITY.md](SECURITY.md) 私下报告。

---

<a name="english"></a>

# English

Qiaomu Radio is a native Obsidian plugin for discovering and playing live radio while you read, write, and think. It provides one focused player view with station search, mood channels, local recommendations, favorites, history, playback controls, and graceful station fallback.

## Install

The plugin is being submitted to the Obsidian Community directory. After approval, search for **Qiaomu Radio** under **Settings → Community plugins → Browse**.

For beta or manual installation, use BRAT with `joeseesun/qiaomu-radio`, or copy `main.js`, `manifest.json`, and `styles.css` from the same [GitHub Release](https://github.com/joeseesun/qiaomu-radio/releases) into `<Vault>/.obsidian/plugins/qiaomu-radio/`.

## Privacy and limits

No account or client telemetry is included. Favorites, skips, volume, and listening history stay in the current Vault's plugin data. The plugin contacts Radio Browser, `radio.qiaomu.ai` as a fallback directory, and the selected broadcaster's stream. It does not read, modify, or upload Markdown notes.

Live streams can disappear, throttle requests, or be region restricted. Desktop behavior was verified in Obsidian 1.13.7 on macOS. The mobile-compatible build and responsive layout are present, but iOS and Android hardware testing is not yet claimed.

## Development

```bash
npm install
npm run build:plugin
npm run test:plugin
```

The repository also contains the [Qiaomu Radio web experience](https://radio.qiaomu.ai/). Run `npm run check` to test and build both surfaces.

Licensed under [GPL-3.0-or-later](LICENSE), with a separate commercial license available for proprietary use.
