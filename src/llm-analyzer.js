/**
 * 基于本地 LLM 的语义分析器
 * 使用 Transformers.js 在本地运行代码安全分析模型
 */

import { pipeline } from '@xenova/transformers';
import crypto from 'crypto';

let classifier = null;
let classifierPromise = null; // 用于防止并发加载
const analysisCache = new Map(); // 缓存分析结果
const MAX_CACHE_SIZE = 1000; // 限制缓存大小

/**
 * 初始化分类器（懒加载，防止并发加载）
 * 使用更适合代码分析的模型
 */
async function getClassifier() {
  if (classifier) {
    return classifier;
  }

  // 如果正在加载，等待加载完成
  if (classifierPromise) {
    return classifierPromise;
  }

  // 开始加载
  classifierPromise = (async () => {
    console.log('正在加载本地 AI 模型（代码安全分析专用）...');
    const startTime = Date.now();

    // 尝试使用更适合代码分析的模型
    // 优先级：CodeBERT > microsoft/codebert-base > 通用文本分类模型
    try {
      // 使用 CodeBERT 进行代码理解
      classifier = await pipeline('feature-extraction', 'Xenova/codebert-base');
      console.log('已加载 CodeBERT 模型');
    } catch (error) {
      console.log('CodeBERT 不可用，尝试备用模型...');
      try {
        // 备用：使用通用的文本分类模型
        classifier = await pipeline('text-classification', 'Xenova/distilbert-base-uncased-finetuned-sst-2-english');
        console.log('已加载备用文本分类模型');
      } catch (fallbackError) {
        console.error('模型加载失败:', fallbackError);
        throw fallbackError;
      }
    }

    const loadTime = Date.now() - startTime;
    console.log(`模型加载完成 (耗时: ${loadTime}ms)`);
    classifierPromise = null;
    return classifier;
  })();

  return classifierPromise;
}

/**
 * 生成缓存键
 */
function getCacheKey(line, ruleType) {
  const content = `${ruleType}:${line}`;
  return crypto.createHash('md5').update(content).digest('hex');
}

/**
 * 使用 LLM 分析代码片段是否安全
 */
export async function analyzeWithLLM(line, context, ruleType) {
  try {
    // 检查缓存
    const cacheKey = getCacheKey(line, ruleType);
    if (analysisCache.has(cacheKey)) {
      return analysisCache.get(cacheKey);
    }

    const model = await getClassifier();

    // 构造分析提示
    const prompt = buildPrompt(line, context, ruleType);

    // 使用模型进行分类
    const result = await model(prompt);

    // 解析结果
    const parsedResult = parseResult(result);

    // 缓存结果（限制缓存大小）
    if (analysisCache.size >= MAX_CACHE_SIZE) {
      // 删除最早的缓存项
      const firstKey = analysisCache.keys().next().value;
      analysisCache.delete(firstKey);
    }
    analysisCache.set(cacheKey, parsedResult);

    return parsedResult;
  } catch (error) {
    console.error('LLM 分析失败:', error);
    // 降级到规则分析
    return { useLLM: false, error: error.message };
  }
}

/**
 * 构造分析提示 - 针对恶意代码检测优化
 */
function buildPrompt(line, context, ruleType) {
  const prompts = {
    'rm_rf': `Analyze this code for malicious file deletion intent. Code: "${line}" Context: "${context}". Is this: 1) Malicious deletion of user data, 2) Safe cleanup of temp/build files, or 3) Documentation example?`,
    'external_url': `Analyze this URL access for data exfiltration risk. Code: "${line}" Context: "${context}". Is this: 1) Sending sensitive data to untrusted server, 2) Legitimate API call to known service, or 3) Documentation link?`,
    'ssh_key': `Analyze this SSH key access for credential theft. Code: "${line}" Context: "${context}". Is this: 1) Stealing private keys, 2) Legitimate SSH config management, or 3) Documentation reference?`,
    'prompt_injection': `Analyze this for prompt injection attack. Code: "${line}" Context: "${context}". Is this: 1) Actual malicious prompt injection, 2) Security documentation/example, or 3) Normal user instruction?`,
    'hardcoded_secret': `Analyze this for real credential exposure. Code: "${line}" Context: "${context}". Is this: 1) Real API key/token being exposed, 2) Placeholder/example value, or 3) Documentation?`,
  };

  return prompts[ruleType] || `Analyze if this code contains malicious behavior: "${line}"`;
}

/**
 * 解析模型结果
 */
function parseResult(result) {
  // result 格式: [{ label: 'POSITIVE'/'NEGATIVE', score: 0.99 }]
  const prediction = result[0];

  // POSITIVE = 安全, NEGATIVE = 危险
  const isSafe = prediction.label === 'POSITIVE';
  const confidence = prediction.score;

  return {
    useLLM: true,
    isSafe,
    confidence,
    reason: isSafe ? 'LLM 判定为安全代码' : 'LLM 判定为可疑代码',
  };
}

/**
 * 混合分析：规则 + LLM
 */
