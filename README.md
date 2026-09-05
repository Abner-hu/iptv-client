# IPTV 终端

仓库：[github.com/Abner-hu/iptv-client](https://github.com/Abner-hu/iptv-client)

机顶盒风格的 IPTV 播放器：导入公开 M3U 列表、按分组浏览频道，并用 HLS 播放直播。

内置 [iptv-org](https://github.com/iptv-org/iptv) 公开源（中国内地、香港、台湾、加拿大、澳大利亚、新西兰、爱尔兰、英语、新闻、体育等）。这些是版权方公开的直播地址，部分频道会因地区、线路或时效无法播放。

## 运行

需要 Node.js 20+。

```bash
git clone https://github.com/Abner-hu/iptv-client.git
cd iptv-client
npm install
npm run dev
```

浏览器打开 [http://127.0.0.1:43217](http://127.0.0.1:43217)。

点 **导入已知源（中国 + 香港）**，或 **导入 M3U** 勾选更多公开列表、粘贴自定义地址、打开本地 `.m3u` 文件。

## 安装到中国电视（APK）

国内主流电视（小米、海信、TCL、创维、华为智慧屏等）基本是 **安卓系统**，安装 `.apk` 即可，不需要谷歌应用商店。

打包：

```bash
npm run apk
```

生成：

- `release/iptv-client.v<版本号>.apk`（当前为 `iptv-client.v1.1.0.apk`）
- 开发服务器也可下载： [http://127.0.0.1:43217/iptv-client.v1.1.0.apk](http://127.0.0.1:43217/iptv-client.v1.1.0.apk)

### 装到电视上

1. 把 APK 拷到 U 盘，插电视。
2. 打开电视自带的「文件管理 / USB」，安装 **IPTV Client**。
3. 若提示未知来源，到设置里允许安装未知应用。
4. 也可用 **当贝市场、酷市场、应用安装器、小米电视助手** 侧载。

打开后：电视用遥控器上下选台、确认播放；**同一 APK 也可装到安卓手机**，出现在桌面应用列表里，点按选台即可。

### 装到安卓手机

1. 把 `iptv-client.v1.1.0.apk` 发到手机（微信/网盘/数据线）。
2. 打开文件，允许「安装未知应用」。
3. 安装完成后在桌面打开 **IPTV Client**。
4. 竖屏为播放器在上、频道列表在下；横屏与电视相同，左侧列表、右侧画面。

Android 5.0 及以上即可，覆盖目前几乎所有手机。

需要本机已安装 JDK 17+ 与 Android SDK（脚本默认 `$HOME/android-sdk`）。

## Windows 绿色版 exe

双击即可用，播放服务打进安装包，不再需要本机先跑 `npm run start`。

在已 `npm install` 的仓库里打包：

```bash
npm run dist:win
```

生成（约 150MB，请从 **Release** 下载，不要把 GitHub 网页另存为 exe）：

- [IPTV-Client-1.1.0-portable.exe](https://github.com/Abner-hu/iptv-client/releases/latest/download/IPTV-Client-1.1.0-portable.exe)（Windows 10+ x64 / ARM64，双击即可）
- [IPTV-Client-1.1.0-win-x64.zip](https://github.com/Abner-hu/iptv-client/releases/latest/download/IPTV-Client-1.1.0-win-x64.zip)（解压后运行 `IPTV Client.exe`）

完整 exe 大约 **150MB**。如果只有一两百 KB，那是浏览器把网页存成了 exe，请用上面的 Release 直链重新下。

在 Windows 上双击 exe。第一次会解压到 `%LOCALAPPDATA%\IPTV Client\1.1.0\`，之后直接启动。

开发时仍可分开跑网页和窗口：

```bash
npm run dev
npm run desktop
```

也可以双击 `scripts/start-iptv.bat`（需已 `npm install`，且本机已 `npm run start` 或 `npm run dev`）。

交叉打包需要 `x86_64-w64-mingw32-gcc`（打 64 位外壳）和 `7z`。

## 说明

- 播放走 `/api/proxy`，避免浏览器跨域拦住直播流。
- 列表与收藏存在本机 `localStorage`。
- 公开源经常变动，打不开就换频道，或导入你自己的 M3U。
- 电视/手机安装包关闭系统备份，只播放 http(s)/RTSP/RTMP，不接收其它应用传来的播放链接。
