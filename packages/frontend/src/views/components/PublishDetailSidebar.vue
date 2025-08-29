<template>
  <!-- 遮罩层 -->
  <div 
    v-if="visible" 
    class="sidebar-overlay" 
    @click="handleOverlayClick"
  >
    <!-- 侧边栏 -->
    <div 
      class="detail-sidebar" 
      @click.stop
      :class="{ 'slide-in': visible }"
    >
      <!-- 侧边栏头部 -->
      <div class="sidebar-header">
        <h2 class="sidebar-title">发布详情</h2>
        <el-button 
          @click="closeSidebar" 
          size="small" 
          type="text"
          class="close-btn"
        >
          <el-icon><Close /></el-icon>
        </el-button>
      </div>

      <!-- 侧边栏内容 -->
      <div class="sidebar-content" ref="sidebarContentRef">
        <!-- 加载状态 -->
        <div v-if="loading" class="loading-container">
          <el-icon class="is-loading"><Loading /></el-icon>
          <span>加载详情中...</span>
        </div>

        <!-- 详情内容 -->
        <div v-else-if="recordDetail" class="detail-content">
          <!-- 统计数据卡片 -->
          <div class="stats-section">
            <div class="stats-grid">
              <div class="stat-card">
                <div class="stat-value">{{ recordDetail.stats.total }}</div>
                <div class="stat-label">任务数</div>
              </div>
              <div class="stat-card failed">
                <div class="stat-value">{{ recordDetail.stats.failed }}</div>
                <div class="stat-label">失败</div>
              </div>
              <div class="stat-card">
                <div class="stat-value">{{ recordDetail.duration_display }}</div>
                <div class="stat-label">任务耗时</div>
              </div>
              <div class="stat-card">
                <div class="stat-value">{{ recordDetail.stats.duration_per_account }}秒/个</div>
                <div class="stat-label">均耗时</div>
              </div>
            </div>
          </div>

          <!-- 发布流程展示 -->
          <div class="process-section">
            <div class="section-header">
              <h3>全部发布流程</h3>
              <el-tag 
                :type="getOverallStatusType(recordDetail.status)"
                size="small"
              >
                {{ getOverallStatusText(recordDetail.status) }}
              </el-tag>
            </div>

            <div class="process-list">
              <div
                v-for="accountStatus in recordDetail.account_statuses"
                :key="`${accountStatus.record_id}-${accountStatus.account_name}`"
                class="process-item"
              >
                <!-- 账号信息 -->
                <div class="account-header" @click="toggleAccountExpand(`${accountStatus.record_id}-${accountStatus.account_name}`)">
                  <div class="account-info">
                    <!-- 箭头图标移到账号名称左边 -->
                    <div class="account-name-wrapper">
                      <el-icon 
                        class="expand-icon" 
                        :class="{ expanded: expandedAccounts.has(`${accountStatus.record_id}-${accountStatus.account_name}`) }"
                      >
                        <ArrowRight />
                      </el-icon>
                      <div class="account-name">
                        {{ accountStatus.account_name }}
                        <span class="platform-name">({{ accountStatus.platform }})</span>
                        <el-tag 
                          v-if="isAccountInvalid(accountStatus)"
                          type="danger" 
                          size="small"
                          style="margin-left: 8px;"
                        >
                          账号已失效
                        </el-tag>
                      </div>
                    </div>
                  </div>
                  <div class="account-status">
                    <el-tag 
                      :type="getAccountStatusType(accountStatus.status)"
                      size="small"
                    >
                      {{ getAccountStatusText(accountStatus.status) }}
                    </el-tag>
                  </div>
                </div>

                <!-- 流程步骤 -->
                <div 
                  v-show="expandedAccounts.has(`${accountStatus.record_id}-${accountStatus.account_name}`)" 
                  class="process-steps"
                >
                  <div 
                    v-for="step in getProcessSteps(accountStatus)"
                    :key="step.key"
                    :class="[
                      'process-step',
                      {
                        'completed': step.status === 'success',
                        'failed': step.status === 'failed',
                        'pending': step.status === 'pending'
                      }
                    ]"
                  >
                    <div class="step-icon">
                      <el-icon v-if="step.status === 'success'"><Check /></el-icon>
                      <el-icon v-else-if="step.status === 'failed'"><Close /></el-icon>
                      <el-icon v-else><Clock /></el-icon>
                    </div>
                    <div class="step-info">
                      <div class="step-label">{{ step.label }}</div>
                      <div class="step-status">{{ step.statusText }}</div>
                    </div>
                  </div>
                </div>

                <!-- 错误信息 -->
                <div v-if="accountStatus.error_message" class="error-message">
                  <el-alert
                    :title="accountStatus.error_message"
                    type="error"
                    size="small"
                    :closable="false"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 错误状态 -->
        <div v-else-if="error" class="error-container">
          <el-result
            icon="error"
            title="加载失败"
            :sub-title="error"
          >
            <template #extra>
              <el-button @click="loadRecordDetail" type="primary">重试</el-button>
            </template>
          </el-result>
        </div>
        <!-- 🔥 新增：重新发布按钮区域 -->
        <div v-if="recordDetail && recordDetail.status !== 'pending'" class="republish-section">
          <div class="republish-card">
            <div class="republish-header">
              <div class="republish-stats">
                <span class="stat-item">总数: {{ republishStats.total }}</span>
                <span class="stat-item failed" v-if="republishStats.failed > 0">
                  失败: {{ republishStats.failed }}
                </span>
              </div>
              
              <div class="republish-actions">
                <el-dropdown 
                  @command="handleRepublishCommand"
                  :disabled="!republishStats.canRepublishAll"
                >
                  <el-button 
                    type="primary" 
                    size="small"
                    :disabled="!republishStats.canRepublishAll"
                    :loading="republishing"
                  >
                    {{ republishing ? '发布中...' : '重新发布' }}
                    <el-icon><ArrowDown /></el-icon>
                  </el-button>
                  
                  <template #dropdown>
                    <el-dropdown-menu>
                      <el-dropdown-item 
                        command="all" 
                        :disabled="!republishStats.canRepublishAll"
                      >
                        <el-icon><Users /></el-icon>
                        选择全部 ({{ republishStats.total }}个账号)
                      </el-dropdown-item>
                      <el-dropdown-item 
                        command="failed" 
                        :disabled="!republishStats.canRepublishFailed"
                      >
                        <el-icon><Warning /></el-icon>
                        仅发布失败 ({{ republishStats.failed }}个账号)
                      </el-dropdown-item>
                    </el-dropdown-menu>
                  </template>
                </el-dropdown>
              </div>
            </div>
          </div>
        </div>        
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onUnmounted,nextTick } from 'vue';
import { 
  Close, 
  Loading, 
  Check, 
  Clock,
  ArrowRight,
  ArrowDown,
  Warning, 
  InfoFilled
} from '@element-plus/icons-vue';
import { ElMessage,ElMessageBox } from 'element-plus';
import { publishApi } from '@/api/publish';

