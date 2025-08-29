// src/utils/platform.js - 平台相关工具函数

// 🔥 平台映射配置
export const PLATFORM_MAPPING = {
  '视频号': 'wechat',
  '微信视频号': 'wechat',
  '抖音': 'douyin',
  '快手': 'kuaishou',
  '小红书': 'xiaohongshu'
};

// 🔥 反向映射（API key -> 显示名称）
export const PLATFORM_DISPLAY_MAPPING = {
  'wechat': '视频号',
  'douyin': '抖音',
  'kuaishou': '快手',
  'xiaohongshu': '小红书'
};

/**
 * 获取平台API key
 * @param {string} platform - 显示名称（如"视频号"）
 * @returns {string} API key（如"wechat"）
 */
export const getPlatformKey = (platform) => {
  return PLATFORM_MAPPING[platform] || platform.toLowerCase();
};

/**
 * 获取平台显示名称
 * @param {string} platformKey - API key（如"wechat"）
 * @returns {string} 显示名称（如"视频号"）
 */
export const getPlatformDisplayName = (platformKey) => {
  return PLATFORM_DISPLAY_MAPPING[platformKey] || platformKey;
};

/**
 * 生成账号监听状态key
 * @param {string} platform - 平台名称
 * @param {string} accountId - 账号ID
 * @returns {string} 监听状态key
 */
export const getAccountKey = (platform, accountId) => {
  const platformKey = getPlatformKey(platform);
  return `${platformKey}_${accountId}`;
};

/**
 * 获取平台Logo路径
 * @param {string} platform - 平台名称
 * @returns {string} Logo路径
 */
export const getPlatformLogo = (platform) => {
  // 🔥 支持中文显示名称和API key两种格式
  const logoMap = {
    // 中文显示名称
    '抖音': '/logos/douyin.png',
    '快手': '/logos/kuaishou.png',
    '视频号': '/logos/wechat_shipinghao.png',
    '微信视频号': '/logos/wechat_shipinghao.png',
    '小红书': '/logos/xiaohongshu.jpg',
    // 🔥 新增：API key格式
    'douyin': '/logos/douyin.png',
    'kuaishou': '/logos/kuaishou.png', 
    'wechat': '/logos/wechat_shipinghao.png',
    'xiaohongshu': '/logos/xiaohongshu.jpg'
  };
  
  return logoMap[platform] || '/logos/default.png';
};

/**
 * 检查平台是否支持消息监听
 * @param {string} platform - 平台名称
 * @returns {boolean} 是否支持
 */
export const isPlatformSupportMessage = (platform) => {
  const platformKey = getPlatformKey(platform);
  // 目前只有微信视频号支持消息监听
  return platformKey === 'wechat';
};