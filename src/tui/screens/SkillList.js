import React, { useMemo, useState } from 'react';
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

  return React.createElement(
    Box,
    { flexDirection: 'column' },
    React.createElement(Text, null, '高危 Skills 列表（↑↓ 选择，Enter 查看详情，B 返回）'),
    React.createElement(Text, null, '──────────────────────────────────'),
    highRiskSkills.length === 0
      ? React.createElement(Text, { color: 'green' }, '当前扫描结果中没有高危 skill。')
      : highRiskSkills.map((s, i) => {
          const isSelected = i === index;
          const prefix = isSelected ? '>' : ' ';
          return React.createElement(
            Text,
            { key: s.skillName, color: isSelected ? 'cyan' : 'white' },
            `${prefix} ${s.skillName.padEnd(25)} 高危: ${s.highCount}  中危: ${s.mediumCount}`,
          );
        }),
    React.createElement(
      Box,
      { marginTop: 1 },
      React.createElement(Text, null, '提示：按 Enter 查看选中 skill 的详细问题和修复建议。'),
    ),
  );
}
