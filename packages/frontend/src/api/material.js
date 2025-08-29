import { http } from '@/utils/request'

// 素材管理API
export const materialApi = {
  // 获取所有素材
  getAllMaterials: () => {
    return http.get('/getFiles')
  },
  
  // 上传素材
  uploadMaterial: (formData) => {
    // 使用http.upload方法，它已经配置了正确的Content-Type
    return http.upload('/uploadSave', formData)
  },
  
  // 删除素材
  deleteMaterial: (id) => {
    return http.get(`/deleteFile?id=${id}`)
  },
  
  // 下载素材
  downloadMaterial: (filePath) => {
    return `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3409'}/download/${filePath}`
  },
  
  // 获取素材预览URL
  getMaterialPreviewUrl: (filename) => {
    return `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3409'}/getFile?filename=${filename}`
  },
    // 🔥 新增：保存视频封面
  saveCoverScreenshot: (base64Data, videoFileName) => {
    return http.post('/saveCoverScreenshot', {
      base64Data,
      videoFileName
    })
  }

}