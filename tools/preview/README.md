# 视觉预览沙盒

`tools/preview/` 用一个静态页面渲染原版播放器的真实 DOM 与真实 `styles.css`，让改动不依赖人工截图就能自查。

## 为什么需要

真实 Obsidian 里的截图只能靠人给，环形依赖会拖慢视觉迭代；而只看 CSS 源码无法判断对齐、密度、留白和截断。这个沙盒把"能不能看"变成可重复的一步。

沙盒会复制 Obsidian 客户端的 `app.css`（提供 `--background-primary`、`--text-muted` 等宿主变量），因此不是在猜宿主样式。它只用于观察，不参与发布产物：`app.css` 与 `styles.css` 已被 `.gitignore` 忽略，`index.html` 里的 station 数据是固定样例。

## 用法

```bash
# 1. 复制当前样式与宿主样式到沙盒
cp styles.css tools/preview/styles.css
cp "/Applications/Obsidian.app/Contents/Resources/obsidian.asar" /tmp/ 2>/dev/null # 仅首次需要
node -e "require('child_process').execSync('npx --yes asar extract /Applications/Obsidian.app/Contents/Resources/obsidian.asar /tmp/obsidian-main')" # 仅首次需要
cp /tmp/obsidian-main/app.css tools/preview/app.css

# 2. 起静态服务并截图
cd tools/preview && node -e "require('http').createServer((q,s)=>{const fs=require('fs');const p=q.url==='/'?'index.html':q.url.slice(1);fs.readFile(p,(e,d)=>{if(e){s.writeHead(404);s.end();return}s.writeHead(200,{'content-type':p.endsWith('.css')?'text/css':'text/html'});s.end(d)})}).listen(4175)"
# 然后用浏览器打开 http://127.0.0.1:4175/ 截图
```

## 已用它确认的事实

- 列表行**没有**隔行底色：逐像素采样在 `y=150..420` 区间始终是 `255,255,255`；行元素计算样式为 `rgba(0,0,0,0)`，匹配规则里没有任何 `nth-child` 背景。此前从缩放截图上"看到"的灰条是预览渲染错觉，不是缺陷。
- 原版播放器没有外框/圆角/投影，`view-header` 被隐藏，内容区 padding 为 0。
- 播放区与列表的文字左边缘分别对齐各自面板内边距；列表首行紧接频道栏，无表头。
- 版面分配：`clamp(280px, 26vw, 380px) minmax(0, 1fr)`，1280px 宽下播放区 333px、列表 947px。

## 局限

沙盒只能证明布局、密度、对比度和截断，不能替代真实宿主里的 hover、滚动、焦点、窗口缩放与 macOS 字体渲染。发布前仍需在真实 Vault 里复核一次。
