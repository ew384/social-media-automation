export const PLATFORMS = {
  DOUYIN: 'douyin',
  KUAISHOU: 'kuaishou', 
  XIAOHONGSHU: 'xiaohongshu',
  WECHAT: 'wechat'
} as const;

export const PLATFORM_NAMES = {
  [PLATFORMS.DOUYIN]: '抖音',
  [PLATFORMS.KUAISHOU]: '快手',
  [PLATFORMS.XIAOHONGSHU]: '小红书',
  [PLATFORMS.WECHAT]: '微信视频号'
} as const;

export const LICENSE_PLANS = {
  TRIAL: 'trial',
  MONTHLY: 'monthly',
  YEARLY: 'yearly'
} as const;

export const PLAN_NAMES = {
  [LICENSE_PLANS.TRIAL]: '试用版',
  [LICENSE_PLANS.MONTHLY]: '月度版',
  [LICENSE_PLANS.YEARLY]: '年度版'
} as const;

export const PLAN_LIMITS = {
  [LICENSE_PLANS.TRIAL]: { maxAccounts: 2, duration: 7 },
  [LICENSE_PLANS.MONTHLY]: { maxAccounts: 10, duration: 30 },
  [LICENSE_PLANS.YEARLY]: { maxAccounts: 50, duration: 365 }
} as const;

// 修复环境变量类型问题
export const API_ENDPOINTS = {
  BASE_URL: (typeof process !== 'undefined' && process.env?.NODE_ENV === 'production') 
    ? 'https://api.yourapp.com' 
    : 'http://localhost:3001',
  AUTH: '/api/auth',
  LICENSE: '/api/license',
  ACCOUNTS: '/api/accounts',
  PUBLISH: '/api/publish',
  MESSAGES: '/api/messages'
} as const;

export const SOCKET_EVENTS = {
  CONNECT: 'connect',
  DISCONNECT: 'disconnect',
  MESSAGE_RECEIVED: 'message:received',
  MESSAGE_SENT: 'message:sent',
  ACCOUNT_STATUS: 'account:status',
  PUBLISH_STATUS: 'publish:status'
} as const;
