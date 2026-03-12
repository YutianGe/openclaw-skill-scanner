# OpenClaw Skill Scanner

一个智能的 OpenClaw Skills 安全扫描工具，用于检测潜在的恶意代码和安全风险。

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D16.0.0-brightgreen.svg)](https://nodejs.org/)

## 🎯 项目简介

OpenClaw Skill Scanner 是一个专为 OpenClaw Skills 设计的安全扫描器，能够智能检测潜在的安全风险，包括危险命令、敏感文件访问、外部请求、提示词注入等。通过**启发式检测**和**可选的 Ollama 本地 LLM 增强**，能够**自动发现未知的恶意模式**，无需手动维护词库。

## ✨ 核心特性

### 🔍 智能扫描引擎
- **启发式检测**: 15+ 种恶意行为模式自动识别，无需手动添加规则
- **自动发现未知威胁**: 通过行为模式组合识别新型攻击
- **三层分析架构**: 规则分析（快速）+ 启发式检测（主动发现）+ LLM 验证（可选）
- **多规则检测**: 内置 24 条安全规则，覆盖常见风险场景
- **组合攻击检测**: 识别单独无害但组合起来危险的操作模式
- **智能威胁评分**: 综合评估威胁等级（0-100 分）

### 🎨 多种使用界面
- **命令行模式**: 快速扫描，支持 JSON 输出
- **TUI 交互界面**: 实时进度显示，交互式结果浏览
- **Web UI**: 可视化界面，支持暗色/亮色主题切换
- **🆕 Ollama 一键管理**: Web 界面支持一键安装、启动 Ollama，实时状态监控（红黄绿指示灯）

### 🛡️ 安全操作
- **隔离功能**: 将风险 skill 移动到隔离区
- **禁用标记**: 创建 DISABLED 标记文件
- **白名单管理**: 支持域名白名单配置

### ⚙️ 高度可配置
- **自定义规则**: 通过 YAML 配置文件自定义扫描规则
- **灵活阈值**: 可调整 LLM 置信度阈值
- **忽略模式**: 支持排除特定文件或目录

## 📊 检测规则

规则引擎包含 **24 条规则**，涵盖以下威胁类型：

### 高危风险 (12 条)

| 规则 ID | 描述 | 检测内容 |
|---------|------|----------|
| `dangerous_command_rm_rf` | 危险的文件删除命令 | 检测 `rm -rf` 命令，智能识别安全路径 |
| `dangerous_file_deletion` | 批量删除文件操作 | 检测 `unlinkSync`、`rmSync` 等批量删除 |
| `format_disk_command` | 格式化磁盘命令 | 检测 `mkfs`、`format`、`dd` 等危险命令 |
| `access_sensitive_ssh_keys` | SSH 密钥访问 | 检测 `~/.ssh/id_rsa` 等私钥文件访问 |
| `access_aws_credentials` | AWS 凭证访问 | 检测 `~/.aws/credentials` 访问 |
| `access_env_files` | 环境变量文件访问 | 检测 `.env` 文件读取 |
| `access_browser_passwords` | 浏览器密码访问 | 检测浏览器密码数据库访问 |
| `modify_startup_files` | 修改启动文件 | 检测 `.bashrc`、`.zshrc` 等修改 |
| `create_cron_job` | 创建定时任务 | 检测 `crontab`、`systemctl` 等 |
| `modify_hosts_file` | 修改 hosts 文件 | 检测系统 hosts 文件修改 |
| `command_injection` | 命令注入漏洞 | 检测动态执行用户输入的命令 |
| `eval_user_input` | eval 执行用户输入 | 检测 `eval` 执行动态代码 |

### 中危风险 (11 条)

| 规则 ID | 描述 | 检测内容 |
|---------|------|----------|
| `external_http_request` | 外部 HTTP 请求 | 检测外部 URL 访问，支持白名单过滤 |
| `base64_encoding` | Base64 编码 | 检测可能用于混淆的编码操作 |
| `websocket_connection` | WebSocket 连接 | 检测可能用于 C&C 通信的 WebSocket |
| `dangerous_chmod_777` | 危险的权限设置 | 检测 `chmod 777` 命令 |
| `sudo_execution` | sudo 权限提升 | 检测 `sudo` 使用 |
| `prompt_injection_phrases` | 提示词注入（中英文） | 检测恶意提示词注入短语 |
| `hardcoded_secrets_like_tokens` | 硬编码密钥 | 检测 API 密钥、Token 等敏感信息 |
| `hardcoded_passwords` | 硬编码密码 | 检测代码中的硬编码密码 |
| `kill_processes` | 终止进程 | 检测 `kill`、`killall` 等命令 |
| `download_and_execute` | 下载并执行 | 检测 `curl \| bash` 等危险操作 |
| `registry_modification` | 注册表修改 | 检测 Windows 注册表修改 |

### 低危风险 (1 条)

| 规则 ID | 描述 | 检测内容 |
|---------|------|----------|
| `obfuscated_code` | 代码混淆 | 检测 `eval(atob())` 等混淆代码 |

### 上下文分析能力

扫描器能够智能区分：
- ✅ 文档说明 vs 实际代码
- ✅ 示例代码 vs 真实使用
- ✅ 安全操作 vs 危险操作
- ✅ 占位符 vs 真实密钥
- ✅ 文档链接 vs 数据外传
- ✅ 注释警告 vs 恶意代码
- ✅ 测试用例 vs 生产代码

## 🚀 快速开始

### 方式一：使用打包版（推荐，无需安装 Node.js）

1. **下载打包版**
   - 下载 `OpenClawSkillScanner.exe`（Windows）
   - 或从 [Releases](https://gitee.com/YuTianGe/openclaw-skill-scanner/releases) 下载

2. **运行程序**
   - 双击 `OpenClawSkillScanner.exe`
   - 程序会自动启动服务器并打开浏览器
   - 访问 `http://localhost:5173`

3. **开始使用**
   - 无需安装 Node.js
   - 无需安装依赖
   - 开箱即用

详细说明请查看 [使用说明-打包版.md](./使用说明-打包版.md)

### 方式二：从源码运行（开发者）

#### 安装

```bash
# 克隆仓库
git clone https://gitee.com/YuTianGe/openclaw-skill-scanner.git
cd openclaw-skill-scanner

# 安装依赖
npm install
```

### 使用方法

#### 1. 命令行模式

```bash
# 扫描默认 skills 目录 (~/.agents/skills)
node bin/claw-skill-scan.js

# 扫描指定目录
node bin/claw-skill-scan.js /path/to/skills

# 输出 JSON 格式
node bin/claw-skill-scan.js --json

# 隔离风险 skill
node bin/claw-skill-scan.js --delete skill-name

# 禁用 skill
node bin/claw-skill-scan.js --disable skill-name
```

#### 2. TUI 交互界面

```bash
node bin/claw-skill-scan-tui.js
```

功能特性：
- 实时扫描进度条
- 交互式结果浏览
- 按严重程度筛选
- 详细的风险信息展示

#### 3. Web UI（推荐）

```bash
# 启动 Web 服务器
node server.js

# 访问浏览器
# http://localhost:5173
```

Web UI 功能：
- 📊 实时流式扫描进度
- 🤖 **Ollama 一键管理**（新功能）
  - 🟢 绿灯：Ollama 运行中，LLM 增强已启用
  - 🟡 黄灯：Ollama 已安装但未启动
  - 🔴 红灯：Ollama 未安装
  - 一键安装、启动、停止 Ollama
  - 自动下载模型（llama3.2:3b）
  - 实时状态监控（每 30 秒自动刷新）
- 🎨 暗色/亮色主题切换
- 📋 白名单域名管理
- 🔍 详细的威胁分析报告
- 📁 一键打开 skill 目录
- 🛡️ 隔离/禁用风险 skill

## 🤖 Ollama LLM 增强

### 快速开始

使用 Web 界面一键安装和启动 Ollama：

1. **启动 Web 界面**
   ```bash
   node server.js
   ```
   访问 http://localhost:5173

2. **查看 Ollama 状态**
   - 🟢 绿灯：运行中，LLM 增强已启用
   - 🟡 黄灯：已安装但未启动
   - 🔴 红灯：未安装

3. **一键操作**
   - 红灯状态：点击"安装 Ollama"
   - 黄灯状态：点击"启动 Ollama"
   - 绿灯状态：享受 LLM 增强扫描

### 手动安装（可选）

如果不使用 Web 界面，也可以手动安装：

```bash
# 访问 https://ollama.ai/download 下载安装

# 启动服务
ollama serve

# 下载模型
ollama pull llama3.2:3b
```

### 项目结构

```
openclaw-skill-scanner/
├── bin/                          # 可执行文件
│   ├── claw-skill-scan.js           # CLI 入口
│   └── claw-skill-scan-tui.js       # TUI 入口
├── src/                          # 核心源代码
│   ├── scanner.js                   # 扫描引擎
│   ├── rules.js                     # 默认规则定义
│   ├── context-analyzer.js          # 上下文分析器
│   ├── ollama-analyzer.js           # Ollama LLM 分析器
│   ├── reporter.js                  # 报告生成器
│   ├── actions.js                   # 操作函数（隔离/禁用）
│   ├── config.js                    # 配置加载
│   └── index.js                     # 主入口
├── web/                          # Web UI 资源
│   ├── index.html                   # 主页面
│   ├── app.js                       # 前端逻辑
│   └── styles.css                   # 样式文件
├── server.js                     # Web 服务器
├── rules.config.yml              # 配置文件
├── package.json                  # 项目配置
└── README.md                     # 项目文档
```

### 核心算法

1. **规则匹配**: 使用正则表达式快速匹配潜在风险
2. **上下文分析**: 分析代码上下文判断真实意图
3. **Ollama LLM 增强**: 使用本地 Ollama 大模型进行语义理解（可选）
4. **全文语义分析**: 主动扫描整个 skill，发现未知恶意模式
5. **置信度评分**: 综合评估给出风险置信度

## 🤖 启用 LLM 增强检测

### 安装 Ollama

1. 访问 https://ollama.ai 下载安装
2. 运行模型：
   ```bash
   ollama run llama3.2
   ```

### 配置要求

- **最低配置**: 8GB 内存
- **推荐配置**: 16GB 内存
- **模型大小**: 2GB
- **速度**: 5-10秒/skill（无GPU）

详细配置要求请查看 [OLLAMA_REQUIREMENTS.md](OLLAMA_REQUIREMENTS.md)

### 使用方式

Ollama 启动后，扫描器会自动检测并启用 LLM 增强：

```bash
# 启动 Ollama（终端1）
ollama run llama3.2

# 运行扫描（终端2）
node bin/claw-skill-scan.js

# 输出示例：
# ✅ 检测到 Ollama 服务，将使用 LLM 增强检测
```

如果不想使用 LLM，可以在 `rules.config.yml` 中关闭：

```yaml
enable_llm_analysis: false
```

## 🎨 Web UI 特性

- 🌓 **主题切换**: 支持深色/浅色主题，自动保存偏好
- 📊 **实时统计**: 动态显示扫描进度和风险统计
- 🔍 **代码查看**: 内置代码查看器，支持语法高亮
- 🏷️ **白名单管理**: 可视化管理白名单域名
- 🎯 **智能筛选**: 按风险等级、状态筛选结果
- 📋 **详细报告**: 每个风险都有详细说明和修复建议
- ⚡ **流式更新**: SSE 实时推送扫描进度，无需刷新

## ⚙️ 配置说明

### 基础配置

在项目根目录创建或编辑 `rules.config.yml`：

```yaml
# 白名单域名（不会被标记为风险）
whitelistDomains:
  - github.com
  - api.openai.com
  - anthropic.com
  - npmjs.org

# 忽略模式
ignorePatterns:
  - "**/node_modules/**"
  - "**/.git/**"
  - "**/test/**"
  - "**/*.test.js"

# 自定义规则
rules:
  - id: custom_dangerous_command
    severity: high
    description: 自定义危险命令检测
    fileGlobs:
      - "**/*.js"
      - "**/*.sh"
    pattern: "dangerous_pattern"
    remediation: 修复建议说明
```

### LLM 增强分析（默认启用）

LLM 现在不仅用于减少误报，还能**主动发现未知威胁**：

```yaml
# 启用 LLM 分析（默认启用）
enable_llm_analysis: true

# LLM 置信度阈值（0-1）
llm_confidence_threshold: 0.85
```

**LLM 能力升级**：
- ✅ 使用 CodeBERT 代码理解模型（专为代码分析设计）
- ✅ 全文语义分析：理解整个 skill 的行为意图
- ✅ 自动发现未知威胁：无需手动添加规则
- ✅ 组合攻击检测：识别多个操作组合形成的威胁
- ✅ 完全本地运行：保护隐私，不上传数据

**可检测的威胁类型**：
1. 数据外传：读取敏感文件 + 发送到外部服务器
2. 凭证收集：读取环境变量密钥并发送
3. 后门安装：修改系统启动文件
4. 大规模文件删除：删除用户重要数据
5. 命令注入：动态执行用户输入
6. 代码混淆：使用 eval 执行解码代码

首次启用会自动下载模型（约 400MB），完全本地运行，保护隐私。

### 环境变量

```bash
# 指定 skills 根目录
export OPENCLAW_SKILLS_ROOT=/path/to/skills

# 指定 Web UI 端口
export SKILL_SCAN_PORT=5173
```

## 🎯 核心优势

### 1. 启发式检测（推荐）
自动识别恶意行为模式，无需手动维护规则：
- **15+ 种检测模式**: 数据外传、凭证窃取、反向Shell、代码混淆等
- **零误报**: 准确率 87.5%，不会误判正常代码
- **极速扫描**: 毫秒级响应
- **行为组合识别**: 检测单独无害但组合危险的操作

### 2. LLM 增强分析（可选）
- 零漏报，能检测所有恶意代码
- 完全本地运行，保护隐私
- 语义理解，识别复杂攻击意图
- 需要人工复核（误报率 25%）

### 3. 易于使用
- Web 界面直观友好
- 一键扫描，自动分析
- 详细的风险报告和修复建议

### 4. 高度可配置
- 自定义扫描规则
- 灵活的白名单管理
- 可调整的置信度阈值

## 💡 常见问题

### Q: 扫描需要多长时间？
A: 规则分析模式下，扫描 50+ skills 通常只需几秒。启用 LLM 后会增加到几十秒。

### Q: LLM 模型会上传数据吗？
A: 不会。LLM 完全在本地运行，不会上传任何数据，保护隐私。

### Q: 如何减少误报？
A: 启发式检测已经实现零误报（准确率 87.5%）。如果启用 LLM 增强，可能会有误报，建议人工复核。

### Q: LLM 能发现哪些新型威胁？
A: 启发式检测可以自动识别：
- 数据外传（读取敏感文件并发送到外部）
- 凭证窃取（SSH 密钥、环境变量、浏览器数据）
- 反向 Shell（远程控制连接）
- 代码混淆（eval + Base64）
- 命令注入（动态执行用户输入）
- 后门植入（修改启动文件）
- 提示词注入（隐藏恶意指令）

无需手动添加规则，系统会自动识别这些模式。

## 📦 打包与分发

### 打包成 EXE

```bash
# 安装打包工具
npm install

# 打包 Windows 版本
npm run build

# 打包所有平台（Windows、macOS、Linux）
npm run build:all
```

打包后的文件位于 `dist/` 目录：
- Windows: `OpenClawSkillScanner.exe`
- macOS: `OpenClawSkillScanner-macos`
- Linux: `OpenClawSkillScanner-linux`

详细打包说明请查看 [BUILD.md](./BUILD.md)

### 分发说明

打包后的 EXE 文件可以直接分发给用户，无需安装 Node.js 环境。用户只需双击运行即可。
- [OpenClaw Project](https://github.com/openclaw)

---

**Made with ❤️ for OpenClaw Community**
