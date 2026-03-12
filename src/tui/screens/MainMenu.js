import React from 'react';
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

  return React.createElement(
    Box,
    { flexDirection: 'column' },
    React.createElement(Text, null, 'Skill Scanner TUI v0.1.0'),
    React.createElement(Text, null, '──────────────────────────────'),
    React.createElement(Text, null, ' [1] 扫描所有 Skills'),
    React.createElement(
      Text,
      { color: hasReport ? 'white' : 'gray' },
      hasReport
        ? ' [2] 查看高危 Skills 列表'
        : ' [2] 查看高危 Skills 列表（暂无扫描结果）',
    ),
    React.createElement(Text, null, ' [Q] 退出'),
    React.createElement(
      Box,
      { marginTop: 1 },
      React.createElement(Text, null, '直接按数字键选择操作：'),
    ),
  );
}
