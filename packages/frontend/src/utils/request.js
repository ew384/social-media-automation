import axios from 'axios'
import { ElMessage } from 'element-plus'

// 创建axios实例
const request = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3409',
  headers: {
    'Content-Type': 'application/json'
  }
})

// 请求拦截器
request.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    console.error('请求错误:', error)
    return Promise.reject(error)
  }
)

// 🔥 响应拦截器 - 最简单版本
request.interceptors.response.use(
  (response) => {
    console.log('✅ HTTP响应成功:', response.config.url);
    console.log('✅ 响应数据:', response.data);

    // 🔥 如果是blob类型，直接返回完整response（用于文件下载）
    if (response.config.responseType === 'blob') {
      return response;
    }

    return response.data;
  },
  (error) => {
    console.error('❌ 请求失败:', error);

    if (error.response) {
      const { status } = error.response
      switch (status) {
        case 401:
          ElMessage.error('未授权，请重新登录')
          break
        case 403:
          ElMessage.error('拒绝访问')
          break
        case 404:
          ElMessage.error('请求地址不存在')
          break
        case 500:
          console.error('服务器内部错误')
          break
        default:
          console.error('网络错误')
      }
    } else {
      console.error('网络连接失败')
    }

    return Promise.reject(error)
  }
)

// 🔥 文件下载辅助函数
export const downloadFile = (response, defaultFilename = 'download.csv') => {
  try {
    // 从响应头获取文件名
    const contentDisposition = response.headers['content-disposition'];
    let filename = defaultFilename;
    
    if (contentDisposition) {
      const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
      if (filenameMatch && filenameMatch[1]) {
        filename = filenameMatch[1].replace(/['"]/g, '');
      }
    }

    // 创建下载链接
    const blob = new Blob([response.data], {
      type: response.headers['content-type'] || 'application/octet-stream'
    });
    
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    
    // 清理
    window.URL.revokeObjectURL(url);
    document.body.removeChild(link);
    
    return { success: true, filename };
  } catch (error) {
    console.error('下载文件失败:', error);
    ElMessage.error('文件下载失败');
    return { success: false, error: error.message };
  }
};

// 封装常用的请求方法
export const http = {
  get(url, options = {}) {
    const { params, ...config } = options;
    return request.get(url, { params, ...config });
  },

  post(url, data, config = {}) {
    return request.post(url, data, config)
  },

  put(url, data, config = {}) {
    return request.put(url, data, config)
  },

  delete(url, params) {
    return request.delete(url, { params })
  },

  upload(url, formData) {
    return request.post(url, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    })
  },

  download(url, params = {}, filename = 'download.csv') {
    return request.get(url, { 
      params, 
      responseType: 'blob' 
    }).then(response => {
      const result = downloadFile(response, filename);
      // 🔥 返回统一的API格式，以匹配其他API调用的期望
      return {
        code: result.success ? 200 : 500,
        msg: result.success ? '下载成功' : result.error,
        data: result
      };
    });
  },

  // 🔥 新增：直接获取blob数据（不自动下载）
  getBlob(url, params = {}) {
    return request.get(url, { 
      params, 
      responseType: 'blob' 
    });
  }
}

export default request