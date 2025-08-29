import { contextBridge, ipcRenderer } from 'electron';

// 暴露安全的 API 给渲染进程
contextBridge.exposeInMainWorld('electronAPI', {
  // 将来可以添加主进程通信方法
  sendMessage: (channel: string, data: any) => {
    ipcRenderer.send(channel, data);
  },
  
  onMessage: (channel: string, callback: (data: any) => void) => {
    ipcRenderer.on(channel, (event, data) => callback(data));
  },

  // 获取应用版本等信息
  getAppInfo: () => {
    return {
      version: process.env.npm_package_version || '1.0.0',
      name: '自媒体自动化运营系统'
    };
  }
});
