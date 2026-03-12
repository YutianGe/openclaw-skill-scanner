#!/usr/bin/env node

import { Command } from 'commander';
import path from 'path';
import { fileURLToPath } from 'url';
import { runScanner } from '../src/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const program = new Command();

program
  .name('claw-skill-scan')
  .description('Scan OpenClaw skills for potential security risks')
  .argument('[rootDir]', 'skills 根目录', '')
  .option('--json', '以 JSON 格式输出结果', false)
  .option('--delete <skillName>', '隔离指定 skill（移动到 quarantine 目录）')
  .option('--disable <skillName>', '在指定 skill 目录创建 DISABLED 标记文件')
  .option(
    '--quarantine-dir <dir>',
    '隔离目录（默认在当前目录 .skill-quarantine）',
  )
  .action(async (rootDirArg, opts) => {
    const rootDir =
      rootDirArg ||
      process.env.OPENCLAW_SKILLS_ROOT ||
      path.join(process.env.HOME || '', '.agents', 'skills');

    await runScanner({
      rootDir,
      json: opts.json,
      deleteSkill: opts.delete || null,
      disableSkillName: opts.disable || null,
      quarantineDir: opts.quarantineDir || undefined,
    });
  });

program.parse(process.argv);
