// 平台类型
export type Platform = 'douyin' | 'kuaishou' | 'xiaohongshu' | 'wechat';

// 账户信息
export interface Account {
  id: string;
  platform: Platform;
  username: string;
  status: 'active' | 'inactive' | 'banned';
  cookies?: string;
}

// 发布记录
export interface PublishRecord {
  id: string;
  accountId: string;
  platform: Platform;
  title: string;
  content: string;
  mediaUrls: string[];
  status: 'pending' | 'published' | 'failed';
  publishedAt?: Date;
  createdAt: Date;
}

// License 信息
export interface LicenseInfo {
  userId: string;
  email: string;
  licenseKey: string;
  plan: 'trial' | 'monthly' | 'yearly';
  expiresAt: Date;
  features: string[];
}
