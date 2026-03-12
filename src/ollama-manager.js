/**
 * Ollama 管理器 - 负责检测、安装、启动 Ollama
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import os from 'os';
import fs from 'fs';
import path from 'path';

const execAsync = promisify(exec);

/**
 * 检查 Ollama 是否可用
 */
export async function checkOllamaAvailability() {
  try {
    const response = await fetch('http://localhost:11434/api/tags', {
      signal: AbortSignal.timeout(2000)
    });
    return response.ok;
  } catch (error) {
    return false;
  }
}

/**
 * 检查 Ollama 是否已安装
 */
export async function checkOllamaInstalled() {
  try {
    const { stdout } = await execAsync('ollama --version');
    return stdout.includes('ollama version');
  } catch (error) {
    return false;
  }
}

/**
 * 检查模型是否已下载
 */
export async function checkModelDownloaded(modelName = 'llama3.2:3b') {
  try {
    const { stdout } = await execAsync('ollama list');
    return stdout.includes(modelName);
  } catch (error) {
    return false;
  }
}

/**
 * 安装 Ollama
 */
export async function installOllama() {
  const platform = os.platform();

  try {
    // 检查是否已安装
    const isInstalled = await checkOllamaInstalled();
    if (isInstalled) {
      return {
        success: true,
        message: 'Ollama 已安装',
        alreadyInstalled: true
      };
    }

    console.log('🔄 开始安装 Ollama...');

    if (platform === 'win32') {
      // Windows: 提供手动安装指引
      return {
        success: false,
        message: '请手动安装 Ollama',
        instructions: '1. 访问 https://ollama.ai/download\n2. 下载 Windows 安装程序\n3. 运行安装程序\n4. 安装完成后刷新页面',
        downloadUrl: 'https://ollama.ai/download',
        needsManualInstall: true
      };
    } else if (platform === 'darwin') {
      // macOS: 使用 brew 或下载 dmg
      try {
        console.log('📥 使用 Homebrew 安装 Ollama...');
        await execAsync('brew install ollama');
        return {
          success: true,
          message: 'Ollama 安装完成'
        };
      } catch (error) {
        return {
          success: false,
          message: '请手动安装 Ollama: https://ollama.ai/download',
          error: error.message
        };
      }
    } else if (platform === 'linux') {
      // Linux: 使用官方安装脚本
      console.log('📥 使用官方脚本安装 Ollama...');
      await execAsync('curl -fsSL https://ollama.ai/install.sh | sh');
      return {
        success: true,
        message: 'Ollama 安装完成'
      };
    } else {
      return {
        success: false,
        message: `不支持的平台: ${platform}`,
        error: 'Unsupported platform'
      };
    }
  } catch (error) {
    return {
      success: false,
      message: '安装失败',
      error: error.message
    };
  }
}

/**
 * 下载模型
 */
export async function downloadModel(modelName = 'llama3.2:3b') {
  try {
    // 检查模型是否已下载
    const isDownloaded = await checkModelDownloaded(modelName);
    if (isDownloaded) {
      return {
        success: true,
        message: `模型 ${modelName} 已下载`,
        alreadyDownloaded: true
      };
    }

    console.log(`🔄 开始下载模型 ${modelName}...`);
    console.log('⏳ 这可能需要几分钟时间，请耐心等待...');

    // 执行下载命令
    const { stdout, stderr } = await execAsync(`ollama pull ${modelName}`, {
      maxBuffer: 1024 * 1024 * 10 // 10MB buffer
    });

    console.log('✅ 模型下载完成');

    return {
      success: true,
      message: `模型 ${modelName} 下载完成`,
      output: stdout
    };
  } catch (error) {
    return {
      success: false,
      message: '模型下载失败',
      error: error.message
    };
  }
}

/**
 * 启动 Ollama 服务
 */
export async function startOllama() {
  try {
    // 检查是否已经在运行
    const isRunning = await checkOllamaAvailability();
    if (isRunning) {
      return {
        success: true,
        message: 'Ollama 服务已在运行',
        alreadyRunning: true
      };
    }

    // 检查是否已安装
    const isInstalled = await checkOllamaInstalled();
    if (!isInstalled) {
      return {
        success: false,
        message: 'Ollama 未安装，请先安装',
        needsInstall: true
      };
    }

    console.log('🚀 启动 Ollama 服务...');

    const platform = os.platform();

    if (platform === 'win32') {
      // Windows: 启动服务
      exec('ollama serve', { detached: true, stdio: 'ignore' });
    } else {
      // macOS/Linux: 后台启动
      exec('nohup ollama serve > /dev/null 2>&1 &', { detached: true, stdio: 'ignore' });
    }

    // 等待服务启动
    await new Promise(resolve => setTimeout(resolve, 3000));

    // 验证服务是否启动成功
    const isNowRunning = await checkOllamaAvailability();

    if (isNowRunning) {
      // 检查模型是否已下载
      const modelDownloaded = await checkModelDownloaded('llama3.2:3b');

      if (!modelDownloaded) {
        console.log('📥 检测到模型未下载，开始下载...');
        const downloadResult = await downloadModel('llama3.2:3b');

        return {
          success: true,
          message: 'Ollama 服务已启动',
          modelDownload: downloadResult
        };
      }

      return {
        success: true,
        message: 'Ollama 服务已启动'
      };
    } else {
      return {
        success: false,
        message: 'Ollama 服务启动失败，请手动启动: ollama serve'
      };
    }
  } catch (error) {
    return {
      success: false,
      message: 'Ollama 服务启动失败',
      error: error.message
    };
  }
}

/**
 * 停止 Ollama 服务
 */
export async function stopOllama() {
  try {
    const platform = os.platform();

    if (platform === 'win32') {
      await execAsync('taskkill /F /IM ollama.exe');
    } else {
      await execAsync('pkill -f "ollama serve"');
    }

    return {
      success: true,
      message: 'Ollama 服务已停止'
    };
  } catch (error) {
    return {
      success: false,
      message: 'Ollama 服务停止失败',
      error: error.message
    };
  }
}

/**
 * 获取 Ollama 完整状态
 */
export async function getOllamaStatus() {
  const isRunning = await checkOllamaAvailability();
  const isInstalled = await checkOllamaInstalled();
  const modelDownloaded = await checkModelDownloaded('llama3.2:3b');

  return {
    installed: isInstalled,
    running: isRunning,
    modelDownloaded: modelDownloaded,
    model: 'llama3.2:3b',
    status: isRunning ? 'running' : (isInstalled ? 'stopped' : 'not_installed')
  };
}
