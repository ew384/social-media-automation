// src/api/message.js - 极简化版本

import { http } from '@/utils/request'

// ====================  核心API  ====================
export const messageApi = {
  _initPromise: null, // 只保留防并发的Promise

  async initializeMonitoring() {
    // 如果正在调用中，复用Promise（防止并发）
    if (this._initPromise) {
      return this._initPromise
    }
    
    // 创建新的初始化Promise
    this._initPromise = http.post('/api/message-automation/monitoring/batch-start', {
      withSync: true,
      syncOptions: {
        intelligentSync: true,
        forceSync: false,
        timeout: 30000
      }
    })
    .then(result => {
      // 🔥 方案1核心修改：判断是否为成功状态
      const isSuccess = this._isInitializationSuccess(result)
      
      if (isSuccess) {
        this._hasInitialized = true
        
        // 🔥 统一返回成功格式
        if (result?.success && result.data) {
          const { summary } = result.data
          console.log(`✅ 初始化完成: 监听${summary.monitoringSuccess}个账号`)
          return {
            success: true,
            summary: {
              totalAccounts: summary.totalAccounts,
              monitoringStarted: summary.monitoringSuccess,
              validationFailed: summary.validationFailed,
              syncedMessages: summary.recoveredMessages
            }
          }
        } else {
          // 🔥 "已在监听"的情况
          console.log('✅ 后端监听服务已就绪')
          return {
            success: true,
            summary: {
              totalAccounts: 0,
              monitoringStarted: 0,
              validationFailed: 0,
              syncedMessages: 0
            }
          }
        }
      } else {
        return { 
          success: false, 
          error: result?.error || '初始化失败' 
        }
      }
    })
    .catch(error => {
      console.error('❌ 初始化失败:', error)
      return { 
        success: false, 
        error: error.message || '网络错误' 
      }
    })
    .finally(() => {
      this._initPromise = null
    })

    return this._initPromise
  },

  /**
   * 🔥 判断初始化是否应该视为成功
   */
  _isInitializationSuccess(result) {
    // 情况1：正常成功
    if (result?.success) {
      return true
    }
    
    // 情况2：后端返回"已在监听"错误 - 也应该视为成功
    if (result?.error) {
      const errorMsg = result.error.toLowerCase()
      if (errorMsg.includes('已在监听') || 
          errorMsg.includes('already_monitoring') || 
          errorMsg.includes('already monitoring')) {
        console.log('📋 后端监听服务已存在，视为初始化成功')
        return true
      }
    }
    
    return false
  },

  /**
   * 🔥 重置状态（仅在必要时使用）
   */
  resetInitStatus() {
    console.log('🔄 重置初始化状态')
    this._initPromise = null
    this._hasInitialized = false
  },

  // ==================== 🔥 数据查询API - 核心功能 ====================

  /**
   * 获取消息会话列表
   */
  getMessageThreads(platform, accountId) {
    const params = new URLSearchParams()
    if (platform) params.append('platform', platform)
    if (accountId) params.append('accountId', accountId)
    
    return http.get(`/api/message-automation/threads?${params.toString()}`)
  },

  /**
   * 获取会话消息（分页）
   */
  getThreadMessages(threadId, limit = 50, offset = 0) {
    return http.get(`/api/message-automation/threads/${threadId}/messages?limit=${limit}&offset=${offset}`)
  },

  /**
   * 发送消息
   */
  sendMessage(data) {
    return http.post('/api/message-automation/send', data)
  },

  /**
   * 标记消息已读
   */
  markMessagesAsRead(data) {
    return http.post('/api/message-automation/messages/mark-read', data)
  },

  /**
   * 搜索消息
   */
  searchMessages(platform, accountId, keyword, limit = 20) {
    const params = new URLSearchParams()
    if (platform) params.append('platform', platform)
    if (accountId) params.append('accountId', accountId)
    if (keyword) params.append('keyword', keyword)
    if (limit) params.append('limit', limit.toString())
    
    return http.get(`/api/message-automation/search?${params.toString()}`)
  },

  // ==================== 🔥 状态查询API - 系统监控用 ====================

  /**
   * 获取监听状态（用于状态指示器）
   */
  getMonitoringStatus() {
    return http.get('/api/message-automation/monitoring/status')
  },

  /**
   * 获取未读消息统计
   */
  getUnreadCount(platform = '', accountId = '') {
    const params = new URLSearchParams()
    if (platform) params.append('platform', platform)
    if (accountId) params.append('accountId', accountId)
    
    return http.get(`/api/message-automation/unread-count?${params.toString()}`)
  },

  /**
   * 获取可用账号信息
   */
  getAvailableAccounts() {
    return http.get('/api/message-automation/accounts')
  },

  /**
   * 获取消息统计信息
   */
  getMessageStatistics() {
    return http.get('/api/message-automation/statistics')
  },

  /**
   * 获取系统引擎状态
   */
  getEngineStatus() {
    return http.get('/api/message-automation/engine/status')
  },

  // ==================== 🔥 内部辅助方法（仅供系统使用） ====================

  /**
   * 🔥 内部方法：停止所有监听（仅供reconnect使用）
   */
  async _stopAllMonitoring() {
    return http.post('/api/message-automation/monitoring/stop-all')
  },

  /**
   * 🔥 内部方法：检查连接状态（仅供系统监控使用）
   */
  async _checkSystemHealth() {
    try {
      const [statusResult, engineResult] = await Promise.all([
        this.getMonitoringStatus(),
        this.getEngineStatus()
      ]);
      
      if (statusResult.success && engineResult.success) {
        const monitoring = statusResult.data.monitoring || [];
        const activeCount = monitoring.filter(m => m.isMonitoring).length;
        
        return {
          success: true,
          status: activeCount > 0 ? 'healthy' : 'inactive',
          activeCount,
          totalCount: monitoring.length
        };
      }
      
      return { success: false, status: 'error' };
    } catch (error) {
      return { success: false, status: 'error', error: error.message };
    }
  }
}

// ==================== 🔥 导出 ====================
export default messageApi
