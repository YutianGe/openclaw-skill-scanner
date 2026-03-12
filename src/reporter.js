import chalk from 'chalk';

export function printReport(results) {
  if (results.length === 0) {
    console.log(chalk.green('✅ 未发现有命中规则的 Skills。'));
    return;
  }

  for (const skill of results) {
    const highCount = skill.findings.filter(f => f.severity === 'high').length;
    const mediumCount = skill.findings.filter(f => f.severity === 'medium').length;

    const headerColor =
      highCount > 0 ? chalk.redBright :
      mediumCount > 0 ? chalk.yellowBright :
      chalk.white;

    console.log(
      headerColor(
        `\n[Skill] ${skill.skillName}  (高危: ${highCount}, 中危: ${mediumCount})`,
      ),
    );
    console.log(chalk.gray(`  目录: ${skill.skillDir}`));

    for (const f of skill.findings) {
      const color = f.severity === 'high' ? chalk.red : chalk.yellow;
      console.log(
        color(
          `  - [${f.severity.toUpperCase()}] ${f.ruleId}: ${f.description}`,
        ),
      );
      console.log(
        chalk.gray(
          `      at ${f.file}:${f.line} → ${f.snippet}`,
        ),
      );
      if (f.remediation) {
        console.log(
          chalk.cyan(
            `      修复建议: ${f.remediation}`,
          ),
        );
      }
    }
  }
}

export function toJson(results) {
  return JSON.stringify(results, null, 2);
}
