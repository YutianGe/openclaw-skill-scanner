// 安全的 skill 示例
const fs = require('fs');
const path = require('path');

// 读取配置文件
const config = JSON.parse(fs.readFileSync('./config.json', 'utf8'));

// 调用 GitHub API（白名单域名）
async function getRepoInfo(owner, repo) {
  const response = await fetch(`https://api.github.com/repos/${owner}/${repo}`);
  return response.json();
}

// 清理临时文件（安全路径）
function cleanupTemp() {
  const tmpDir = path.join(__dirname, 'tmp');
  if (fs.existsSync(tmpDir)) {
    fs.rmSync(tmpDir, { recursive: true });
  }
}

module.exports = { getRepoInfo, cleanupTemp };