const expandedAccounts = ref(new Set()); // 在响应式数据中添加

const toggleAccountExpand = (accountKey) => {
  if (expandedAccounts.value.has(accountKey)) {
    expandedAccounts.value.delete(accountKey);
  } else {
    expandedAccounts.value.add(accountKey);
  }
};


// 🔥 判断账号是否失效（基于错误信息）
const isAccountInvalid = (accountStatus) => {
  return accountStatus.error_message && 
         (accountStatus.error_message.includes('账号已失效') || 
          accountStatus.error_message.includes('请重新登录'));
};
const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  recordId: {
    type: Number,
    default: null
  }
});

// Emits
const emit = defineEmits(['update:visible', 'close']);
// 新增：SSE连接管理
const sseConnection = ref(null);
//const refreshInterval = ref(null);
// 响应式数据
const loading = ref(false);
const recordDetail = ref(null);
const error = ref(null);

// 方法定义
const closeSidebar = () => {
  emit('update:visible', false);
  emit('close');
};

const handleOverlayClick = () => {
  closeSidebar();
};
// 保存滚动位置
const scrollPosition = ref(0);
const sidebarContentRef = ref(null);

// 智能更新数据的方法
const updateRecordDetailSmartly = (newData) => {
  if (!recordDetail.value) {
    recordDetail.value = newData;
    return;
  }

  // 保存当前滚动位置
  if (sidebarContentRef.value) {
    scrollPosition.value = sidebarContentRef.value.scrollTop;
  }

  // 只更新变化的字段
  recordDetail.value.status = newData.status;
  recordDetail.value.stats = newData.stats;
  
  // 智能更新账号状态：只更新变化的账号
  newData.account_statuses.forEach(newStatus => {
    const existingIndex = recordDetail.value.account_statuses.findIndex(
      item => item.account_name === newStatus.account_name && 
              item.record_id === newStatus.record_id
    );
    
    if (existingIndex !== -1) {
      // 检查是否真的有变化
      const existing = recordDetail.value.account_statuses[existingIndex];
      if (JSON.stringify(existing) !== JSON.stringify(newStatus)) {
        // 只有真正变化时才更新
        Object.assign(existing, newStatus);
      }
    }
  });

  // 在下一帧恢复滚动位置
  nextTick(() => {
    if (sidebarContentRef.value) {
      sidebarContentRef.value.scrollTop = scrollPosition.value;
    }
  });
};
// 现有的响应式数据...
const republishing = ref(false);
const republishStats = ref({
  total: 0,
  failed: 0, 
  success: 0,
  canRepublishAll: false,
  canRepublishFailed: false
});


