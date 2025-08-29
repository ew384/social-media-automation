import { app, BrowserWindow, ipcMain } from 'electron';
import { spawn, ChildProcess } from 'child_process';
import path from 'path';

class ApplicationLauncher {
  private backendProcess: ChildProcess | null = null;
  private mainWindow: BrowserWindow | null = null;

  constructor() {
    // 当 Electron 准备就绪时初始化
    app.whenReady().then(() => this.initialize());
    
    // 当所有窗口关闭时退出应用
    app.on('window-all-closed', () => {
      this.cleanup();
      if (process.platform !== 'darwin') {
        app.quit();
      }
    });

    // macOS 特定：点击 dock 图标时重新创建窗口
    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        this.createMainWindow();
      }
    });
  }

  async initialize() {
    console.log('🚀 启动应用程序...');

    try {
      // TODO: 将来可以添加 License 检查
      // const licenseValid = await this.checkLicense();
      // if (!licenseValid) {
      //   this.showLicenseDialog();
      //   return;
      // }

      // 1. 启动后端服务
      await this.startBackend();

      // 2. 等待后端启动
      await this.waitForBackend();

      // 3. 创建主窗口
      this.createMainWindow();

    } catch (error) {
      console.error('❌ 启动失败:', error);
      app.quit();
    }
  }

  private async startBackend() {
    console.log('🖥️ 启动后端服务...');

    const backendPath = path.join(__dirname, '../backend/main/main.js');
    
    // 检查后端文件是否存在
    const fs = require('fs');
    if (!fs.existsSync(backendPath)) {
      console.warn(`⚠️ 后端文件不存在: ${backendPath}`);
      console.log('在开发模式下，后端可能需要单独启动');
      return;
    }

    this.backendProcess = spawn('node', [backendPath], {
      stdio: 'inherit',
      env: { ...process.env, NODE_ENV: 'production' }
    });

    this.backendProcess.on('error', (error) => {
      console.error('❌ 后端启动失败:', error);
    });

    this.backendProcess.on('exit', (code) => {
      console.log(`后端进程退出，代码: ${code}`);
      if (code !== 0) {
        console.error('❌ 后端异常退出');
      }
    });
  }

  private async waitForBackend(timeout = 5000) {
    console.log('⏳ 等待后端服务启动...');
    
    return new Promise<void>((resolve) => {
      // 简单等待，实际项目中可以添加健康检查
      setTimeout(() => {
        console.log('✅ 后端服务准备就绪');
        resolve();
      }, 2000);
    });
  }

  private createMainWindow() {
    console.log('🖼️ 创建主窗口...');

    this.mainWindow = new BrowserWindow({
      width: 1200,
      height: 800,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        // preload: path.join(__dirname, 'preload.js') // 如果需要预加载脚本
      },
      title: '自媒体自动化运营系统',
      icon: path.join(__dirname, '../resources/icon.png') // 如果有图标文件
    });

    // 加载前端页面
    const frontendPath = path.join(__dirname, '../frontend/index.html');
    const fs = require('fs');
    
    if (fs.existsSync(frontendPath)) {
      console.log(`📱 加载前端页面: ${frontendPath}`);
      this.mainWindow.loadFile(frontendPath).catch(error => {
        console.error('❌ 加载前端页面失败:', error);
        this.loadDevelopmentUrl();
      });
    } else {
      console.log('⚠️ 前端构建文件不存在，尝试连接开发服务器');
      this.loadDevelopmentUrl();
    }

    // 开发模式下打开开发者工具
    if (process.env.NODE_ENV === 'development') {
      this.mainWindow.webContents.openDevTools();
    }

    this.mainWindow.on('closed', () => {
      this.mainWindow = null;
    });
  }

  private loadDevelopmentUrl() {
    if (this.mainWindow) {
      console.log('🔗 连接到开发服务器 http://localhost:5173');
      this.mainWindow.loadURL('http://localhost:5173').catch(error => {
        console.error('❌ 连接开发服务器失败:', error);
      });
    }
  }

  // TODO: 将来实现 License 检查
  // private async checkLicense(): Promise<boolean> {
  //   // 这里将来实现 License 验证逻辑
  //   return true;
  // }

  // TODO: 将来实现 License 对话框
  // private showLicenseDialog() {
  //   // 显示 License 激活对话框
  // }

  cleanup() {
    console.log('🧹 清理资源...');
    
    if (this.backendProcess) {
      console.log('⏹️ 停止后端服务...');
      this.backendProcess.kill('SIGTERM');
      this.backendProcess = null;
    }
  }
}

// 处理未捕获的异常
process.on('uncaughtException', (error) => {
  console.error('未捕获的异常:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('未处理的 Promise 拒绝:', reason);
});

// 创建应用实例
new ApplicationLauncher();
