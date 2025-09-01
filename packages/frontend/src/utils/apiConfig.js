// 新建 src/utils/apiConfig.js
export const getApiBaseUrl = () => {
  // 1. 优先使用运行时配置
  if (window.APP_CONFIG?.API_BASE_URL) {
    return window.APP_CONFIG.API_BASE_URL;
  }
  
  // 2. 尝试环境变量
  if (import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL;
  }
  
  // 3. 默认值（可以根据当前域名智能判断）
  return 'http://localhost:3409';
};