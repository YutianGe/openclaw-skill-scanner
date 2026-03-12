import fs from 'fs';
import path from 'path';
import { glob } from 'glob';
import { DEFAULT_RULES } from './rules.js';
import { shouldIgnore } from './config.js';
import {
  analyzeRmRfContext,
  analyzeUrlContext,
  analyzeSshKeyContext,
  analyzePromptInjectionContext,
  analyzeHardcodedSecretContext,
} from './context-analyzer.js';
import { hybridAnalyze, analyzeFullSkillContent, setMaxTokens } from './ollama-analyzer.js';

function readFileSafe(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch {
    return null;
  }
}

export async function scanSkills(rootDir, options = {}) {
  const { rulesConfig, projectRoot, onProgress, onSkillScanned } = options;
  const rules = rulesConfig?.rules || DEFAULT_RULES;
  const ignorePatterns = rulesConfig?.ignorePatterns || [];
  const whitelistDomains = rulesConfig?.whitelistDomains || [];
  const enableLLM = rulesConfig?.enableLLM !== undefined ? rulesConfig.enableLLM : true;
  const llmThreshold = rulesConfig?.llmConfidenceThreshold || 0.85;

  // 设置 LLM 最大输出长度
  if (rulesConfig?.llmMaxTokens) {
    setMaxTokens(rulesConfig.llmMaxTokens);
  }

  const skillsDirs = fs
    .readdirSync(rootDir, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => path.join(rootDir, d.name));

  const results = [];
  const totalSkills = skillsDirs.length;

  for (let i = 0; i < skillsDirs.length; i++) {
    const skillDir = skillsDirs[i];
    const skillName = path.basename(skillDir);

    // 报告进度
    if (onProgress) {
      onProgress({
        current: i + 1,
        total: totalSkills,
        skillName,
        percentage: Math.round(((i + 1) / totalSkills) * 100)
      });
    }

    // 跳过被禁用的 skill
    const disabledMarker = path.join(skillDir, 'DISABLED');
    if (fs.existsSync(disabledMarker)) {
      const result = {
        skillName,
        skillDir,
        findings: [],
        status: 'disabled'
      };
      results.push(result);

      // 立即报告这个 skill 的扫描结果
      if (onSkillScanned) {
        onSkillScanned(result);
      }
      continue;
    }

    const findings = [];

    // 如果启用 LLM，先进行全文语义分析（主动扫描模式）
    let fullAnalysisResult = null;
    if (enableLLM) {
      try {
        // 收集所有代码文件内容
        const allFiles = await glob(['**/*.js', '**/*.ts', '**/*.py', '**/*.sh', '**/*.md'], {
          cwd: skillDir,
          absolute: true,
          dot: true,
          nodir: true,
        });

        let fullContent = '';
        for (const file of allFiles) {
          if (shouldIgnore(file, projectRoot || rootDir, ignorePatterns)) {
            continue;
          }
          const content = readFileSafe(file);
          if (content) {
            fullContent += `\n// File: ${path.basename(file)}\n${content}\n`;
          }
        }

        // 执行全文分析
        if (fullContent.length > 0) {
          console.log(`🔍 [LLM] 正在分析 ${skillName}，内容长度: ${fullContent.length} 字符`);
          fullAnalysisResult = await analyzeFullSkillContent(fullContent, skillName);
          console.log(`📊 [LLM] ${skillName} 分析结果:`, JSON.stringify(fullAnalysisResult, null, 2));

          // 如果全文分析发现可疑模式，添加到 findings
          if (fullAnalysisResult.suspiciousPatterns && fullAnalysisResult.suspiciousPatterns.length > 0) {
            findings.push({
              ruleId: 'llm_full_analysis',
              severity: 'high',
              description: 'LLM 全文分析发现可疑行为模式',
              remediation: fullAnalysisResult.recommendation || '建议人工审查代码的整体行为',
              file: skillName,
              line: 0,
              snippet: fullAnalysisResult.suspiciousPatterns.join('; '),
              contextReason: fullAnalysisResult.reason,
            });
          }
        }
      } catch (error) {
        console.error(`全文分析失败 (${skillName}):`, error.message);
      }
    }

    for (const rule of rules) {
      const files = await glob(rule.fileGlobs, {
        cwd: skillDir,
        absolute: true,
        dot: true,
        nodir: true,
      });

      for (const file of files) {
        if (shouldIgnore(file, projectRoot || rootDir, ignorePatterns)) {
          continue;
        }
        const content = readFileSafe(file);
        if (!content) continue;

        const lines = content.split('\n');
        for (let idx = 0; idx < lines.length; idx++) {
          const line = lines[idx];
          const regex = rule.pattern instanceof RegExp ? rule.pattern : new RegExp(rule.pattern, 'i');
          const match = line.match(regex);

          if (!match) continue;

          // 使用上下文分析器判断是否为误报
          let contextAnalysis = null;

          if (rule.id === 'dangerous_command_rm_rf') {
            contextAnalysis = analyzeRmRfContext(line, idx, lines);
          } else if (rule.id === 'external_http_request') {
            const url = match[0];
            contextAnalysis = analyzeUrlContext(url, line, idx, lines, whitelistDomains);
          } else if (rule.id === 'access_sensitive_ssh_keys') {
            contextAnalysis = analyzeSshKeyContext(line, idx, lines);
          } else if (rule.id === 'prompt_injection_phrases') {
            contextAnalysis = analyzePromptInjectionContext(line, idx, lines);
          } else if (rule.id === 'hardcoded_secrets_like_tokens') {
            contextAnalysis = analyzeHardcodedSecretContext(match[0], line, idx, lines);
          }

          // 如果启用 LLM 且规则分析置信度不高，使用混合分析
          if (enableLLM && contextAnalysis && contextAnalysis.confidence < llmThreshold) {
            const context = lines.slice(Math.max(0, idx - 2), idx + 3).join('\n');
            const ruleTypeMap = {
              'dangerous_command_rm_rf': 'rm_rf',
              'external_http_request': 'external_url',
              'access_sensitive_ssh_keys': 'ssh_key',
              'prompt_injection_phrases': 'prompt_injection',
              'hardcoded_secrets_like_tokens': 'hardcoded_secret',
            };
            const ruleType = ruleTypeMap[rule.id];
            if (ruleType) {
              try {
                contextAnalysis = await hybridAnalyze(line, context, ruleType, contextAnalysis);
              } catch (error) {
                console.error(`LLM 分析出错 (${rule.id}):`, error.message);
                // 继续使用规则分析结果
              }
            }
          }

          // 如果上下文分析判定为安全，跳过
          if (contextAnalysis && contextAnalysis.isSafe) {
            continue;
          }

          // 命中规则，记录为风险
          findings.push({
            ruleId: rule.id,
            severity: rule.severity,
            description: rule.description,
            remediation: rule.remediation,
            file: path.relative(rootDir, file),
            line: idx + 1,
            snippet: line.trim().slice(0, 200),
            contextReason: contextAnalysis ? contextAnalysis.reason : null,
          });

          // 重置正则 lastIndex，避免全局匹配影响后续
          if (rule.pattern.global) {
            rule.pattern.lastIndex = 0;
          }
        }
      }
    }

    // 总是添加到结果中，即使没有 findings（安全的 skill）
    const result = {
      skillName,
      skillDir,
      findings,
      status: findings.length > 0 ? 'risky' : 'safe'
    };
    results.push(result);

    // 立即报告这个 skill 的扫描结果
    if (onSkillScanned) {
      onSkillScanned(result);
    }
  }

  return results;
}
