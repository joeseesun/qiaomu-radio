# 乔木电台 1.1.0 发布账本

记录每个阶段的真实证据。GitHub 发布成功、预扫描通过、正式审核通过、客户端可安装是四件不同的事，不合并陈述。

## 候选

| 项 | 值 |
| --- | --- |
| 版本 | 1.1.0（tag 精确等于 manifest.version，无 `v` 前缀） |
| 已合并到 main | `ebb2c0b`（PR #24 合并：CSS lint 修复） |
| 待合并 | PR #25 `design/player-refresh` = `7da2308`（播放区与列表视觉重做） |
| 合并 PR | #22 沉浸式/无 tips/列表 → #23 manifest 描述合规 → #24 CSS lint → #25 视觉重做 |

## 本地产物（可复现：`npm run build:plugin` 后工作区无差异）

| 资产 | 字节 | sha256 |
| --- | --- | --- |
| main.js | 617243 | `ffa18719f39e83de5d848c702f184fc533ada0b33b692c82b51c0a6d7ec80a59` |
| manifest.json | 373 | `d7815d6cc7900db5cd8a5ee87d29992caf874f01286bbba828116d39705b14f9` |
| styles.css | 21061 | `82e86e142650d324b2c2301b9155f66d914875de358e5d752c35bc0039ac2f4c` |

本地审计：`python3 scripts/audit_release.py . --tag 1.1.0 --max-asset-bytes 5000000 --scan-tips` → ok，tips 命中 0。

## 官方预扫描（community.obsidian.md → Qiaomu Radio → Review branch）

| Ref | 结果 | 说明 |
| --- | --- | --- |
| `e4e71dd` | Failed | 修 manifest 描述前的候选；MANIFEST Error「description must not include the word Obsidian」 |
| `ebb2c0b` | Completed，**0 Error** | manifest/release/依赖均通过；CSS lint 的 7 条 `!important` 与 `extended-system-fonts` 警告已在 PR #24 修掉；剩余 warning 全部来自 `src/` Web 播放器，非阻塞 |
| `7da2308`（PR #25 合并后的候选） | 待跑 | 合并后以最终 SHA 重扫，不允许用旧 SHA 结果放行 |

## GitHub Release

- 1.1.0 草稿存在，但当前 target 仍是 `ebb2c0b`，资产为旧 styles.css；**PR #25 合并后必须删除重建到最终 SHA**。
- 1.0.0 为线上版本，目录里仍是旧界面。

## 未完成的验收

- 真实宿主肉眼复核：设计 PR #25 的构建已装进 `.test-vault/Qiaomu Radio QA`，等待 Obsidian 重载后确认。
- 隔离库全新安装/升级：`/tmp/qiaomu-radio-1.1.0-fresh` 已就绪（资产 sha256 与候选一致），等待宿主重载后核对。
- iOS/Android 真机：未覆盖，不得声称已验证。

## 公开前必须满足

1. PR #25 合并，CI 绿。
2. 以最终 SHA 重跑官方预扫描，0 Error。
3. 草稿 Release 重建到最终 SHA，三个资产摘要与本地构建一致。
4. 隔离库安装/升级读回通过。
5. 才可公开并触发官方审核；公开后核对目录版本与客户端可安装状态。
