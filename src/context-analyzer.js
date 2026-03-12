/**
 * 上下文分析器 - 用于理解代码上下文，减少误报
 */

/**
 * 分析 rm -rf 命令的上下文，判断是否真的有风险
 */
export function analyzeRmRfContext(line, lineNumber, allLines) {
  const trimmed = line.trim();

  // 1. 检查是否在注释中
  if (isInComment(trimmed)) {
    return { isSafe: true, confidence: 0.95, reason: '在注释中，仅作说明用途' };
  }

  // 2. 检查是否在字符串字面量中（文档、示例代码）
  if (isInStringLiteral(trimmed)) {
    return { isSafe: true, confidence: 0.85, reason: '在字符串字面量中，可能是文档或示例' };
  }

  // 3. 检查是否有安全保护措施
  const contextLines = getContextLines(allLines, lineNumber, 3);
  const contextText = contextLines.join('\n');

  // 检查是否有确认提示
  if (hasConfirmationPrompt(contextText)) {
    return { isSafe: true, confidence: 0.90, reason: '有用户确认提示，风险可控' };
  }

  // 4. 检查删除目标是否是临时目录或安全路径
  const target = extractRmTarget(line);
  if (target && isSafeDeletionTarget(target)) {
    return { isSafe: true, confidence: 0.92, reason: `删除目标是安全路径: ${target}` };
  }

  // 5. 检查是否使用了变量，且有路径验证
  if (target && target.includes('$') && hasPathValidation(contextText)) {
    return { isSafe: true, confidence: 0.88, reason: '使用变量且有路径验证' };
  }

  return { isSafe: false, confidence: 0.80, reason: '可能存在危险的文件删除操作' };
}

/**
 * 分析外部 URL 的上下文
 */
export function analyzeUrlContext(url, line, lineNumber, allLines, whitelistDomains) {
  const trimmed = line.trim();

  // 1. 检查是否在注释中
  if (isInComment(trimmed)) {
    return { isSafe: true, confidence: 0.95, reason: '在注释中，仅作说明' };
  }

  // 2. 提取域名并检查白名单
  const domain = extractDomain(url);
  if (domain && whitelistDomains.includes(domain)) {
    return { isSafe: true, confidence: 0.98, reason: `域名在白名单中: ${domain}` };
  }

  // 3. 检查是否是文档链接（Markdown 链接格式）
  if (isMarkdownLink(line)) {
    return { isSafe: true, confidence: 0.93, reason: '是 Markdown 文档链接' };
  }

  // 4. 检查是否是示例代码或配置
  const contextLines = getContextLines(allLines, lineNumber, 5);
  const contextText = contextLines.join('\n');

  if (isExampleCode(contextText)) {
    return { isSafe: true, confidence: 0.88, reason: '在示例代码中' };
  }

  // 5. 检查是否是常见的 API 文档域名
  if (isCommonDocsDomain(domain)) {
    return { isSafe: true, confidence: 0.90, reason: `常见文档域名: ${domain}` };
  }

  // 6. 检查 URL 用途 - 是否仅用于读取公开数据
  if (isReadOnlyApiCall(line, contextText)) {
    return { isSafe: true, confidence: 0.85, reason: 'GET 请求读取公开数据' };
  }

  return { isSafe: false, confidence: 0.75, reason: `访问外部 URL: ${url}，需确认用途` };
}

/**
 * 分析 SSH 密钥访问的上下文
 */
