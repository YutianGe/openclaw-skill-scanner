import fs from 'fs';
import path from 'path';

export function quarantineSkill(skillDir, quarantineRoot) {
  if (!fs.existsSync(quarantineRoot)) {
    fs.mkdirSync(quarantineRoot, { recursive: true });
  }
  const skillName = path.basename(skillDir);
  const targetDir = path.join(quarantineRoot, skillName);

  fs.renameSync(skillDir, targetDir);
  return targetDir;
}

export function disableSkill(skillDir) {
  const markFile = path.join(skillDir, 'DISABLED');
  fs.writeFileSync(
    markFile,
    'This skill has been disabled by openclaw-skill-scanner.\n',
  );
  return markFile;
}
