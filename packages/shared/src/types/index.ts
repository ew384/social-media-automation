// 平台类型
export type Platform = 'douyin' | 'kuaishou' | 'xiaohongshu' | 'wechat';

// 账户信息
export interface Account {
  id: string;
  platform: Platform;
  username: string;
  nickname?: string;
  avatar?: string;
  status: 'active' | 'inactive' | 'banned';
  cookies?: string;
  loginTime?: Date;
  lastSyncTime?: Date;
}

// 发布记录
export interface PublishRecord {
  id: string;
  accountId: string;
  platform: Platform;
  title: string;
  content: string;
  mediaUrls: string[];
  coverUrl?: string;
  tags: string[];
  status: 'pending' | 'published' | 'failed';
  scheduledAt?: Date;
  publishedAt?: Date;
  createdAt: Date;
  error?: string;
}

// 消息信息
export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  receiverId: string;
  platform: Platform;
  type: 'text' | 'image' | 'video' | 'emoji';
  content: string;
  mediaUrl?: string;
  timestamp: Date;
  isRead: boolean;
  isFromUser: boolean;
}

// License 信息
export interface LicenseInfo {
  userId: string;
  email: string;
  licenseKey: string;
  plan: 'trial' | 'monthly' | 'yearly';
  expiresAt: Date;
  features: string[];
  maxAccounts: number;
  isActive: boolean;
}

// API 响应类型
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}
