# CLAUDE.md

## Project Overview
- 这是一个 Obsidian 番茄钟插件仓库（社区 Fork），核心能力包括计时、任务跟踪、日志写入、通知与状态栏展示。
- 技术栈：TypeScript + Svelte 4 + esbuild（`esbuild-svelte`）+ Obsidian Plugin API。
- 顶层重要文件/目录：
  - `src/`：插件源码。
  - `esbuild.config.mjs`：打包入口与别名配置。
  - `manifest.json` / `versions.json`：插件发布元信息。
  - `.github/workflows/release.yml`：基于 tag 的发布流程。
- 依赖关系：插件运行在 Obsidian 内；日志能力可选依赖 Daily/Weekly Notes 与 Templater 插件。

## Setup and Run
- 前置环境：
  - Node.js 18.x（CI 使用 `18.x`）。
  - npm（仓库包含 `package-lock.json`）。
- 安装依赖：`npm i`
- 开发模式（watch）：`npm run dev`
- 生产构建：`npm run build`
  - 实际执行：`tsc -noEmit -skipLibCheck && node esbuild.config.mjs production`
  - 构建产物：`main.js`
- 版本文件同步脚本：`npm run version`
  - 会执行 `version-bump.mjs`，把 `package.json` 版本写入 `manifest.json`，并更新 `versions.json`。
- 环境变量：仓库内没有声明必填 `.env`；主要配置入口在 Obsidian 插件设置面板（`src/components/Settings.ts`）。

## Install in Obsidian (Community Fork)
- 背景：该仓库是社区修改版，未上架 Obsidian 插件商店；需走手动安装。
- 插件目录名：必须使用 `manifest.json` 里的 `id`，当前是 `pomodoro-timer-ex`。

### 1) 构建插件
- 在仓库根目录执行：
  - `npm i`
  - `npm run build`
- 产物要求：仓库根目录存在 `main.js`、`manifest.json`、`styles.css`。

### 2) 安装到 Vault（推荐软链）
- 设你的 vault 路径为 `<VAULT_PATH>`。
- 推荐方式（开发模式，后续无需重复拷贝）：
  - `mkdir -p "<VAULT_PATH>/.obsidian/plugins"`
  - `ln -s "/absolute/path/to/obsidian-pomodoro-timer" "<VAULT_PATH>/.obsidian/plugins/pomodoro-timer-ex"`
- 备用方式（静态拷贝）：
  - 创建目录：`<VAULT_PATH>/.obsidian/plugins/pomodoro-timer-ex`
  - 拷贝 `main.js`、`manifest.json`、`styles.css` 到该目录。

### 3) 在 Obsidian 启用
- 打开对应 vault。
- 进入 `Settings -> Community plugins`。
- 关闭 `Restricted mode`。
- 启用 `Pomodoro Timer (Forked)`（id: `pomodoro-timer-ex`）。

### 4) 最小验证
- 命令面板可搜索到 Pomodoro Timer 相关命令。
- 启动计时后状态栏出现倒计时。
- `Work/Break` 切换、暂停、重置可正常工作。

### 5) 更新流程（软链模式）
- 修改源码后仅需：`npm run build`。
- 回到 Obsidian 执行重载插件（或重启 Obsidian）即可生效。

## Validation
- `test`：仓库内未提供测试脚本，也没有 `*.test.*` / `*.spec.*` 测试文件。
- `lint`：有 `.eslintrc`，但 `package.json` 未提供统一 `lint` 脚本。
- `typecheck + build`：`npm run build`（当前最可靠的统一验证入口）。
- 常见改动后的最小验证集：
  - 改 `src/components/Timer.ts`、`src/svelte/*`（计时/UI）：跑 `npm run build`，并在 Obsidian 中手动验证开始/暂停/重置、Work/Break 切换。
  - 改 `src/serializers/*`、`src/components/Tasks.ts`（任务解析）：跑 `npm run build`，手动验证 TASKS 与 DATAVIEW 两种格式解析、任务定位与同步更新。
  - 改 `src/components/Logger.ts`、`src/utils/files.ts`（日志写入）：跑 `npm run build`，手动验证 `NONE/DAILY/WEEKLY/FILE` 四种日志落盘路径。
  - 改 `manifest.json` / `versions.json` / `version-bump.mjs`（版本发布）：先跑 `npm run version`，再检查两个元文件变更是否符合预期。

