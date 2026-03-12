// 默认内置规则，当 rules.config.yml 存在时会被覆盖
export const DEFAULT_RULES = [
  // ========== 高危：文件系统破坏 ==========
  {
    id: 'dangerous_command_rm_rf',
    severity: 'high',
    description: '危险的文件删除命令 (rm -rf)',
    remediation: '避免使用 rm -rf，改用 trash/回收站机制或增加确认提示',
    fileGlobs: ['**/*.js', '**/*.ts', '**/*.py', '**/*.sh', '**/*.bash'],
    pattern: /rm\s+-r?f\s+/i,
  },
  {
    id: 'dangerous_file_deletion',
    severity: 'high',
    description: '批量删除文件操作',
    remediation: '限制删除范围，避免删除用户重要数据',
    fileGlobs: ['**/*.js', '**/*.ts', '**/*.py'],
    pattern: /(unlinkSync|rmSync|rmdirSync|removeSync)\s*\([^)]*(\*|~|\/home|\/Users|C:\\\\Users)/i,
  },
  {
    id: 'format_disk_command',
    severity: 'high',
    description: '格式化磁盘命令',
    remediation: '禁止在 skill 中执行磁盘格式化操作',
    fileGlobs: ['**/*.sh', '**/*.bash', '**/*.py', '**/*.js'],
    pattern: /(mkfs|format|dd\s+if=.*of=\/dev)/i,
  },

  // ========== 高危：凭证窃取 ==========
  {
    id: 'access_sensitive_ssh_keys',
    severity: 'high',
    description: '访问 SSH 私钥文件',
    remediation: '仅在必要的安全审计场景访问，并在文档中说明用途',
    fileGlobs: ['**/*'],
    pattern: /(\.ssh\/id_rsa|\.ssh\/id_ed25519|\.ssh\/id_dsa|~\/\.ssh|%USERPROFILE%\\\.ssh)/i,
  },
  {
    id: 'access_aws_credentials',
    severity: 'high',
    description: '访问 AWS 凭证文件',
    remediation: '避免读取云服务凭证文件',
    fileGlobs: ['**/*'],
    pattern: /(\.aws\/credentials|\.aws\/config)/i,
  },
  {
    id: 'access_env_files',
    severity: 'high',
    description: '读取环境变量配置文件',
    remediation: '避免读取 .env 文件并外传',
    fileGlobs: ['**/*.js', '**/*.ts', '**/*.py'],
    pattern: /(readFileSync|readFile|open)\s*\([^)]*\.env[^)]*\)/i,
  },
  {
    id: 'access_browser_passwords',
    severity: 'high',
    description: '访问浏览器密码数据库',
    remediation: '禁止访问浏览器存储的密码',
    fileGlobs: ['**/*'],
    pattern: /(Login Data|Cookies|Web Data|chrome.*password|firefox.*password)/i,
  },

  // ========== 高危：后门安装 ==========
  {
    id: 'modify_startup_files',
    severity: 'high',
    description: '修改系统启动文件',
    remediation: '禁止修改 .bashrc、.zshrc 等启动脚本',
    fileGlobs: ['**/*.js', '**/*.ts', '**/*.py', '**/*.sh'],
    pattern: /(\.bashrc|\.zshrc|\.profile|\.bash_profile|\.config\/fish)/i,
  },
  {
    id: 'create_cron_job',
    severity: 'high',
    description: '创建定时任务',
    remediation: '避免创建持久化定时任务',
    fileGlobs: ['**/*.js', '**/*.ts', '**/*.py', '**/*.sh'],
    pattern: /(crontab\s+-|systemctl.*enable|launchctl.*load)/i,
  },
  {
    id: 'modify_hosts_file',
    severity: 'high',
    description: '修改 hosts 文件',
    remediation: '禁止修改系统 hosts 文件',
    fileGlobs: ['**/*'],
    pattern: /(\/etc\/hosts|C:\\\\Windows\\\\System32\\\\drivers\\\\etc\\\\hosts).*write/i,
  },

  // ========== 高危：命令注入 ==========
  {
    id: 'command_injection',
    severity: 'high',
    description: '可能的命令注入漏洞',
    remediation: '避免直接执行用户输入，使用参数化命令',
    fileGlobs: ['**/*.js', '**/*.ts', '**/*.py'],
    pattern: /(exec|spawn|system|popen|shell_exec)\s*\([^)]*(\$\{|`|\+\s*input|\+\s*req\.|process\.argv)/i,
  },
  {
    id: 'eval_user_input',
    severity: 'high',
    description: '使用 eval 执行用户输入',
    remediation: '禁止使用 eval 执行动态代码',
    fileGlobs: ['**/*.js', '**/*.ts', '**/*.py'],
    pattern: /(eval|Function|exec)\s*\([^)]*(\$\{|input|req\.|argv)/i,
  },

  // ========== 中危：数据外传 ==========
  {
    id: 'external_http_request',
    severity: 'medium',
    description: '访问外部 HTTP/HTTPS URL',
    remediation: '确认外部域名可信，并在白名单中显式列出',
    fileGlobs: ['**/*.js', '**/*.ts', '**/*.py', '**/*.sh', '**/*.md'],
    pattern: /https?:\/\/[^\s'"]+/i,
  },
  {
    id: 'base64_encoding',
    severity: 'medium',
    description: 'Base64 编码操作（可能用于混淆）',
    remediation: '确认 Base64 编码的用途，避免混淆恶意代码',
    fileGlobs: ['**/*.js', '**/*.ts', '**/*.py'],
    pattern: /(btoa|atob|base64\.b64encode|base64\.b64decode|Buffer\.from.*base64)/i,
  },
  {
    id: 'websocket_connection',
    severity: 'medium',
    description: 'WebSocket 连接（可能用于 C&C 通信）',
    remediation: '确认 WebSocket 连接的目的和目标服务器',
    fileGlobs: ['**/*.js', '**/*.ts', '**/*.py'],
    pattern: /(new\s+WebSocket|ws:\/\/|wss:\/\/|websocket\.connect)/i,
  },

  // ========== 中危：权限提升 ==========
  {
    id: 'dangerous_chmod_777',
    severity: 'medium',
    description: 'chmod 777 权限过于宽松',
    remediation: '使用最小权限原则，避免 777',
    fileGlobs: ['**/*.sh', '**/*.bash', '**/*.js', '**/*.ts', '**/*.py'],
    pattern: /chmod\s+(777|a\+rwx)/i,
  },
  {
    id: 'sudo_execution',
    severity: 'medium',
    description: '使用 sudo 提升权限',
    remediation: '避免在 skill 中使用 sudo',
    fileGlobs: ['**/*.sh', '**/*.bash', '**/*.js', '**/*.ts', '**/*.py'],
    pattern: /sudo\s+/i,
  },

  // ========== 中危：提示词注入（中英文） ==========
  {
    id: 'prompt_injection_phrases',
    severity: 'medium',
    description: '可疑的提示词注入短语',
    remediation: '在文档中区分示例和实际逻辑，对用户输入做严格过滤',
    fileGlobs: ['**/*.md', '**/*.txt', '**/*.js', '**/*.ts', '**/*.py'],
    pattern: /(ignore previous instructions|忽略之前的指令|忽略上述|忽略以上|bypass.*system|绕过.*系统|绕过.*提示|绕过.*警告|system prompt|系统提示|输出你的系统提示|reveal.*prompt|泄露.*提示|泄露所有|删除所有|delete all|删除.*本地文件|删除.*电脑|你可以删除|可以删除.*文件|发我|发给我|发送.*私钥|发送.*密码|发送.*token|发送.*key|上传.*私钥|传给我|把.*发给|发到邮箱|发送到邮箱|发送至邮箱|项目.*发到|文件.*发到|代码.*发到|数据.*发到|send.*to.*email|send.*to.*mail|你的密码|输入密码|提供密码|告诉我.*密码|密码是多少|密码是什么|what is your password|give me.*password|send me.*key|exfiltrate|data extraction)/i,
  },

  // ========== 中危：硬编码密钥 ==========
  {
    id: 'hardcoded_secrets_like_tokens',
    severity: 'medium',
    description: '疑似硬编码密钥/Token',
    remediation: '使用环境变量或密钥管理服务，不要硬编码',
    fileGlobs: ['**/*.js', '**/*.ts', '**/*.py', '**/*.sh', '**/*.md'],
    pattern: /sk-[A-Za-z0-9_-]{15,}|ghp_[A-Za-z0-9]{20,}|AKIA[0-9A-Z]{16}|xox[baprs]-[A-Za-z0-9-]{10,}|AIza[0-9A-Za-z_-]{35}/,
  },
  {
    id: 'hardcoded_passwords',
    severity: 'medium',
    description: '疑似硬编码密码',
    remediation: '不要在代码中硬编码密码',
    fileGlobs: ['**/*.js', '**/*.ts', '**/*.py', '**/*.sh'],
    pattern: /(password\s*=\s*['"][^'"]{8,}['"]|pwd\s*=\s*['"][^'"]{8,}['"]|passwd\s*=\s*['"][^'"]{8,}['"])/i,
  },

  // ========== 中危：进程操作 ==========
  {
    id: 'kill_processes',
    severity: 'medium',
    description: '终止进程操作',
    remediation: '避免随意终止系统进程',
    fileGlobs: ['**/*.js', '**/*.ts', '**/*.py', '**/*.sh'],
    pattern: /(kill\s+-9|killall|pkill|taskkill|process\.kill)/i,
  },

  // ========== 低危：可疑操作 ==========
  {
    id: 'obfuscated_code',
    severity: 'low',
    description: '可能的代码混淆',
    remediation: '避免使用混淆代码，保持代码可读性',
    fileGlobs: ['**/*.js', '**/*.ts'],
    pattern: /(eval\s*\(\s*atob|eval\s*\(\s*Buffer|String\.fromCharCode.*eval)/i,
  },
  {
    id: 'download_and_execute',
    severity: 'medium',
    description: '下载并执行代码',
    remediation: '避免从网络下载并直接执行代码',
    fileGlobs: ['**/*.js', '**/*.ts', '**/*.py', '**/*.sh'],
    pattern: /(curl.*\|\s*bash|wget.*\|\s*sh|curl.*\|\s*python|Invoke-WebRequest.*Invoke-Expression)/i,
  },
  {
    id: 'registry_modification',
    severity: 'medium',
    description: '修改 Windows 注册表',
    remediation: '避免修改系统注册表',
    fileGlobs: ['**/*.js', '**/*.ts', '**/*.py', '**/*.ps1'],
    pattern: /(reg\s+add|Set-ItemProperty.*HKLM|New-ItemProperty.*HKCU)/i,
  },
];
