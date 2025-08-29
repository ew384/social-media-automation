import { Platform } from '../types';

// 生成随机ID
export function generateId(): string {
  return Math.random().toString(36).substr(2, 9);
}

// 格式化日期
export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
}

// 平台图标获取
export function getPlatformIcon(platform: Platform): string {
  const icons = {
    douyin: '🎵',
    kuaishou: '⚡',
    xiaohongshu: '📝',
    wechat: '💬'
  };
  return icons[platform] || '❓';
}

// 延迟函数 - 修复 setTimeout 类型问题
export function delay(ms: number): Promise<void> {
  return new Promise<void>(resolve => {
    if (typeof setTimeout !== 'undefined') {
      setTimeout(resolve, ms);
    } else {
      // 在某些环境中 setTimeout 可能不可用
      resolve();
    }
  });
}

// 文件大小格式化
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// 截取文本
export function truncateText(text: string, length: number): string {
  if (text.length <= length) return text;
  return text.substring(0, length) + '...';
}