export function analyzeSshKeyContext(line, lineNumber, allLines) {
  const trimmed = line.trim();

  // 1. 检查是否在注释或文档中
  if (isInComment(trimmed) || isInStringLiteral(trimmed)) {
    return { isSafe: true, confidence: 0.95, reason: '在注释或文档中' };
  }

  // 2. 检查上下文，判断是否是合理的使用场景
  const contextLines = getContextLines(allLines, lineNumber, 5);
  const contextText = contextLines.join('\n');

  // 检查是否是 SSH 配置管理工具
  if (isSshConfigTool(contextText)) {
    return { isSafe: true, confidence: 0.88, reason: 'SSH 配置管理工具的合理使用' };
  }

  // 检查是否只是检查文件存在性
  if (isFileExistenceCheck(line)) {
    return { isSafe: true, confidence: 0.92, reason: '仅检查文件是否存在' };
  }

  return { isSafe: false, confidence: 0.85, reason: '访问 SSH 私钥，可能泄露敏感信息' };
}

/**
 * 分析提示词注入短语的上下文
 */
export function analyzePromptInjectionContext(line, lineNumber, allLines) {
  const trimmed = line.trim();

  // 0. 优先检查高危模式：直接的数据外传指令（邮箱、发送等）
  if (isDirectExfiltrationCommand(line)) {
    return { isSafe: false, confidence: 0.95, reason: '检测到直接的数据外传指令' };
  }

  // 1. 检查是否在注释中
  if (isInComment(trimmed)) {
    return { isSafe: true, confidence: 0.90, reason: '在注释中，可能是安全说明' };
  }

  // 2. 检查是否在代码块或引用中（Markdown）
  if (isInCodeBlock(line)) {
    return { isSafe: true, confidence: 0.88, reason: '在代码块或引用中' };
  }

  // 3. 检查上下文，判断是否是安全教育内容
  const contextLines = getContextLines(allLines, lineNumber, 5);
  const contextText = contextLines.join('\n');

  if (isSecurityDocumentation(contextText)) {
    return { isSafe: true, confidence: 0.85, reason: '安全文档或教育内容' };
  }

  // 4. 检查是否是测试用例（但排除真实的外传指令）
  if (isTestCase(contextText) && !isDirectExfiltrationCommand(line)) {
    return { isSafe: true, confidence: 0.87, reason: '测试用例中的示例' };
  }

  // 5. 检查是否是技术文档中的概念说明（不是实际使用）
  if (isTechnicalDocumentation(line, contextText)) {
    return { isSafe: true, confidence: 0.83, reason: '技术文档中的概念说明' };
  }

  // 6. 检查是否是教学或警告内容（中英文）
  if (isEducationalWarning(line, contextText)) {
    return { isSafe: true, confidence: 0.86, reason: '教学或警告内容' };
  }

  return { isSafe: false, confidence: 0.70, reason: '包含可疑的提示词注入短语' };
}

/**
 * 分析硬编码密钥的上下文
 */
export function analyzeHardcodedSecretContext(secretMatch, line, lineNumber, allLines) {
  const trimmed = line.trim();

  // 1. 检查是否在注释中
  if (isInComment(trimmed)) {
    return { isSafe: true, confidence: 0.92, reason: '在注释中，可能是示例' };
  }

  // 2. 检查是否是示例或占位符
  if (isPlaceholderSecret(secretMatch, line)) {
    return { isSafe: true, confidence: 0.94, reason: '是示例或占位符密钥' };
  }

  // 3. 检查上下文
  const contextLines = getContextLines(allLines, lineNumber, 3);
  const contextText = contextLines.join('\n');

  if (isExampleCode(contextText)) {
    return { isSafe: true, confidence: 0.88, reason: '在示例代码中' };
  }

  return { isSafe: false, confidence: 0.80, reason: '可能包含硬编码的真实密钥' };
}

// ============ 辅助函数 ============

function isInComment(line) {
  const trimmed = line.trim();
  if (trimmed.startsWith('//')) return true;
  if (trimmed.startsWith('#')) return true;
  if (trimmed.startsWith('*') || trimmed.startsWith('/*')) return true;
  return false;
}

