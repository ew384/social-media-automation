// src/stores/message.js - 极简化版本

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { messageApi } from '@/api/message'
import { ElMessage } from 'element-plus'
import { io } from 'socket.io-client'
export const useMessageStore = defineStore('message', () => {
  // ==================== 🔥 核心数据状态 ====================
  
  // 当前选中状态
  const selectedAccount = ref(null)      // { platform, accountId, userName }
  const selectedThread = ref(null)       // { threadId, userName, avatar }
  const pendingSentMessages = ref([])
  // 数据缓存
  const threadsList = ref([])           // 当前账号的会话列表
  const currentMessages = ref([])       // 当前会话的消息列表
  
  // 系统状态（简化）
  const connectionStatus = ref('connected')  // connected | reconnecting | error
  const unreadCounts = ref({})          // { platform_accountId: count }
  const monitoringStatus = ref({})      // { platform_accountId: boolean }
  
  // 加载状态
  const isLoadingThreads = ref(false)
  const isLoadingMessages = ref(false)
  const isSending = ref(false)
  
  // 分页状态
  const messagesOffset = ref(0)
  const hasMoreMessages = ref(true)

  // ==================== 🔥 计算属性 ====================
  
  const totalUnreadCount = computed(() => {
    return Object.values(unreadCounts.value).reduce((sum, count) => sum + count, 0)
  })
  
  const activeMonitoringCount = computed(() => {
    return Object.values(monitoringStatus.value).filter(Boolean).length
  })

  const isSystemReady = computed(() => {
    return connectionStatus.value === 'connected' && activeMonitoringCount.value > 0
  })

  // ==================== 🔥 系统初始化（极简） ====================
  
  /**
   * 🔥 初始化 - 只加载历史数据，不管监听服务
   */
  const initialize = async () => {
    try {
      console.log('🔄 初始化消息store...')
      
      // 🔥 步骤1: 恢复上次选中的账号
      const lastAccount = getLastSelectedAccount()
      if (lastAccount) {
        console.log(`📋 恢复上次选中账号: ${lastAccount.userName}`)
        await selectAccount(lastAccount.platform, lastAccount.accountId, lastAccount.userName)
      }
      
      // 🔥 步骤2: 加载基础状态（快速操作）
      refreshMonitoringStatus().catch(err => console.warn('监听状态刷新失败:', err))
      refreshUnreadCounts().catch(err => console.warn('未读统计刷新失败:', err))
      
      // 🔥 新增：设置WebSocket监听
      setupWebSocket()
      
      // 🔥 新增：延迟刷新状态（给后台服务启动时间）
      setTimeout(() => {
        refreshMonitoringStatus()
        refreshUnreadCounts()
      }, 2000)
      
      console.log('✅ 消息store初始化完成')
      
    } catch (error) {
      console.error('❌ 消息store初始化失败:', error)
      // 不抛出错误，避免阻塞页面
    }
  }

  // ==================== 🔥 账号和会话管理 ====================
  
  /**
   * 选择账号并加载会话列表
   */
  const selectAccount = async (platform, accountId, userName) => {
    try {
      console.log(`🔄 选择账号: ${platform} - ${userName}`)
      
      const accountInfo = { platform, accountId, userName }
      selectedAccount.value = accountInfo
      selectedThread.value = null
      currentMessages.value = []
      
      // 🔥 保存选中状态到本地存储
      saveLastSelectedAccount(accountInfo)
      console.log(`📞 调用loadThreads参数:`, { platform, accountId })
      // 🔥 加载该账号的会话列表
      await loadThreads(platform, accountId)
      
      console.log(`✅ 账号选择完成，会话数量: ${threadsList.value.length}`)
      
    } catch (error) {
      console.error('选择账号失败:', error)
      ElMessage.error('加载账号数据失败')
    }
  }

  /**
   * 选择会话并加载消息
   */
  const selectThread = async (threadId, userName, avatar) => {
    try {
      console.log(`💬 选择会话: ${userName}`)
      
      selectedThread.value = { threadId, userName, avatar }
      messagesOffset.value = 0
      hasMoreMessages.value = true
      
      await loadMessages(threadId, true)
      
      // 标记会话为已读
      await markAsRead(threadId)
      
    } catch (error) {
      console.error('选择会话失败:', error)
      ElMessage.error('加载消息失败')
    }
  }

  /**
   * 加载会话列表
   */
  const loadThreads = async (platform, accountId) => {
    if (isLoadingThreads.value) return
    
    isLoadingThreads.value = true
    
    try {
      console.log(`📋 加载会话列表: ${platform} - ${accountId}`)
      
      const response = await messageApi.getMessageThreads(platform, accountId)
      
      if (response?.success && response.data) {
        threadsList.value = response.data.threads || []
        console.log(`✅ 会话列表加载成功: ${threadsList.value.length} 个会话`)
      } else {
        console.warn('获取会话列表响应异常:', response)
        threadsList.value = []
      }
      
    } catch (error) {
      console.error('加载会话列表失败:', error)
      threadsList.value = []
      
      // 🔥 友好的错误提示
      if (error.message?.includes('timeout')) {
        ElMessage.warning('加载超时，请检查网络连接')
      } else {
        ElMessage.error('加载会话失败，请稍后重试')
      }
    } finally {
      isLoadingThreads.value = false
    }
  }

  /**
   * 加载消息 - 修改为聊天应用的逻辑
   */
  const loadMessages = async (threadId, reset = false) => {
    if (isLoadingMessages.value || (!hasMoreMessages.value && !reset)) return
    
    isLoadingMessages.value = true
    
    try {
      let offset, limit
      
      if (reset) {
        offset = 0
        limit = 50
      } else {
        // 🔥 加载更多时只计算非临时消息
        offset = currentMessages.value.filter(msg => !msg.isTemporary).length
        limit = 50
      }
      
      console.log(`📋 加载消息: threadId=${threadId}, reset=${reset}, offset=${offset}, limit=${limit}`)
      
      const response = await messageApi.getThreadMessages(threadId, limit, offset)
      
      if (response?.success && response.data) {
        const newMessages = response.data.messages || []
        
        if (reset) {
          // 🔥 重置时执行无感替换
          const processedMessages = replaceTemporaryMessages(newMessages)
          
          // 🔥 合并：新消息 + 未确认的临时消息
          const remainingTempMessages = currentMessages.value.filter(msg => 
            msg.isTemporary && (msg.status === 'sending' || msg.status === 'failed')
          )
          
          currentMessages.value = [...processedMessages, ...remainingTempMessages]
          messagesOffset.value = newMessages.length
          
          console.log(`✅ 消息重置完成: ${newMessages.length} 条数据库消息 + ${remainingTempMessages.length} 条临时消息`)
        } else {
          // 加载历史消息，直接插入
          currentMessages.value = [...newMessages, ...currentMessages.value]
          messagesOffset.value += newMessages.length
        }
        
        hasMoreMessages.value = newMessages.length === 50
        
      } else {
        console.warn('获取消息响应异常:', response)
        if (reset) {
          // 即使获取失败，也要保留临时消息
          const tempMessages = currentMessages.value.filter(msg => msg.isTemporary)
          currentMessages.value = tempMessages
        }
      }
      
    } catch (error) {
      console.error('加载消息失败:', error)
      if (reset) {
        // 异常时保留临时消息
        const tempMessages = currentMessages.value.filter(msg => msg.isTemporary)
        currentMessages.value = tempMessages
      }
      ElMessage.error('加载消息失败')
    } finally {
      isLoadingMessages.value = false
    }
  }

  // 🔥 WebSocket消息更新处理
  const handleMessageUpdated = () => {
    if (selectedThread.value) {
      console.log('🔄 收到消息更新推送，开始无感替换处理...')
      
      // 🔥 稍微延迟，确保数据库写入完成
      setTimeout(() => {
        loadMessages(selectedThread.value.threadId, true)
          .then(() => {
            console.log('✅ 无感消息替换完成')
          })
          .catch(error => {
            console.error('❌ 消息更新失败:', error)
          })
      }, 100) // 100ms延迟
    }
  }
  // 🔥 定期清理超时的待确认消息（兜底机制）
  const cleanupPendingMessages = () => {
    const now = Date.now()
    const beforeCount = pendingSentMessages.value.length
    
    pendingSentMessages.value = pendingSentMessages.value.filter(pending => {
      const age = now - pending.sendTime
      if (age > 600000) { // 10分钟超时
        console.log(`🧹 清理超时待确认消息: "${pending.content}"`)
        
        // 同时清理对应的临时消息
        currentMessages.value = currentMessages.value.filter(msg => 
          msg.id !== pending.tempId
        )
        
        return false
      }
      return true
    })
    
    if (beforeCount > pendingSentMessages.value.length) {
      console.log(`🧹 清理了 ${beforeCount - pendingSentMessages.value.length} 条超时待确认消息`)
    }
  }

  // 每2分钟清理一次
  setInterval(cleanupPendingMessages, 120000)
  
  /**
   * 发送消息
   */
  const sendMessage = async (content) => {
    if (isSending.value || !selectedAccount.value || !selectedThread.value) {
      return { success: false, error: '发送条件不满足' }
    }
    
    isSending.value = true
    
    try {
      const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      const sendTime = Date.now()
      
      // 🔥 步骤1: 创建临时消息
      const tempMessage = {
        id: tempId,
        sender: 'me',
        text: content.trim(),
        timestamp: new Date().toISOString(),
        is_read: true,
        type: 'text',
        status: 'sending',
        isTemporary: true
      }
      
      // 🔥 步骤2: 记录到待确认队列（用于后续匹配）
      const pendingInfo = {
        tempId: tempId,
        content: content.trim(),
        sendTime: sendTime,
        threadId: selectedThread.value.threadId,
        status: 'pending' // pending -> sent -> confirmed
      }
      pendingSentMessages.value.push(pendingInfo)
      
      // 立即显示临时消息
      currentMessages.value.push(tempMessage)
      
      // 🔥 步骤3: 调用后端API
      const response = await messageApi.sendMessage({
        platform: selectedAccount.value.platform,
        tabId: 'current',
        userName: selectedThread.value.userName,
        content: content,
        type: 'text',
        accountId: selectedAccount.value.accountId
      })
      
      if (response?.success) {
        // 🔥 更新临时消息状态
        const tempIndex = currentMessages.value.findIndex(msg => msg.id === tempId)
        if (tempIndex !== -1) {
          currentMessages.value[tempIndex].status = 'sent'
        }
        
        // 🔥 更新待确认队列状态
        const pendingIndex = pendingSentMessages.value.findIndex(p => p.tempId === tempId)
        if (pendingIndex !== -1) {
          pendingSentMessages.value[pendingIndex].status = 'sent'
          pendingSentMessages.value[pendingIndex].sentTime = Date.now()
        }
        
        console.log('✅ 消息发送成功，等待同步确认')
        return { success: true }
        
      } else {
        // 🔥 发送失败，清理待确认队列
        pendingSentMessages.value = pendingSentMessages.value.filter(p => p.tempId !== tempId)
        
        const tempIndex = currentMessages.value.findIndex(msg => msg.id === tempId)
        if (tempIndex !== -1) {
          currentMessages.value[tempIndex].status = 'failed'
          currentMessages.value[tempIndex].error = response?.data?.error || '发送失败'
        }
        
        return { success: false, error: response?.data?.error || '发送失败' }
      }
      
    } catch (error) {
      console.error('发送消息失败:', error)
      return { success: false, error: error.message || '网络错误' }
    } finally {
      isSending.value = false
    }
  }

  // 🔥 核心方法：无感替换临时消息
  const replaceTemporaryMessages = (newMessages) => {
    if (pendingSentMessages.value.length === 0) {
      // 没有待确认消息，直接使用新消息
      return newMessages
    }
    
    console.log(`🔄 开始无感替换: ${newMessages.length} 条新消息, ${pendingSentMessages.value.length} 条待确认`)
    
    // 🔥 策略：检查最新的几条消息中是否有我们刚发送的
    const recentNewMessages = newMessages.slice(-5) // 检查最新5条
    const confirmedTempIds = []
    
    pendingSentMessages.value.forEach(pending => {
      if (pending.status !== 'sent') return // 只处理已发送但未确认的
      
      // 🔥 简单匹配：内容相同 + 发送者是我 + 时间合理
      const matchingMessage = recentNewMessages.find(newMsg => {
        return newMsg.sender === 'me' && 
              newMsg.text === pending.content &&
              // 时间窗口检查：消息时间应该在发送后的合理范围内
              (Date.now() - pending.sendTime) < 300000 // 5分钟内
      })
      
      if (matchingMessage) {
        console.log(`✅ 找到匹配消息: "${pending.content}" -> ID: ${matchingMessage.id}`)
        confirmedTempIds.push(pending.tempId)
        pending.status = 'confirmed'
        pending.realMessageId = matchingMessage.id
      }
    })
    
    // 🔥 从当前消息列表中移除已确认的临时消息
    if (confirmedTempIds.length > 0) {
      const beforeCount = currentMessages.value.length
      currentMessages.value = currentMessages.value.filter(msg => {
        if (msg.isTemporary && confirmedTempIds.includes(msg.id)) {
          console.log(`🗑️ 移除已确认的临时消息: "${msg.text}"`)
          return false
        }
        return true
      })
      
      console.log(`📊 消息替换完成: 移除 ${beforeCount - currentMessages.value.length} 条临时消息`)
    }
    
    // 🔥 清理已确认的待处理记录
    pendingSentMessages.value = pendingSentMessages.value.filter(p => p.status !== 'confirmed')
    
    return newMessages
  }


  /**
   * 标记已读
   */
  const markAsRead = async (threadId, messageIds = null) => {
    try {
      const response = await messageApi.markMessagesAsRead({
        threadId: threadId,
        messageIds: messageIds
      })
      
      if (response?.success) {
        // 更新本地未读数
        if (selectedAccount.value) {
          const accountKey = `${selectedAccount.value.platform}_${selectedAccount.value.accountId}`
          await refreshUnreadCount(selectedAccount.value.platform, selectedAccount.value.accountId)
        }
        
        // 更新会话列表中的未读数
        const thread = threadsList.value.find(t => t.id === threadId)
        if (thread) {
          thread.unread_count = 0
        }
        
        console.log('✅ 消息已标记为已读')
        return true
      }
      
      return false
    } catch (error) {
      console.error('标记已读失败:', error)
      return false
    }
  }

  /**
   * 搜索消息
   */
  const searchMessages = async (keyword) => {
    if (!selectedAccount.value || !keyword.trim()) {
      return []
    }
    
    try {
      const response = await messageApi.searchMessages(
        selectedAccount.value.platform,
        selectedAccount.value.accountId,
        keyword.trim()
      )
      
      if (response?.success && response.data) {
        console.log(`🔍 搜索完成: 找到 ${response.data.results.length} 条结果`)
        return response.data.results || []
      }
      
      return []
    } catch (error) {
      console.error('搜索消息失败:', error)
      ElMessage.error('搜索失败')
      return []
    }
  }

  // ==================== 🔥 系统状态管理（简化） ====================
  
  /**
   * 刷新监听状态
   */
  const refreshMonitoringStatus = async () => {
    try {
      const response = await messageApi.getMonitoringStatus()
      
      if (response?.success && response.data) {
        const statusMap = {}
        
        if (response.data.monitoring) {
          response.data.monitoring.forEach(status => {
            const accountKey = `${status.platform}_${status.accountId}`
            statusMap[accountKey] = status.isMonitoring
          })
        }
        
        monitoringStatus.value = statusMap
        
        // 🔥 根据监听状态更新连接状态
        const hasActiveMonitoring = Object.values(statusMap).some(Boolean)
        if (hasActiveMonitoring && connectionStatus.value !== 'connected') {
          connectionStatus.value = 'connected'
        }
        
        console.log('✅ 监听状态已刷新')
      }
      
    } catch (error) {
      console.error('刷新监听状态失败:', error)
      // 🔥 网络错误时更新连接状态
      if (connectionStatus.value === 'connected') {
        connectionStatus.value = 'error'
      }
    }
  }

  /**
   * 刷新未读统计
   */
  const refreshUnreadCounts = async () => {
    try {
      const response = await messageApi.getUnreadCount()
      
      if (response?.success && response.data) {
        // 这里需要根据实际API响应格式调整
        console.log('✅ 未读统计已刷新')
      }
      
    } catch (error) {
      console.error('刷新未读统计失败:', error)
    }
  }

  /**
   * 刷新指定账号的未读统计
   */
  const refreshUnreadCount = async (platform, accountId) => {
    try {
      const response = await messageApi.getUnreadCount(platform, accountId)
      
      if (response?.success && response.data) {
        const accountKey = `${platform}_${accountId}`
        unreadCounts.value[accountKey] = response.data.unreadCount || 0
      }
      
    } catch (error) {
      console.error('刷新账号未读数失败:', error)
    }
  }

  /**
   * 🔥 设置连接状态
   */
  const setConnectionStatus = (status) => {
    connectionStatus.value = status
  }

  /**
   * 🔥 实时刷新当前会话数据（用于WebSocket推送）
   */
  const refreshCurrentThreads = async () => {
    if (!selectedAccount.value) return
    
    try {
      console.log('🔄 实时刷新当前会话列表...')
      await loadThreads(selectedAccount.value.platform, selectedAccount.value.accountId)
    } catch (error) {
      console.warn('实时刷新会话失败:', error)
    }
  }

  // ==================== 🔥 本地存储辅助方法 ====================
  
  /**
   * 获取上次选中的账号
   */
  const getLastSelectedAccount = () => {
    try {
      const saved = localStorage.getItem('messageStore_lastSelectedAccount')
      return saved ? JSON.parse(saved) : null
    } catch {
      return null
    }
  }

  /**
   * 保存当前选中的账号
   */
  const saveLastSelectedAccount = (account) => {
    try {
      localStorage.setItem('messageStore_lastSelectedAccount', JSON.stringify(account))
    } catch (error) {
      console.warn('保存选中账号失败:', error)
    }
  }

  /**
   * 清理状态
   */
  const cleanup = () => {
    selectedAccount.value = null
    selectedThread.value = null
    threadsList.value = []
    currentMessages.value = []
    messagesOffset.value = 0
    hasMoreMessages.value = true
    connectionStatus.value = 'connected'
  }
  const setupWebSocket = () => {
    try {
      const socket = io('http://localhost:3409')
      
      socket.on('message-updated', (data) => {
        console.log('🔄 收到消息更新推送:', data)
        handleMessageUpdated() // 触发无感替换
      })
      
      
      socket.on('message-processing', (data) => {
        console.log('📡 消息处理中:', data)
        setConnectionStatus('processing')
      })
      
      socket.on('message-error', (data) => {
        console.log('❌ 消息处理错误:', data)
        setConnectionStatus('error')
      })
      
      socket.on('connect', () => {
        console.log('✅ WebSocket连接成功')
        setConnectionStatus('connected')
      })
      
      socket.on('disconnect', () => {
        console.log('🔌 WebSocket连接断开')
        setConnectionStatus('reconnecting')
      })
      
    } catch (error) {
      console.warn('⚠️ WebSocket设置失败:', error)
    }
  }
  return {
    // 🔥 核心状态
    selectedAccount,
    selectedThread,
    threadsList,
    currentMessages,
    connectionStatus,
    unreadCounts,
    monitoringStatus,
    
    // 🔥 UI状态
    isLoadingThreads,
    isLoadingMessages,
    isSending,
    messagesOffset,
    hasMoreMessages,
    
    // 🔥 计算属性
    totalUnreadCount,
    activeMonitoringCount,
    isSystemReady,
    
    // 🔥 核心方法
    initialize,
    selectAccount,
    selectThread,
    loadThreads,
    loadMessages,
    sendMessage,
    markAsRead,
    searchMessages,
    
    // 🔥 状态管理
    refreshMonitoringStatus,
    refreshUnreadCounts,
    refreshUnreadCount,
    setConnectionStatus,
    refreshCurrentThreads,
    cleanup
  }
})