// 🔥 新增：重新发布命令处理
const handleRepublishCommand = async (command) => {
  try {
    const mode = command; // 'all' 或 'failed'
    const modeText = mode === 'all' ? '全部账号' : '失败账号';
    const accountCount = mode === 'all' ? republishStats.value.total : republishStats.value.failed;
    
    // 确认对话框
    await ElMessageBox.confirm(
      `确定要重新发布到${modeText}吗？将会向${accountCount}个账号重新发布相同的视频和设置。`,
      `重新发布确认`,
      {
        confirmButtonText: '确定发布',
        cancelButtonText: '取消',
        type: 'warning',
        dangerouslyUseHTMLString: true
      }
    );

    republishing.value = true;

    // 调用重新发布API
    const response = await publishApi.republishVideo({
      recordId: props.recordId,
      mode: mode
    });

    if (response.code === 200) {
      ElMessage.success(`重新发布任务已提交，共${accountCount}个账号`);
      
      // 🔥 立即关闭当前侧边栏
      emit('close');
      
      // 🔥 通知父组件切换到新记录并打开侧边栏
      if (response.data?.recordId) {
        console.log(`🔄 切换到新发布记录: ${response.data.recordId}`);
        
        // 延迟一下确保界面更新
        setTimeout(() => {
          emit('switch-to-record', response.data.recordId);
        }, 500);
      }
      
    } else {
      ElMessage.error(response.msg || '重新发布失败');
    }

  } catch (error) {
    if (error !== 'cancel') {
      console.error('重新发布失败:', error);
      ElMessage.error('重新发布失败');
    }
  } finally {
    republishing.value = false;
  }
};
// 🔥 修改：加载记录详情时同时获取重新发布统计
const loadRecordDetail = async () => {
  if (!props.recordId) return;

  try {
    if (!recordDetail.value) {
      loading.value = true;
    }
    
    error.value = null;

    const data = await publishApi.getPublishRecordDetail(props.recordId);

    if (data.code === 200) {
      recordDetail.value = data.data;
      
      // 🔥 计算重新发布统计
      if (data.data.account_statuses) {
        const total = data.data.account_statuses.length;
        const failed = data.data.account_statuses.filter(s => s.status === 'failed').length;
        const success = data.data.account_statuses.filter(s => s.status === 'success').length;
        
        republishStats.value = {
          total,
          failed,
          success,
          canRepublishAll: total > 0,
          canRepublishFailed: failed > 0
        };
      }

      // SSE连接逻辑保持不变...
      if (data.data.status === 'pending') {
        connectToProgressSSE();
      } else {
        disconnectSSE();
      }
    } else {
      error.value = data.msg || '获取发布详情失败';
      ElMessage.error(error.value);
    }

  } catch (err) {
    console.error('获取发布详情失败:', err);
    error.value = '网络请求失败';
    ElMessage.error('获取发布详情失败');
  } finally {
    loading.value = false;
  }
};
// 🔥 新增：建立SSE连接
const connectToProgressSSE = () => {
  // 先断开现有连接
  disconnectSSE();

  console.log(`📡 建立SSE连接: recordId=${props.recordId}`);

  const eventSource = new EventSource(
    `${import.meta.env.VITE_API_BASE_URL}/api/upload-progress/${props.recordId}`
  );

  eventSource.onmessage = (event) => {
    try {
      const message = JSON.parse(event.data);
      console.log('📨 收到SSE消息:', message.type);
      
      if (message.type === 'initial') {
        // 初始状态（通常不需要处理，因为loadRecordDetail已经获取了最新数据）
        console.log('📨 收到初始进度数据:', message.data.length, '条记录');
      } else if (message.type === 'progress') {
        // 🔥 实时进度更新
        updateSingleProgress(message.data);
      } else if (message.type === 'heartbeat') {
        // 心跳消息，保持连接
        console.log('💓 SSE心跳');
      } else if (message.type === 'server_shutdown') {
        // 服务器关闭
        console.log('🛑 服务器关闭，断开SSE连接');
        disconnectSSE();
      }
    } catch (error) {
      console.error('❌ 解析SSE消息失败:', error, '原始数据:', event.data);
    }
  };

  eventSource.onopen = () => {
    console.log('✅ SSE连接已建立');
  };

  eventSource.onerror = (error) => {
    console.warn('❌ SSE连接错误:', error);
    
    // 🔥 智能重连：只有在任务还在进行中时才重连
    if (recordDetail.value?.status === 'pending') {
      console.log('🔄 3秒后尝试重连SSE...');
      setTimeout(() => {
        if (props.visible && recordDetail.value?.status === 'pending') {
          connectToProgressSSE();
        }
      }, 3000);
    }
  };

  sseConnection.value = eventSource;
};

