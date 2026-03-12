import path from 'path';
import { fileURLToPath } from 'url';
import { scanSkills } from './scanner.js';
import { printReport, toJson } from './reporter.js';
import { quarantineSkill, disableSkill } from './actions.js';
import { loadConfig } from './config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function runScanner(options) {
  const {
    rootDir,
    json,
    deleteSkill,
    disableSkillName,
    quarantineDir = path.join(process.cwd(), '.skill-quarantine'),
  } = options;

  const rulesConfig = loadConfig(path.resolve(__dirname, '..'));

  const results = await scanSkills(rootDir, { rulesConfig, projectRoot: path.resolve(__dirname, '..') });

  if (json) {
    console.log(toJson(results));
  } else {
    printReport(results);
  }

  if (deleteSkill) {
    const target = results.find(r => r.skillName === deleteSkill);
    if (!target) {
      console.error(`未在扫描结果中找到 skill: ${deleteSkill}`);
    } else {
      const moved = quarantineSkill(target.skillDir, quarantineDir);
      console.log(`已隔离 skill ${deleteSkill} → ${moved}`);
    }
  }

  if (disableSkillName) {
    const target = results.find(r => r.skillName === disableSkillName);
    if (!target) {
      console.error(`未在扫描结果中找到 skill: ${disableSkillName}`);
    } else {
      const markFile = disableSkill(target.skillDir);
      console.log(`已在 ${disableSkillName} 目录下创建 DISABLED 标记文件 → ${markFile}`);
    }
  }
}
