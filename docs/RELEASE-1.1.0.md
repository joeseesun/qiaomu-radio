# 乔木电台 1.1.0 发布账本

记录每个阶段的真实证据。GitHub 发布成功、预扫描通过、正式审核通过、客户端可安装是四件不同的事，不合并陈述。

## 候选

| 项 | 值 |
| --- | --- |
| 版本 | 1.1.0（tag 精确等于 manifest.version，无 `v` 前缀） |
| 最终候选 | `969ec37`（PR #25 合并后的 main HEAD） |
| 合并链路 | #22 沉浸式/无 tips/列表 → #23 manifest 描述合规 → #24 CSS lint → #25 视觉重做+版式+站名清洗 → main `969ec37` |
| CI | 每个 PR 与 main push 均 `test-and-build` success（最后一次 main run 26s） |

## 本地产物（可复现：`npm run build:plugin` 后工作区无差异）

| 资产 | 字节 | sha256（前 16） |
| --- | --- | --- |
| main.js | 617993 | `fd85cf3df098d6a2` |
| manifest.json | 373 | `d7815d6cc7900db5` |
| styles.css | 20907 | `ad564eb2f97bf2a4` |

本地审计：`python3 scripts/audit_release.py . --tag 1.1.0 --max-asset-bytes 5000000 --scan-tips` → ok，tips 命中 0。

## 官方预扫描（community.obsidian.md → Qiaomu Radio → Review branch）

| Ref | 结果 | 说明 |
| --- | --- | --- |
| `e4e71dd` | Failed | 修 manifest 描述前的候选；MANIFEST Error「description must not include the word Obsidian」 |
| `ebb2c0b` | Completed，**0 Error** | manifest/release/依赖通过；CSS lint 的 7 条 `!important` 与 `extended-system-fonts` 警告已由 PR #24 修掉；剩余 warning 全部来自 `src/` Web 播放器 |
| `7da2308` | Completed，**0 Error** | 视觉重做轮次，同样只剩 Web 播放器 warning |
| `969ec37` | 已提交，等待完成 | 最终候选；未完成前不得公开 |

## GitHub Release

- 1.1.0 草稿已重建到最终候选 `969ec37`，三个资产摘要与本地构建逐字节一致（GitHub 报告的 digest 与本地 sha256 相同）。
- 1.0.0 是当前线上版本；目录读取 manifest 版本对应的 Release，因此公开 1.1.0 后客户端才会拿到新界面。
- 1.0.0 的正式审查记录里有一条 RELEASES Recommendation：缺少 artifact attestations；本轮未加入，留作后续版本。

## 视觉验收（本轮新增能力）

- 新增 `tools/preview`：用真实 `styles.css` 叠宿主 `app.css` 静态渲染，可自查对齐、密度、对比度、截断。
- 用它推翻了两个错误判断：列表"隔行灰底"是缩放截图的渲染错觉（逐像素采样恒为 `255,255,255`，行计算样式 `rgba(0,0,0,0)`，无 `nth-child` 背景规则）；播放区按 `0.78fr/1.22fr` 会在宽屏无限变宽（1280px 下 499px），已改为 `clamp(280px, 26vw, 380px)`，1280px 下 333px。
- 沙盒不能替代真实宿主的 hover、滚动、焦点与字体渲染。

## 未完成的验收

- 真实宿主复核：最终构建已装进 `.test-vault/Qiaomu Radio QA`（styles.css `ad564eb2f97b`、main.js `fd85cf3df098`），等待 Obsidian 重载后确认。
- 隔离库全新安装：`/tmp/qiaomu-radio-1.1.0-fresh` 资产摘要与候选一致，等待宿主重载后读回。
- iOS/Android 真机：未覆盖，不得声称已验证。

## 公开前必须满足

1. `969ec37` 预扫描 Completed 且 0 Error（Pending/超时不算通过）。
2. 草稿 Release 资产摘要与本地构建一致（已满足）。
3. 隔离库安装读回通过。
4. 才可公开并触发官方审核；公开后核对目录版本与客户端可安装状态。