// 🔥 新增：断开SSE连接
const disconnectSSE = () => {
  if (sseConnection.value) {
    console.log('📡 断开SSE连接');
    sseConnection.value.close();
    sseConnection.value = null;
  }
};

// 🔥 新增：更新单个进度
const updateSingleProgress = (progressData) => {
  if (!recordDetail.value?.account_statuses) return;
  console.log(`🔄 前端收到进度更新:`, {
    accountName: progressData.accountName,
    upload_status: progressData.upload_status,
    push_status: progressData.push_status,
    review_status: progressData.review_status,
    status: progressData.status
  });
  const accountStatus = recordDetail.value.account_statuses.find(
    status => status.account_name === progressData.accountName
  );
  
  if (accountStatus) {
    // 🔥 详细日志：更新前后的状态对比
    console.log(`📝 状态更新前:`, {
      upload_status: accountStatus.upload_status,
      push_status: accountStatus.push_status, 
      review_status: accountStatus.review_status
    });
    // 🔥 保存当前滚动位置（防止页面跳动）
    const scrollTop = sidebarContentRef.value?.scrollTop || 0;
    
    // 更新状态
    Object.assign(accountStatus, {
      status: progressData.status || accountStatus.status,
      upload_status: progressData.upload_status || accountStatus.upload_status,
      push_status: progressData.push_status || accountStatus.push_status,
      review_status: progressData.review_status || accountStatus.review_status,
      error_message: progressData.error_message || accountStatus.error_message
    });
    console.log(`📝 状态更新后:`, {
      upload_status: accountStatus.upload_status,
      push_status: accountStatus.push_status,
      review_status: accountStatus.review_status
    });
    // 🔥 恢复滚动位置
    nextTick(() => {
      if (sidebarContentRef.value) {
        sidebarContentRef.value.scrollTop = scrollTop;
      }
    });
  }

  // 🔥 检查是否所有任务都完成了
  const allCompleted = recordDetail.value.account_statuses.every(
    status => status.status === 'success' || status.status === 'failed'
  );
  
  if (allCompleted) {
    console.log('✅ 所有任务已完成，断开SSE连接');
    disconnectSSE();
    recordDetail.value.status = 'completed';
  }
};