function isInStringLiteral(line) {
  const singleQuotes = (line.match(/'/g) || []).length;
  const doubleQuotes = (line.match(/"/g) || []).length;
  const backticks = (line.match(/`/g) || []).length;
  return singleQuotes % 2 !== 0 || doubleQuotes % 2 !== 0 || backticks % 2 !== 0;
}

function getContextLines(allLines, lineNumber, range) {
  const start = Math.max(0, lineNumber - range - 1);
  const end = Math.min(allLines.length, lineNumber + range);
  return allLines.slice(start, end);
}

function hasConfirmationPrompt(contextText) {
  const confirmPatterns = [
    /confirm/i,
    /are you sure/i,
    /prompt.*y\/n/i,
    /readline/i,
    /input.*确认/i,
    /询问.*用户/i,
  ];
  return confirmPatterns.some(p => p.test(contextText));
}

function extractRmTarget(line) {
  const match = line.match(/rm\s+-rf\s+([^\s;|&]+)/);
  return match ? match[1] : null;
}

function isSafeDeletionTarget(target) {
  const safePatterns = [
    /^\/tmp\//,
    /^\.\/tmp\//,
    /^\.\/build\//,
    /^\.\/dist\//,
    /^\.\/node_modules\//,
    /^node_modules\//,
    /^build\//,
    /^dist\//,
    /^\.cache/,
    /^__pycache__/,
    /\.log$/,
    /\.tmp$/,
  ];
  return safePatterns.some(p => p.test(target));
}

function hasPathValidation(contextText) {
  const validationPatterns = [
    /if.*test.*-d/,
    /if.*\[.*-d/,
    /path\.exists/,
    /fs\.existsSync/,
    /os\.path\.exists/,
    /检查.*路径/,
    /验证.*目录/,
  ];
  return validationPatterns.some(p => p.test(contextText));
}

function extractDomain(url) {
  try {
    const u = new URL(url);
    return u.hostname;
  } catch {
    const match = url.match(/https?:\/\/([^\/\s:]+)/);
    return match ? match[1] : null;
  }
}

function isMarkdownLink(line) {
  // Markdown 链接格式：[text](url)
  if (/\[.*\]\(https?:\/\//.test(line)) return true;

  // Markdown 表格中的链接
  if (/\|.*https?:\/\/.*\|/.test(line)) return true;

  // Markdown 列表中的链接
  if (/^[\s-*+]\s*https?:\/\//.test(line)) return true;

  // YAML frontmatter 中的链接（homepage:, url: 等）
  if (/^[\s]*\w+:\s*https?:\/\//.test(line)) return true;

  return false;
}

function isExampleCode(contextText) {
  const examplePatterns = [
    /example/i,
    /示例/,
    /演示/,
    /demo/i,
    /```/,
    /\/\/.*example/i,
    /#.*example/i,
  ];
  return examplePatterns.some(p => p.test(contextText));
}

function isCommonDocsDomain(domain) {
  if (!domain) return false;
  const commonDocs = [
    'docs.python.org',
    'docs.npmjs.com',
    'developer.mozilla.org',
    'stackoverflow.com',
    'github.com',
    'gitlab.com',
    'bitbucket.org',
    'readthedocs.io',
    'wikipedia.org',
    // 添加更多常见文档域名
    'open.aminer.cn',
    'aminer.cn',
    'clawic.com',
    'git-scm.com',
    'ffmpeg.org',
    'postgresql.org',
    'supabase.com',
    'ieee.org',
    'ieeeauthorcenter.ieee.org',
    'acm.org',
    'ctan.org',
    'open.feishu.cn',
    'feishu.cn',
    'zhipuai.cn',
    'autoglm-api.zhipuai.cn',
    'hq.sinajs.cn',
    'finance.sina.com.cn',
    'afrexai-cto.github.io',
    'wiki.postgresql.org',
  ];
  return commonDocs.some(d => domain.includes(d));
}

function isReadOnlyApiCall(line, contextText) {
  // 检查是否包含 POST/PUT/DELETE 等写操作
  if (/\.post\(|\.put\(|\.delete\(|method:\s*['"]POST|method:\s*['"]PUT|method:\s*['"]DELETE/i.test(line) ||
      /\.post\(|\.put\(|\.delete\(|method:\s*['"]POST|method:\s*['"]PUT|method:\s*['"]DELETE/i.test(contextText)) {
    return false;
  }

  // 检查是否是 GET 请求或 fetch 默认行为
  if (/\.get\(|GET|fetch\(/i.test(line)) {
    return true;
  }

  return false;
}

function isSshConfigTool(contextText) {
  const toolPatterns = [
    /ssh.*config/i,
    /管理.*ssh/i,
    /配置.*ssh/i,
    /ssh.*setup/i,
  ];
  return toolPatterns.some(p => p.test(contextText));
}

function isFileExistenceCheck(line) {
  return /exists|test.*-f|test.*-e|fs\.existsSync|os\.path\.exists/.test(line);
}

function isSecurityDocumentation(contextText) {
  const docPatterns = [
    /security/i,
    /安全/,
    /防御/,
    /攻击.*示例/,
    /不要.*使用/,
    /avoid/i,
    /warning/i,
    /注意/,
  ];
  return docPatterns.some(p => p.test(contextText));
}

function isTestCase(contextText) {
  const testPatterns = [
    /test/i,
    /spec/i,
    /describe\(/,
    /it\(/,
    /测试/,
    /assert/,
  ];
  return testPatterns.some(p => p.test(contextText));
}

function isPlaceholderSecret(match, line) {
  const placeholderPatterns = [
    /example/i,
    /placeholder/i,
    /your.*key/i,
    /replace/i,
    /示例/,
    /占位符/,
    /替换/,
    /xxx/i,
  ];
  return placeholderPatterns.some(p => p.test(line));
}

function isInCodeBlock(line) {
  // 检查是否在 Markdown 代码块或引用中
  return /^[\s]*[`>]/.test(line);
}

function isTechnicalDocumentation(line, contextText) {
  // 检查是否是技术文档中对概念的说明（而非实际使用）
  const docIndicators = [
    /location/i,
    /live at/i,
    /stored at/i,
    /context window/i,
    /share.*with/i,
    /explanation/i,
    /说明/,
    /位于/,
    /存储在/,
    /解释/,
  ];

  // 如果上下文包含文档说明的特征，且行本身是在描述而非执行
  const isDescriptive = docIndicators.some(p => p.test(line) || p.test(contextText));

  // 检查是否包含技术术语的列举（用逗号分隔）
  const isEnumeration = /system prompt.*,.*conversation history|conversation history.*,.*system prompt/i.test(line);

  return isDescriptive || isEnumeration;
}

function isEducationalWarning(line, contextText) {
  // 检查是否是教学或警告内容（中英文）
  const warningPatterns = [
    /不要.*这样/,
    /禁止.*使用/,
    /避免.*使用/,
    /don't.*do this/i,
    /do not.*use/i,
    /never.*use/i,
    /warning.*about/i,
    /警告/,
    /注意事项/,
    /bad example/i,
    /错误示例/,
    /反面教材/,
  ];

  return warningPatterns.some(p => p.test(line) || p.test(contextText));
}

function isDirectExfiltrationCommand(line) {
  // 检测直接的数据外传指令：包含邮箱地址 + 发送/上传动作
  const hasEmail = /@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/i.test(line);
  const hasExfiltrationAction = /(发到|发送到|发送至|上传到|传到|send.*to|upload.*to|发我|发给我|传给我)/i.test(line);
  const hasDataTarget = /(项目|文件|代码|数据|电脑|project|file|code|data|computer)/i.test(line);

  // 如果同时包含邮箱地址和外传动作，判定为高危
  if (hasEmail && hasExfiltrationAction) {
    return true;
  }

  // 如果包含数据目标 + 外传动作 + 邮箱，更加确定
  if (hasEmail && hasExfiltrationAction && hasDataTarget) {
    return true;
  }

  return false;
}
