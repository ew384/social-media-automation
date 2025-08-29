// src/utils/pathService.js
class PathService {
  constructor() {
    this.paths = null;
    this.initialized = false;
    this.initializing = false; // 🔥 新增：防止重复初始化
    this.initPromise = null;   // 🔥 新增：保存初始化Promise
  }

  // 🔥 确保初始化完成的方法
  async ensureInitialized() {
    if (this.initialized && this.paths) {
      return this.paths;
    }

    if (this.initializing && this.initPromise) {
      // 如果正在初始化，等待完成
      return await this.initPromise;
    }

    // 开始初始化
    this.initializing = true;
    this.initPromise = this.initialize();
    
    try {
      const result = await this.initPromise;
      return result;
    } finally {
      this.initializing = false;
      this.initPromise = null;
    }
  }

  // 🔥 修改现有的initialize方法
  async initialize() {
    try {
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:3409";
      const response = await fetch(`${apiBaseUrl}/getPaths`);
      const result = await response.json();

      if (result.code === 200) {
        this.paths = result.data;
        this.initialized = true;
        console.log('📂 路径服务初始化成功:', this.paths);
        return this.paths;
      } else {
        throw new Error(result.msg || '获取路径失败');
      }
    } catch (error) {
      console.error('❌ 路径服务初始化失败:', error);
      // 🔥 降级方案：使用默认路径
      this.paths = this.getDefaultPaths();
      this.initialized = true; // 🔥 即使是默认路径也标记为已初始化
      return this.paths;
    }
  }

  // 🔥 修改获取方法，确保初始化
  async getVideoLocalUrl(filename) {
    await this.ensureInitialized();
    if (!this.paths) {
      console.warn('路径服务初始化失败，返回null');
      return null;
    }
    return `${this.paths.videoFileUrl}/${filename}`;
  }

  async getCoverLocalUrl(filename) {
    await this.ensureInitialized();
    if (!this.paths) {
      console.warn('路径服务初始化失败，返回null');
      return null;
    }
    const posterFilename = filename.replace(/\.[^/.]+$/, '_cover.jpg');
    return `${this.paths.coversFileUrl}/${posterFilename}`;
  }

  // 🔥 同步方法改为异步
  async getVideoDir() {
    await this.ensureInitialized();
    return this.paths?.videoDir || null;
  }

  async getCoversDir() {
    await this.ensureInitialized();
    return this.paths?.coversDir || null;
  }

  // 降级方案保持不变
  getDefaultPaths() {
    const os = navigator.platform || navigator.userAgent;
    let baseDir;

    if (os.includes('Mac')) {
      baseDir = `/Users/${process.env.USER || 'user'}/Library/Application Support/multi-account-browser`;
    } else if (os.includes('Win')) {
      baseDir = `%USERPROFILE%\\AppData\\Roaming\\multi-account-browser`;
    } else {
      baseDir = `~/.config/multi-account-browser`;
    }

    return {
      baseDir,
      videoDir: `${baseDir}/videoFile`,
      coversDir: `${baseDir}/videoFile/covers`,
      videoFileUrl: `file://${baseDir}/videoFile`,
      coversFileUrl: `file://${baseDir}/videoFile/covers`
    };
  }
}

export const pathService = new PathService();