const getOverallStatusType = (status) => {
  const typeMap = {
    'pending': 'warning',
    'uploading': 'warning',
    'success': 'success',
    'partial': 'warning', 
    'failed': 'danger'
  };
  return typeMap[status] || 'info';
};

const getOverallStatusText = (status) => {
  const textMap = {
    'pending': '发布中',
    'uploading': '发布中',
    'success': '发布成功',
    'partial': '部分成功',
    'failed': '发布失败'
  };
  return textMap[status] || status;
};

const getAccountStatusType = (status) => {
  const typeMap = {
    'pending': 'warning',
    'uploading': 'warning',
    'success': 'success',
    'failed': 'danger'
  };
  return typeMap[status] || 'info';
};

const getAccountStatusText = (status) => {
  const textMap = {
    'pending': '等待中',
    'uploading': '上传中',
    'success': '发布成功',
    'failed': '发布失败'
  };
  return textMap[status] || status;
};

const getProcessSteps = (accountStatus) => {
  const steps = [
    {
      key: 'upload',
      label: '上传状态',
      status: getStepStatus(accountStatus.upload_status),
      statusText: accountStatus.upload_status || '待处理'
    },
    {
      key: 'push',
      label: '推送状态', 
      status: getStepStatus(accountStatus.push_status),
      statusText: accountStatus.push_status || '待处理'
    },
    {
      key: 'review',
      label: '审核状态',
      status: getStepStatus(accountStatus.review_status),
      statusText: accountStatus.review_status || '待处理'
    }
  ];

  return steps;
};

const getStepStatus = (statusText) => {
  if (!statusText || statusText === '待处理' || statusText === '待推送' || statusText === '待审核' || statusText === '待开始') {
    return 'pending';
  }
  
  // 🔥 添加账号失效的特殊处理
  if (statusText.includes('账号已失效') || statusText.includes('Cookie已失效')) {
    return 'failed';
  }
  
  if (statusText.includes('成功') || statusText === '发布成功') {
    return 'success';
  }
  if (statusText.includes('失败')) {
    return 'failed';
  }
  // 🔥 处理进行中的状态
  if (statusText.includes('中') || statusText.includes('验证')) {
    return 'pending';
  }
  return 'pending';
};

// 监听器
watch(() => props.visible, (newVisible) => {
  if (newVisible && props.recordId) {
    loadRecordDetail();
  } else if (!newVisible) {
    // 🔥 关闭SSE连接
    disconnectSSE();
  }
});

watch(() => props.recordId, (newRecordId) => {
  if (props.visible && newRecordId) {
    loadRecordDetail();
  }
});
onUnmounted(() => {
  disconnectSSE();
});
</script>

<style lang="scss" scoped>
// 变量定义
$primary: #5b73de;
$success: #10b981;
$warning: #f59e0b;
$danger: #ef4444;
$info: #6b7280;

$bg-light: #f8fafc;
$bg-white: #ffffff;
$bg-gray: #f1f5f9;

$text-primary: #1e293b;
$text-secondary: #64748b;
$text-muted: #94a3b8;

$border-light: #e2e8f0;
$shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
$shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
$shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);

$radius-sm: 4px;
$radius-md: 8px;
$radius-lg: 12px;
$radius-xl: 16px;

$space-xs: 4px;
$space-sm: 8px;
$space-md: 16px;
$space-lg: 24px;
$space-xl: 32px;

