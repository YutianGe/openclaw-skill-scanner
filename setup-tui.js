import fs from 'fs';
import path from 'path';

// 1. 更新 package.json 的 bin 字段
const pkgPath = './package.json';
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
pkg.bin = pkg.bin || {};
pkg.bin['claw-skill-scan'] = './bin/claw-skill-scan.js';
pkg.bin['claw-skill-scan-tui'] = './bin/claw-skill-scan-tui.js';
fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2));

// 2. 确保目录存在
fs.mkdirSync('./bin', { recursive: true });
fs.mkdirSync('./src/tui/screens', { recursive: true });

// 3. 写入 bin/claw-skill-scan-tui.js
fs.writeFileSync(
  './bin/claw-skill-scan-tui.js',
`#!/usr/bin/env node

import React from 'react';
import { render } from 'ink';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import App from '../src/tui/App.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const skillsRoot =
  process.env.OPENCLAW_SKILLS_ROOT ||
  path.join(process.env.HOME || '', '.agents', 'skills');

render(
  <App
    skillsRoot={skillsRoot}
    projectRoot={path.join(__dirname, '..')}
  />,
);
`
);

// 4. 写入 src/tui/App.js
fs.writeFileSync(
  './src/tui/App.js',
`import React, { useState } from 'react';
import { Box, Text, useApp, useInput } from 'ink';
import { loadConfig } from '../config.js';
import { scanSkills } from '../scanner.js';
import MainMenu from './screens/MainMenu.js';
import SkillList from './screens/SkillList.js';
import SkillDetail from './screens/SkillDetail.js';

export default function App({ skillsRoot, projectRoot }) {
  const { exit } = useApp();
  const [screen, setScreen] = useState('menu');
  const [loading, setLoading] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [selectedSkill, setSelectedSkill] = useState(null);
  const [error, setError] = useState(null);

  const rulesConfig = loadConfig(projectRoot);

  async function runScan() {
    try {
      setLoading(true);
      setError(null);
      const results = await scanSkills(skillsRoot, {
        rulesConfig,
        projectRoot,
      });
      setScanResult(results);
      setScreen('highRiskList');
    } catch (e) {
      setError(e.message || String(e));
      setScreen('menu');
    } finally {
      setLoading(false);
    }
  }

  useInput((input, key) => {
    if (key.escape || input === 'q' || input === 'Q') {
      exit();
    }
  });

  if (loading) {
    return (
      <Box flexDirection="column">
        <Text>正在扫描 skills，请稍候...</Text>
      </Box>
    );
  }

  if (error) {
    return (
      <Box flexDirection="column">
        <Text color="red">发生错误：{error}</Text>
        <Text>按任意键退出。</Text>
      </Box>
    );
  }

  if (!scanResult && screen !== 'menu') {
    setScreen('menu');
  }

  if (screen === 'menu') {
    return (
      <MainMenu
        hasReport={!!scanResult}
        onScan={runScan}
        onViewHighRisks={() => setScreen('highRiskList')}
      />
    );
  }

  if (screen === 'highRiskList') {
    return (
      <SkillList
        scanResult={scanResult || []}
        onBack={() => setScreen('menu')}
        onSelectSkill={skill => {
          setSelectedSkill(skill);
          setScreen('skillDetail');
        }}
      />
    );
  }

  if (screen === 'skillDetail') {
    return (
      <SkillDetail
        skill={selectedSkill}
        onBack={() => setScreen('highRiskList')}
      />
    );
  }

  return (
    <Box>
      <Text>未知界面</Text>
    </Box>
  );
}
`
);

// 5. 写入 src/tui/screens/MainMenu.js
fs.writeFileSync(
  './src/tui/screens/MainMenu.js',
`import React from 'react';
import { Box, Text, useInput } from 'ink';

export default function MainMenu({ hasReport, onScan, onViewHighRisks }) {
  useInput((input) => {
    if (input === '1') {
      onScan();
    }
    if (input === '2' && hasReport) {
      onViewHighRisks();
    }
  });

  return (
    <Box flexDirection="column">
      <Text>Skill Scanner TUI v0.1.0</Text>
      <Text>──────────────────────────────</Text>
      <Text> [1] 扫描所有 Skills</Text>
      <Text color={hasReport ? 'white' : 'gray'}>
        {hasReport ? ' [2] 查看高危 Skills 列表' : ' [2] 查看高危 Skills 列表（暂无扫描结果）'}
      </Text>
      <Text> [Q] 退出</Text>
      <Box marginTop={1}>
        <Text>直接按数字键选择操作：</Text>
      </Box>
    </Box>
  );
}
`
);

