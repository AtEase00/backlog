<div align="center">
  <img src="resources/icon.png" width="92" alt="Backlog 图标" />
  <h1>Backlog</h1>
  <p><strong>一款随时可以通过快捷键呼出的本地待办侧边栏。</strong></p>
  <p>小巧、置顶、无需账号，不把你的任务交给云端。</p>

  <p>
    <a href="https://github.com/AtEase00/backlog/releases/latest"><img src="https://img.shields.io/github/v/release/AtEase00/backlog?style=flat-square" alt="最新版本" /></a>
    <a href="https://github.com/AtEase00/backlog/releases"><img src="https://img.shields.io/github/downloads/AtEase00/backlog/total?style=flat-square" alt="下载量" /></a>
    <img src="https://img.shields.io/badge/Windows-可用-3278c6?style=flat-square" alt="Windows 可用" />
    <img src="https://img.shields.io/badge/macOS-开发中-999999?style=flat-square" alt="macOS 开发中" />
  </p>

  <p><a href="README.md">English</a></p>
</div>

![Backlog 毛玻璃界面](docs/images/backlog-preview.png)

## 为什么选择 Backlog？

很多待办工具需要打开一个完整应用、注册账号，或者把数据交给云服务。Backlog 选择了更轻的方式：它停靠在桌面边缘，通过全局快捷键随时呼出，并将任务保存在你的设备上。

- **本地优先**：无需账号，任务数据保存在本机。
- **随时可用**：在任意应用中通过全局快捷键显示或隐藏。
- **专注任务**：未完成与已完成任务分别展示。
- **桌面原生体验**：系统托盘、左右停靠、窗口置顶和紧凑毛玻璃界面。
- **默认保护隐私**：不要求云同步，不包含统计和遥测。

## 功能

- 创建、编辑、完成、恢复和删除待办
- 未完成与已完成双选项卡
- 按本地创建日期分组
- 停靠到当前显示器左侧或右侧
- 高度匹配显示器工作区，宽度可调整
- 默认置顶且不占用任务栏
- 通过系统托盘显示或隐藏窗口
- 自定义全局快捷键，默认为 `Ctrl/Cmd + Shift + /`
- 跟随系统语言，或手动选择简体中文 / English
- 一键清除全部已完成任务
- 使用 SQLite 在本地保存任务
- Windows 使用 Acrylic，macOS 使用 Vibrancy，并提供高可读性半透明降级效果

## 下载

### Windows

从 [GitHub Releases](https://github.com/AtEase00/backlog/releases/latest) 下载最新安装包。

安装程序允许选择安装目录。当前安装包尚未进行代码签名，Windows SmartScreen 可能显示安全提示。

### macOS

macOS 版本正在开发中，目前还没有经过签名和公证的安装包。

## 快速使用

1. 安装并启动 Backlog。
2. 从侧边栏顶部输入框添加任务。
3. 使用 `Ctrl/Cmd + Shift + /` 隐藏或恢复窗口。
4. 单击托盘图标切换窗口；右键托盘图标可以切换停靠侧、打开设置或退出。

主窗口有意不提供退出按钮。选择托盘菜单中的 **退出 Backlog** 后，应用才会完全退出。

## 隐私

Backlog 按纯本地应用设计：

- 不需要账号
- 不上传任务内容
- 不依赖云服务保存任务
- 不包含遥测或使用统计

任务数据库和应用偏好存储在当前设备的 Electron 应用数据目录中。

## 平台状态

| 平台 | 状态 | 安装包 |
| --- | --- | --- |
| Windows 10/11 | 可用 | NSIS 安装程序 |
| macOS | 开发中 | 计划提供 DMG |

## 本地开发

### 环境要求

- Node.js 22.18 或更高版本
- pnpm 10 或更高版本

### 启动项目

```bash
git clone https://github.com/AtEase00/backlog.git
cd backlog
pnpm install
pnpm dev
```

### 检查与打包

```bash
pnpm typecheck
pnpm test
pnpm build
pnpm dist
```

Windows 安装包应在 Windows 上构建。macOS 签名和公证需要 macOS 构建环境及 Apple Developer ID。

## 技术栈

- Electron
- Vue 3 + TypeScript
- electron-vite
- SQLite（`node:sqlite`）
- Lucide 图标
- electron-builder
- Vitest

## 路线图

- [ ] Markdown 与富文本笔记
- [ ] 附件
- [ ] 基于 SQLite FTS5 的本地搜索
- [ ] 数据导入与导出
- [ ] 自动更新
- [ ] 经过签名和公证的 macOS 版本

路线图代表开发方向，不表示确定的发布时间。

## 参与贡献

欢迎提交问题、设计建议和范围明确的 Pull Request。开始大型改动前，请先创建 [Issue](https://github.com/AtEase00/backlog/issues) 沟通范围。

如果 Backlog 让你的桌面更清爽，欢迎点一个 Star，让更多人发现它。
