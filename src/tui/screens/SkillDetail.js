import React, { useMemo } from 'react';
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
    return React.createElement(
      Box,
      { flexDirection: 'column' },
      React.createElement(Text, null, '未选中任何 skill。'),
      React.createElement(Text, null, '按 B 返回。'),
    );
  }

  return React.createElement(
    Box,
    { flexDirection: 'column' },
    React.createElement(
      Text,
      null,
      'Skill: ',
      React.createElement(Text, { color: 'cyan' }, skill.skillName),
    ),
    React.createElement(Text, { color: 'gray' }, `目录: ${skill.skillDir}`),
    React.createElement(Text, null, '──────────────────────────────────'),

    React.createElement(Text, { color: 'redBright' }, '高危问题：'),
    highFindings.length === 0
      ? React.createElement(Text, { color: 'green' }, '  无高危问题。')
      : highFindings.map((f, idx) =>
          React.createElement(
            Box,
            {
              key: `${f.file}-${f.line}-${idx}`,
              flexDirection: 'column',
              marginTop: 0,
            },
            React.createElement(Text, { color: 'red' }, `  - ${f.ruleId}`),
            React.createElement(
              Text,
              { color: 'white' },
              `    描述: ${f.description}`,
            ),
            React.createElement(
              Text,
              { color: 'gray' },
              `    位置: ${f.file}:${f.line}`,
            ),
            React.createElement(
              Text,
              { color: 'yellow' },
              `    片段: ${f.snippet}`,
            ),
            f.remediation
              ? React.createElement(
                  Text,
                  { color: 'cyan' },
                  `    修复建议: ${f.remediation}`,
                )
              : null,
          ),
        ),

    React.createElement(Box, { marginTop: 1 }),

    React.createElement(Text, { color: 'yellowBright' }, '中危问题（节选）：'),
    mediumFindings.length === 0
      ? React.createElement(Text, { color: 'green' }, '  无中危问题。')
      : mediumFindings.slice(0, 5).map((f, idx) =>
          React.createElement(
            Box,
            {
              key: `${f.file}-${f.line}-m-${idx}`,
              flexDirection: 'column',
              marginTop: 0,
            },
            React.createElement(Text, { color: 'yellow' }, `  - ${f.ruleId}`),
            React.createElement(
              Text,
              { color: 'white' },
              `    描述: ${f.description}`,
            ),
            React.createElement(
              Text,
              { color: 'gray' },
              `    位置: ${f.file}:${f.line}`,
            ),
            f.remediation
              ? React.createElement(
                  Text,
                  { color: 'cyan' },
                  `    修复建议: ${f.remediation}`,
                )
              : null,
          ),
        ),
    mediumFindings.length > 5
      ? React.createElement(
          Text,
          { color: 'gray' },
          `  ... 共 ${mediumFindings.length} 条中危，仅展示前 5 条。`,
        )
      : null,

    React.createElement(
      Box,
      { marginTop: 1 },
      React.createElement(
        Text,
        null,
        '按 B 返回高危列表；按 Q/ESC 退出程序。',
      ),
    ),
  );
}