// 6. 写入 src/tui/screens/SkillList.js
fs.writeFileSync(
  './src/tui/screens/SkillList.js',
`import React, { useMemo, useState } from 'react';
import { Box, Text, useInput } from 'ink';

export default function SkillList({ scanResult, onBack, onSelectSkill }) {
  const highRiskSkills = useMemo(() => {
    if (!Array.isArray(scanResult)) return [];
    return scanResult
      .map(s => {
        const highCount = s.findings.filter(f => f.severity === 'high').length;
        const mediumCount = s.findings.filter(f => f.severity === 'medium').length;
        return { ...s, highCount, mediumCount };
      })
      .filter(s => s.highCount > 0)
      .sort((a, b) => b.highCount - a.highCount || b.mediumCount - a.mediumCount);
  }, [scanResult]);

  const [index, setIndex] = useState(0);

  useInput((input, key) => {
    if (key.upArrow) {
      setIndex(i => (i <= 0 ? Math.max(highRiskSkills.length - 1, 0) : i - 1));
    }
    if (key.downArrow) {
      setIndex(i => (i >= highRiskSkills.length - 1 ? 0 : i + 1));
    }
    if (input === 'b' || input === 'B') {
      onBack();
    }
    if (key.return) {
      const skill = highRiskSkills[index];
      if (skill) onSelectSkill(skill);
    }
  });

  return (
    <Box flexDirection="column">
      <Text>高危 Skills 列表（↑↓ 选择，Enter 查看详情，B 返回）</Text>
      <Text>──────────────────────────────────</Text>
      {highRiskSkills.length === 0 ? (
        <Text color="green">当前扫描结果中没有高危 skill。</Text>
      ) : (
        highRiskSkills.map((s, i) => {
          const isSelected = i === index;
          const prefix = isSelected ? '>' : ' ';
          return (
            <Text key={s.skillName} color={isSelected ? 'cyan' : 'white'}>
              {prefix} {s.skillName.padEnd(25)} 高危: {s.highCount}  中危: {s.mediumCount}
            </Text>
          );
        })
      )}
      <Box marginTop={1}>
        <Text>提示：按 Enter 查看选中 skill 的详细问题和修复建议。</Text>
      </Box>
    </Box>
  );
}
`
);

// 7. 写入 src/tui/screens/SkillDetail.js
fs.writeFileSync(
  './src/tui/screens/SkillDetail.js',
`import React, { useMemo } from 'react';
import { Box, Text, useInput } from 'ink';

export default function SkillDetail({ skill, onBack }) {
  useInput((input) => {
    if (input === 'b' || input === 'B') {
      onBack();
    }
  });

  const highFindings = useMemo(() => {
    if (!skill) return [];
    return skill.findings.filter(f => f.severity === 'high');
  }, [skill]);

  const mediumFindings = useMemo(() => {
    if (!skill) return [];
    return skill.findings.filter(f => f.severity === 'medium');
  }, [skill]);

  if (!skill) {
    return (
      <Box flexDirection="column">
        <Text>未选中任何 skill。</Text>
        <Text>按 B 返回。</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column">
      <Text>
        Skill: <Text color="cyan">{skill.skillName}</Text>
      </Text>
      <Text color="gray">目录: {skill.skillDir}</Text>
      <Text>──────────────────────────────────</Text>

      <Text color="redBright">高危问题：</Text>
      {highFindings.length === 0 && <Text color="green">  无高危问题。</Text>}
      {highFindings.map((f, idx) => (
        <Box key={`${f.file}-${f.line}-${idx}`} flexDirection="column" marginTop={0}>
          <Text color="red">  - {f.ruleId}</Text>
          <Text color="white">    描述: {f.description}</Text>
          <Text color="gray">    位置: {f.file}:{f.line}</Text>
          <Text color="yellow">    片段: {f.snippet}</Text>
          {f.remediation && (
            <Text color="cyan">    修复建议: {f.remediation}</Text>
          )}
        </Box>
      ))}

      <Box marginTop={1} />

      <Text color="yellowBright">中危问题（节选）：</Text>
      {mediumFindings.length === 0 && <Text color="green">  无中危问题。</Text>}
      {mediumFindings.slice(0, 5).map((f, idx) => (
        <Box key={`${f.file}-${f.line}-m-${idx}`} flexDirection="column" marginTop={0}>
          <Text color="yellow">  - {f.ruleId}</Text>
          <Text color="white">    描述: {f.description}</Text>
          <Text color="gray">    位置: {f.file}:{f.line}</Text>
          {f.remediation && (
            <Text color="cyan">    修复建议: {f.remediation}</Text>
          )}
        </Box>
      ))}
      {mediumFindings.length > 5 && (
        <Text color="gray">  ... 共 {mediumFindings.length} 条中危，仅展示前 5 条。</Text>
      )}

      <Box marginTop={1}>
        <Text>按 B 返回高危列表；按 Q/ESC 退出程序。</Text>
      </Box>
    </Box>
  );
}
`
);

console.log('setup-tui.js 执行完成：TUI 相关文件已写入。');
