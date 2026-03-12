import fs from 'fs';
import path from 'path';
import YAML from 'yaml';

export function loadConfig(projectRoot) {
  const configPath = path.join(projectRoot, 'rules.config.yml');
  const ignorePath = path.join(projectRoot, '.skillscanignore');

  let config = null;
  if (fs.existsSync(configPath)) {
    const raw = fs.readFileSync(configPath, 'utf8');
    config = YAML.parse(raw);
  }

  let ignorePatterns = [];
  if (fs.existsSync(ignorePath)) {
    const raw = fs.readFileSync(ignorePath, 'utf8');
    ignorePatterns = raw
      .split('\n')
      .map(l => l.trim())
      .filter(l => l && !l.startsWith('#'));
  }

  return {
    rules: config?.rules || null,
    whitelistDomains: config?.whitelist_domains || [],
    ignorePatterns,
    enableLLM: config?.enable_llm_analysis !== undefined ? config.enable_llm_analysis : true,
    llmConfidenceThreshold: config?.llm_confidence_threshold || 0.85,
    llmMaxTokens: config?.llm_max_tokens || 2048,
  };
}

export function extractDomain(url) {
  try {
    const u = new URL(url);
    return u.hostname;
  } catch {
    return null;
  }
}

export function shouldIgnore(filePath, projectRoot, ignorePatterns) {
  if (!ignorePatterns || ignorePatterns.length === 0) return false;
  const rel = path.relative(projectRoot, filePath);
  return ignorePatterns.some(pattern => {
    // 简单处理 **/node_modules/** 这种模式
    if (pattern.startsWith('**/')) {
      const sub = pattern.replace('**/', '');
      return rel.includes(sub.replace('/**', ''));
    }
    return false;
  });
}

export function saveWhitelist(projectRoot, domains) {
  const configPath = path.join(projectRoot, 'rules.config.yml');
  let config = { whitelist_domains: [], rules: [] };

  if (fs.existsSync(configPath)) {
    const raw = fs.readFileSync(configPath, 'utf8');
    config = YAML.parse(raw) || config;
  }

  config.whitelist_domains = domains;
  fs.writeFileSync(configPath, YAML.stringify(config), 'utf8');
}

export function addWhitelistDomain(projectRoot, domain) {
  const config = loadConfig(projectRoot);
  if (!config.whitelistDomains.includes(domain)) {
    config.whitelistDomains.push(domain);
    saveWhitelist(projectRoot, config.whitelistDomains);
  }
  return config.whitelistDomains;
}

export function removeWhitelistDomain(projectRoot, domain) {
  const config = loadConfig(projectRoot);
  const filtered = config.whitelistDomains.filter(d => d !== domain);
  saveWhitelist(projectRoot, filtered);
  return filtered;
}