## Working Agreements
- 包管理器使用 `npm`，避免混用 `pnpm`/`yarn`。
- 不要提交 `.gitignore` 已排除的构建与环境产物（如 `main.js`、`*.map`、`node_modules`、`data.json`）。
- 非必要不要跨 `components + svelte + serializers` 做大重构；这三块耦合度高。
- 任务文本相关改动必须保持对两种任务格式的兼容：`TASKS` 与 `DATAVIEW`（见 `Settings.ts` 与 `serializers/`）。
- 发布链路依赖 `.github/workflows/release.yml`：tag push 后会构建并将 `main.js`、`manifest.json`、`styles.css` 打包到 draft release。

## Architecture Notes
- `src/main.ts`：插件装配入口，负责初始化 `Settings`、`Timer`、`Tasks`、`TaskTracker`，注册命令、状态栏和侧边视图。
- `src/components/Timer.ts`：计时状态机核心；通过 `clock.worker.ts` 接收 tick；到时后触发日志写入与任务番茄数更新。
- `src/components/TaskTracker.ts`：当前文件/任务上下文管理；会在必要时给任务行追加 block id，并回写 Markdown 文件。
- `src/components/Tasks.ts`：订阅 tracker 与 metadata 事件，解析当前文件任务列表，并与激活任务做同步。
- `src/components/Logger.ts`：根据设置解析日志目标文件，输出内置格式或 Templater 渲染结果。
- `src/serializers/`：任务字段序列化/反序列化边界，承载 TASKS/DATAVIEW 的格式兼容。
- `src/utils/`：Daily/Weekly note 文件工具、Templater 调用和任务文本抽取工具。
- 高耦合链路：`Timer -> TaskTracker -> Tasks -> Logger`。修改其中任一模块时，优先检查整条链路是否受影响。

## Directory-Specific Guidance
### `src/components/`
- 作用：核心业务逻辑（计时、设置、任务追踪、日志、通知、视图桥接）。
- 修改时注意：这里很多逻辑会直接触发文件写入和 Obsidian 事件订阅，需关注生命周期释放（`destroy/destory`）和副作用。
- 需要同步：改任务模型或日志字段时，同步 `src/serializers/` 与对应 Svelte 组件显示。

### `src/svelte/`
- 作用：UI 层（计时面板、任务展示、状态栏）。
- 修改时注意：组件通过 store 订阅 `Timer/Tasks/TaskTracker`；避免在组件层引入业务分叉，优先把逻辑放回 `components/`。
- 需要同步：新增/修改 props 时，同步 `TimerView.ts` 和相关调用方。

### `src/serializers/`
- 作用：任务行文本与结构化字段之间的双向转换。
- 修改时注意：正则和字段提取顺序会直接影响任务展示、番茄数更新和日志内容。
- 需要同步：字段变更时同步 `TaskModels.ts`、`Tasks.ts`、`TaskTracker.updateActual()`。

### `src/utils/`
- 作用：文件存在性保证、Daily/Weekly Note 获取、Templater 渲染、任务组件抽取。
- 修改时注意：`files.ts` 会创建目录/文件；路径处理必须兼容 vault 内相对路径。
- 需要同步：改日志文件定位逻辑时同步 `Logger.resolveLogFile()` 与设置项说明。

### `.github/workflows/`
- 作用：发布自动化。
- 修改时注意：当前流程只在 tag push 触发，并创建 draft release。
- 需要同步：若改构建产物名或入口文件，必须同步 release 附件列表。

## Common Pitfalls
- 仓库没有自动化测试，`npm run build` 通过不等于运行时行为完全正确，UI 与文件写入必须做手动回归。
- `TaskTracker` 会改写 Markdown 任务行（补 block id、更新番茄数），容易引入“误改用户文档”风险。
- `reset()` 里会尝试记录未完成会话；改计时状态机时要关注日志是否重复/遗漏。
- `TaskTracker.destory()` 拼写是现状（调用方也使用该拼写），不要只改一处导致清理逻辑失效。
- 构建时当前存在 Svelte 警告：`TaskComponent` 的 `tasks` 导出未使用；处理前先确认是否为预留 API。

## Change Checklist
- [ ] 已确认改动在 `components/svelte/serializers/utils` 中的影响范围
- [ ] 至少执行过 `npm run build`
- [ ] 涉及任务文本或日志格式时，已在 Obsidian 内做手动回归
- [ ] 涉及版本发布时，已检查 `manifest.json` 与 `versions.json` 的联动更新
- [ ] 未误改无关模块或提交忽略产物