export async function hybridAnalyze(line, context, ruleType, ruleAnalysisResult) {
  // 如果规则分析高置信度，直接返回（不调用 LLM）
  if (ruleAnalysisResult.confidence && ruleAnalysisResult.confidence >= 0.85) {
    return ruleAnalysisResult;
  }

  // 只有置信度低于 0.85 才使用 LLM 进行深度分析
  const llmResult = await analyzeWithLLM(line, context, ruleType);

  if (llmResult.useLLM) {
    // 合并规则分析和 LLM 分析的结果
    return {
      ...llmResult,
      ruleConfidence: ruleAnalysisResult.confidence,
      combinedAnalysis: true
    };
  }

  // LLM 失败，降级到规则结果
  return ruleAnalysisResult;
}

/**
 * 清空缓存（用于测试或重新扫描）
 */
export function clearCache() {
  analysisCache.clear();
}

/**
 * 获取缓存统计信息
 */
export function getCacheStats() {
  return {
    size: analysisCache.size,
    maxSize: MAX_CACHE_SIZE
  };
}

/**
 * 全文语义分析 - 分析整个 skill 的代码，识别恶意行为模式
 * 这是主动扫描模式，不依赖规则匹配
 */
export async function analyzeFullSkillContent(skillContent, skillName) {
  try {
    const cacheKey = getCacheKey(skillContent.substring(0, 500), 'full_analysis');
    if (analysisCache.has(cacheKey)) {
      return analysisCache.get(cacheKey);
    }

    const model = await getClassifier();

    // 构造全文分析提示
    const prompt = buildFullAnalysisPrompt(skillContent, skillName);

    // 使用模型进行分析
    const result = await model(prompt);

    // 解析结果
    const parsedResult = parseFullAnalysisResult(result, skillContent);

    // 缓存结果
    if (analysisCache.size >= MAX_CACHE_SIZE) {
      const firstKey = analysisCache.keys().next().value;
      analysisCache.delete(firstKey);
    }
    analysisCache.set(cacheKey, parsedResult);

    return parsedResult;
  } catch (error) {
    console.error('全文 LLM 分析失败:', error);
    return {
      analyzed: false,
      error: error.message,
      suspiciousPatterns: []
    };
  }
}

/**
 * 构造全文分析提示
 */
function buildFullAnalysisPrompt(content, skillName) {
  // 截取前 2000 字符进行分析（避免超出模型限制）
  const truncated = content.substring(0, 2000);

  return `Analyze this code skill named "${skillName}" for malicious behavior patterns:

${truncated}

Identify if this code contains:
1. Data exfiltration (sending sensitive data to external servers)
2. Credential theft (accessing SSH keys, passwords, tokens)
3. Destructive operations (deleting user files, system files)
4. Backdoor installation (creating persistent access)
5. Prompt injection attacks (manipulating AI behavior)
6. Suspicious network activity (unusual API calls)

Is this code malicious or benign?`;
}

/**
 * 解析全文分析结果
 */
function parseFullAnalysisResult(result, content) {
  const prediction = result[0];
  const isSafe = prediction.label === 'POSITIVE';
  const confidence = prediction.score;

  // 额外的启发式检测
  const suspiciousPatterns = detectSuspiciousPatterns(content);

  return {
    analyzed: true,
    isSafe,
    confidence,
    suspiciousPatterns,
    reason: isSafe
      ? 'LLM 全文分析判定为安全代码'
      : 'LLM 全文分析发现可疑行为模式',
    recommendation: suspiciousPatterns.length > 0
      ? '建议人工审查：' + suspiciousPatterns.join(', ')
      : null
  };
}

/**
 * 启发式检测可疑模式（补充 LLM 分析）
 */
function detectSuspiciousPatterns(content) {
  const patterns = [];

  // 检测数据外传组合：读取敏感文件 + 网络请求
  if (/(readFileSync|readFile).*\.(ssh|env|config)/i.test(content) &&
      /https?:\/\/(?!github\.com|npmjs\.org|anthropic\.com)/i.test(content)) {
    patterns.push('可能的数据外传：读取敏感文件并发送到外部服务器');
  }

  // 检测凭证收集
  if (/(password|token|api[_-]?key|secret).*=.*process\.env/i.test(content) &&
      /fetch|axios|request|http/i.test(content)) {
    patterns.push('可能的凭证收集：读取环境变量中的密钥并发送');
  }

  // 检测持久化后门
  if (/(crontab|systemd|\.bashrc|\.zshrc).*write/i.test(content)) {
    patterns.push('可能的后门安装：修改系统启动文件');
  }

  // 检测大规模文件删除
  if (/rm\s+-rf\s+[~\/](?!tmp|build|dist|node_modules)/i.test(content)) {
    patterns.push('危险的文件删除：可能删除用户重要数据');
  }

  // 检测命令注入
  if (/(exec|spawn|system)\s*\(.*\$\{.*\}.*\)/i.test(content)) {
    patterns.push('可能的命令注入：动态执行用户输入的命令');
  }

  // 检测混淆代码
  if (/(eval|Function)\s*\(.*atob|fromCharCode/i.test(content)) {
    patterns.push('可疑的代码混淆：使用 eval 执行解码后的代码');
  }

  return patterns;
}
