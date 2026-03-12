import React, { useState } from 'react';
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
    return React.createElement(
      Box,
      { flexDirection: 'column' },
      React.createElement(Text, null, '正在扫描 skills，请稍候...'),
    );
  }

  if (error) {
    return React.createElement(
      Box,
      { flexDirection: 'column' },
      React.createElement(Text, { color: 'red' }, `发生错误：${error}`),
      React.createElement(Text, null, '按任意键退出。'),
    );
  }

  if (!scanResult && screen !== 'menu') {
    setScreen('menu');
  }

  if (screen === 'menu') {
    return React.createElement(MainMenu, {
      hasReport: !!scanResult,
      onScan: runScan,
      onViewHighRisks: () => setScreen('highRiskList'),
    });
  }

  if (screen === 'highRiskList') {
    return React.createElement(SkillList, {
      scanResult: scanResult || [],
      onBack: () => setScreen('menu'),
      onSelectSkill: (skill) => {
        setSelectedSkill(skill);
        setScreen('skillDetail');
      },
    });
  }

  if (screen === 'skillDetail') {
    return React.createElement(SkillDetail, {
      skill: selectedSkill,
      onBack: () => setScreen('highRiskList'),
    });
  }

  return React.createElement(
    Box,
    null,
    React.createElement(Text, null, '未知界面'),
  );
}