.sidebar-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  z-index: 1000;
  display: flex;
  justify-content: flex-end;

  // 侧边栏整体背景调整为灰色
  .detail-sidebar {
    width: 45%;
    max-width: 600px;
    min-width: 400px;
    background: #f8fafc; // 整体灰色背景
    box-shadow: $shadow-lg;
    display: flex;
    flex-direction: column;
    transform: translateX(100%);
    transition: transform 0.3s ease;

    &.slide-in {
      transform: translateX(0);
    }

    .sidebar-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: $space-lg;
      border-bottom: none; // 去掉分割线
      background: $bg-white; // 白色卡片
      margin: $space-md $space-md 0 $space-md; // 四周留白间距
      border-radius: $radius-lg; // 圆角

      .sidebar-title {
        font-size: 18px;
        font-weight: 600;
        color: $text-primary;
        margin: 0;
      }

      .close-btn {
        padding: $space-sm;
        
        &:hover {
          background-color: rgba(239, 68, 68, 0.1);
          color: $danger;
        }
      }
    }

    .sidebar-content {
      flex: 1;
      overflow-y: auto;
      padding: 0 $space-md $space-md $space-md; // 左右下留白，顶部不留（紧贴header）
      background: transparent; // 透明背景显示灰色

      .loading-container {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: $space-md;
        padding: $space-xl;
        background: $bg-white; // 白色卡片
        border-radius: $radius-lg;
        margin-top: $space-md;
        color: $text-secondary;

        .is-loading {
          font-size: 32px;
          animation: rotate 1s linear infinite;
        }
      }

      .error-container {
        padding: $space-lg;
        background: $bg-white; // 白色卡片
        border-radius: $radius-lg;
        margin-top: $space-md;
      }

      .detail-content {
        // 统计数据横栏 - 白色卡片无边框
        .stats-section {
          margin: $space-md 0 $space-lg 0; // 顶部留白

          .stats-grid {
            display: flex;
            background: $bg-white; // 白色卡片
            border-radius: $radius-lg;
            padding: 16px 20px;
            border: none; // 完全无边框
            box-shadow: none; // 去掉阴影，依靠背景色对比

            .stat-card {
              flex: 1;
              background: transparent;
              border: none;
              border-radius: 0;
              padding: 0;
              text-align: center;
              transition: none;

              // 完全去掉分割线
              &:not(:last-child) {
                margin-right: 20px;
                padding-right: 20px;
              }

              &:hover {
                transform: none;
              }

              &.failed {
                .stat-value {
                  color: $danger;
                }
              }

              .stat-value {
                font-size: 16px; // 稍微增大字体，因为空间更充足
                font-weight: 600;
                color: $text-primary;
                margin-bottom: 4px;
                line-height: 1.2;
              }

              .stat-label {
                font-size: 11px; // 稍微增大
                color: $text-secondary;
                font-weight: 500;
                line-height: 1;
              }
            }
          }
        }

        // 流程区域 - 压缩空间留白
        .process-section {
          .section-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: $space-md;
            padding: 12px 16px; // 减少内边距
            background: $bg-white;
            border-radius: $radius-lg;
            border: none;

            h3 {
              font-size: 15px;
              font-weight: 600;
              color: $text-primary;
              margin: 0;
            }

            :deep(.el-tag) {
              font-size: 10px;
            }
          }

          .process-list {
            background: $bg-white;
            border-radius: $radius-lg;
            border: none;
            padding: 8px 0; // 大幅减少上下内边距
            overflow: hidden;

            .process-item {
              padding: 8px 16px; // 大幅减少内边距
              margin-bottom: 0;
              border-bottom: none;
              
              // 减少账号间间距
              &:not(:last-child) {
                margin-bottom: 6px; // 从 $space-sm 减小
              }

              &:last-child {
                margin-bottom: 0;
              }

              .account-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 6px; // 减少间距
                cursor: pointer;
                padding: 6px 8px; // 减少内边距
                border-radius: $radius-sm;
                transition: background-color 0.2s ease;

                &:hover {
                  background-color: rgba(0, 0, 0, 0.03);
                }

                .account-info {
                  .account-name-wrapper {
                    display: flex;
                    align-items: center;
                    gap: 6px; // 减少间距

                    .expand-icon {
                      font-size: 12px;
                      color: $text-muted;
                      transition: transform 0.2s ease;
                      flex-shrink: 0;

                      &.expanded {
                        transform: rotate(90deg);
                      }
                    }

                    .account-name {
                      font-size: 13px;
                      font-weight: 600;
                      color: $text-primary;
                      line-height: 1.2; // 减少行高

                      .platform-name {
                        font-size: 11px;
                        font-weight: 400;
                        color: $text-secondary;
                        margin-left: 4px; // 减少间距
                      }
                    }
                  }
                }

                .account-status {
                  display: flex;
                  align-items: center;

                  :deep(.el-tag) {
                    font-size: 9px;
                    padding: 1px 4px; // 减少内边距
                    height: auto;
                  }
                }
              }

              .process-steps {
                background: rgba(248, 250, 252, 0.3); // 更淡的背景
                border-radius: $radius-sm;
                padding: 6px 12px; // 大幅减少内边距
                margin-top: 4px; // 减少顶部间距

                .process-step {
                  display: flex;
                  align-items: center;
                  gap: 8px; // 减少间距
                  padding: 4px 0; // 大幅减少内边距
                  border-left: none;
                  padding-left: 24px; // 减少左边距
                  margin-left: 0;
                  position: relative;

                  &:not(:last-child) {
                    margin-bottom: 4px; // 大幅减少间距
                  }

                  &.completed {
                    .step-icon {
                      background-color: $success;
                      color: white;
                    }
                  }

                  &.failed {
                    .step-icon {
                      background-color: $danger;
                      color: white;
                    }
                  }

                  &.pending {
                    .step-icon {
                      background-color: $warning;
                      color: white;
                    }
                  }

                  .step-icon {
                    width: 16px; // 保持图标大小
                    height: 16px;
                    border-radius: 50%;
                    background-color: $bg-gray;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 10px;
                    position: absolute;
                    left: 6px; // 调整位置
                    box-shadow: none;
                  }

                  .step-info {
                    .step-label {
                      font-size: 12px;
                      font-weight: 500;
                      color: $text-primary;
                      margin-bottom: 1px; // 最小间距
                      line-height: 1.1; // 减少行高
                    }

                    .step-status {
                      font-size: 11px;
                      color: $text-secondary;
                      line-height: 1.1; // 减少行高
                    }
                  }
                }
              }

              .error-message {
                margin-top: 6px; // 减少间距
                padding-left: 16px; // 减少左边距
                
                :deep(.el-alert) {
                  background-color: rgba(239, 68, 68, 0.05);
                  border: none;
                  border-radius: $radius-sm;
                  padding: 6px 8px; // 减少内边距
                  
                  .el-alert__title {
                    font-size: 11px;
                    line-height: 1.2;
                  }
                }
              }
            }
          }
        }
      }
    }
  }
}
.republish-section {
  margin-top: 16px;
  
  .republish-card {
    background: $bg-white;
    border-radius: $radius-lg;
    padding: 16px;
    border: none; // 🔥 去掉边框
    
    .republish-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
      
      .republish-stats {
        display: flex;
        gap: 8px;
        
        .stat-item {
          font-size: 12px;
          color: $text-secondary;
          
          &.failed {
            color: $danger;
            font-weight: 500;
          }
        }
      }
    }
  }
}
@keyframes rotate {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

// 响应式设计
@media (max-width: 768px) {
  .sidebar-overlay {
    .detail-sidebar {
      width: 90%;
      min-width: 300px;

      .sidebar-content {
        padding: $space-md;

        .detail-content {
          .stats-section {
            .stats-grid {
              grid-template-columns: 1fr;
            }
          }
        }
      }
    }
  }
}
</style>