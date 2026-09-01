# IPTV 终端

机顶盒风格的 IPTV 播放器：导入公开 M3U 列表、按分组浏览频道，并用 HLS 播放直播。

内置 [iptv-org](https://github.com/iptv-org/iptv) 公开源（中国内地、香港、台湾、中文、新闻、体育等）。这些是版权方公开的直播地址，部分频道会因地区、线路或时效无法播放。

## 运行

需要 Node.js 20+。

```bash
npm install
npm run dev
```

浏览器打开 [http://127.0.0.1:43217](http://127.0.0.1:43217)。

点 **导入已知源（中国 + 香港）**，或 **导入 M3U** 勾选更多公开列表、粘贴自定义地址、打开本地 `.m3u` 文件。

## 桌面窗口 / Windows exe

先启动播放服务，再打开 Electron 窗口：

```bash
npm run dev
npm run desktop
```

Windows 上可打包便携版 exe（只是外壳窗口，仍需本机 `npm run start` 提供播放服务）：

```bash
npm run dist:win
```

生成文件在 `release/IPTV终端*.exe`。也可以双击 `scripts/start-iptv.bat`（需已 `npm install`）。

## 说明

- 播放走 `/api/proxy`，避免浏览器跨域拦住直播流。
- 列表与收藏存在本机 `localStorage`。
- 公开源经常变动，打不开就换频道，或导入你自己的 M3U。
