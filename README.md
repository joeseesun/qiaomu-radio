# 乔木电台 · Qiaomu Radio

[中文](#中文) · [English](#english) · [在线体验](https://radio.qiaomu.ai/)

![乔木电台魔兽世界 3D 主题设计概念图](public/og-radio.png)

> 魔兽世界 3D 主题的设计概念图；可操作的 3D 模型与实时屏幕请以[线上页面](https://radio.qiaomu.ai/?theme=fantasy)为准。

## 中文

乔木电台是一台真正能操作的 3D 网络收音机。它把全球直播电台、轻量的本地推荐和七种完整播放器主题装进同一个安静界面：进入页面先听广播，需要搜索、收藏、历史或支持作者时，再从设备菜单进入。

### 特性

- 七种完整播放器：魔兽世界 3D、博朗 3D、极简、iPod、Winamp、foobar2000 和经典收音机。
- 实体交互：播放/暂停、上一家、下一家、收藏与音量都能直接操作；3D 旋钮、按钮和机身旋转有真实反馈。
- 全球发现：基于 Radio Browser 搜索和心情频道，同时提供经过人工核验的中国公开直播源。
- 地区首播：首次访问按 IP 国家选择当地高票音乐电台；定位失败时回退跨地区的全球热门 20 台。
- 连续播放：HLS 使用更深的滚动缓冲、分片重试和受控的同源内存预取，短暂网络波动不立即换台。
- 六种界面语言：简体中文、英语、西班牙语、法语、德语、日语；电台名称保持广播机构原文。
- 诚实元数据：SomaFM 显示官方实时曲目；没有可靠曲目信息时明确显示“电台直播”。
- 本地口味：喜欢、跳过、标签权重和历史只保存在当前浏览器。
- 优雅降级：流媒体连接失败会解释原因并自动尝试下一家。
- 纯净首页：流量统计、打赏和关注入口不占据播放器首页，只在设备菜单的“支持与关注”中出现。

### 本地运行

需要 Node.js 20 或更高版本。

```bash
npm install
npm run dev
```

打开 `http://127.0.0.1:4173`。

完整校验与生产运行：

```bash
npm run check
npm run build
NODE_ENV=production PORT=4173 npm start
```

生产服务同时包含前端静态文件和这些动态接口：`/api/stations`、`/api/play/:stationId`、`/api/now-playing`、`/api/health`。部署时不能只托管 `dist`。

### 架构与设计

- React + TypeScript + Vite
- Three.js 参数化博朗风格机身与 Hyper3D Rodin Gen-2.5 魔兽世界 3D 模型
- Express 服务端代理 Radio Browser 与实时曲目信息
- hls.js 兼容 Chrome/Edge，Safari 优先使用原生 HLS
- Umami 无 Cookie 流量统计，仅在生产域名 `radio.qiaomu.ai` 上记数

交互和模型拆分边界见 [3D 建模功能契约](docs/RADIO-HARDWARE.md)，产品范围见 [PRD](docs/PRD.md)。

### 数据、品牌与隐私

电台目录来自 [Radio Browser](https://www.radio-browser.info/)，音频流由各广播机构提供。中国波段使用项目内审核白名单，不在运行时抓取商业聚合站或第三方播放列表。首次访问时，服务端仅把访问 IP 交给 `country.is` 换取国家代码，不请求精确位置，也不把原始 IP 写入应用数据库；失败时直接使用全球热门 20 台。播放偏好、喜欢与历史仍只保存在浏览器本机。为改善短 HLS 直播窗口，已审核的 HLS 源会经过乔木服务器做最多约 90 秒的临时内存分片缓存，不落盘、不录制节目。

iPod、Winamp、foobar2000、博朗与魔兽世界等名称仅用于描述交互与视觉主题；本项目与相关品牌、暴雪娱乐没有关联，不使用官方标识、角色或故事素材。

### 许可与支持

源码按 [GNU GPL v3 或更高版本](LICENSE) 开源。闭源集成、白标与其他商业用途可联系向阳乔木获取独立商业授权，详情见 [商业许可说明](COMMERCIAL-LICENSE.md)。

- 在线体验：[radio.qiaomu.ai](https://radio.qiaomu.ai/)
- GitHub：[@joeseesun](https://github.com/joeseesun)
- X：[@vista8](https://x.com/vista8)
- 乔木推荐：[tuijian.qiaomu.ai](https://tuijian.qiaomu.ai/)

## English

Qiaomu Radio is an operable 3D internet radio for discovering live stations around the world. Seven self-contained player themes place playback, discovery, favorites, history, and volume controls inside the device itself, keeping the landing experience focused on listening.

### Highlights

- Seven complete player environments, including two interactive 3D radios.
- Live global discovery via Radio Browser plus a reviewed set of public Chinese broadcaster streams.
- Country-aware first-run stations with a global top-20 music fallback when IP country lookup fails.
- Resilient HLS playback with rolling buffers, retry recovery, and short-lived in-memory segment prefetching for reviewed streams.
- Six UI languages: Simplified Chinese, English, Spanish, French, German, and Japanese.
- Local-only taste signals: likes, skips, tag weights, and listening history stay in your browser.
- Honest metadata and graceful stream fallback.
- A clean landing screen; analytics disclosure, donation, and follow links live inside the device menu.

### Development

```bash
npm install
npm run dev
npm run check
```

The production deployment requires the Node server; it is not a static-only Vite site.

### License

Licensed under [GPL-3.0-or-later](LICENSE). A separate commercial license is available for proprietary integration, white-label distribution, or terms incompatible with the GPL; see [COMMERCIAL-LICENSE.md](COMMERCIAL-LICENSE.md).
