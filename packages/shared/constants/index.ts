export const PLATFORMS = {
  DOUYIN: 'douyin',
  KUAISHOU: 'kuaishou', 
  XIAOHONGSHU: 'xiaohongshu',
  WECHAT: 'wechat'
} as const;

export const LICENSE_PLANS = {
  TRIAL: 'trial',
  MONTHLY: 'monthly',
  YEARLY: 'yearly'
} as const;

export const API_ENDPOINTS = {
  BASE_URL: process.env.NODE_ENV === 'production' ? 'https://api.yourapp.com' : 'http://localhost:3001',
  AUTH: '/auth',
  LICENSE: '/license',
  ACCOUNTS: '/accounts',
  PUBLISH: '/publish'
} as const;
