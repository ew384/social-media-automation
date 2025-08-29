<template>
  <div class="publish-records">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-content">
        <div class="header-left">
          <h1 class="page-title">发布记录</h1>
          <el-button
            @click="refreshRecords"
            class="refresh-btn"
            :loading="loading"
          >
            <el-icon><Refresh /></el-icon>
          </el-button>
        </div>
        <div class="header-actions">
          <el-button
            @click="showNewPublishDialog"
            type="primary"
            class="new-publish-btn"
          >
            <el-icon><Plus /></el-icon>
            新增发布
          </el-button>
        </div>
      </div>
    </div>

    <!-- 筛选器 -->
    <div class="filters-section">
      <div class="filters-row">
        <div class="filter-group">
          <el-select
            v-model="filters.publisher"
            placeholder="全部发布人"
            @change="applyFilters"
          >
            <el-option label="全部发布人" value="全部发布人" />
            <el-option label="当前账号" value="当前账号" />
          </el-select>
        </div>

        <div class="filter-group">
          <el-select
            v-model="filters.contentType"
            placeholder="全部发布类型"
            @change="applyFilters"
          >
            <el-option label="全部发布类型" value="全部发布类型" />
            <el-option label="视频" value="视频" />
            <el-option label="图文" value="图文" />
            <el-option label="文章" value="文章" />
          </el-select>
        </div>

        <div class="filter-group">
          <el-select
            v-model="filters.status"
            placeholder="全部推送状态"
            @change="applyFilters"
          >
            <el-option label="全部推送状态" value="全部推送状态" />
            <el-option label="发布中" value="发布中" />
            <el-option label="全部发布成功" value="全部发布成功" />
            <el-option label="部分发布成功" value="部分发布成功" />
            <el-option label="全部发布失败" value="全部发布失败" />
          </el-select>
        </div>

        <div class="filter-actions">
          <el-button @click="exportRecords" :loading="exporting">
            <el-icon><Download /></el-icon>
            导出
          </el-button>

          <el-button
            v-if="!batchDeleteMode"
            @click="enterBatchDeleteMode"
            :disabled="records.length === 0"
          >
            <el-icon><Delete /></el-icon>
            批量删除
          </el-button>

          <template v-else>
            <el-button @click="cancelBatchDelete">取消</el-button>
            <el-button
              type="danger"
              @click="confirmBatchDelete"
              :disabled="selectedRecords.length === 0"
            >
              删除 ({{ selectedRecords.length }})
            </el-button>
          </template>
        </div>
      </div>
    </div>

    <!-- 发布记录列表 -->
    <div class="records-section">
      <div v-if="loading" class="loading-container">
        <el-icon class="is-loading"><Loading /></el-icon>
        <span>加载中...</span>
      </div>
      <div v-else-if="records.length === 0" class="empty-records">
        <div class="custom-empty">
          <div class="empty-text">暂无发布记录</div>
        </div>
      </div>

      <div v-else class="records-grid">
        <div
          v-for="record in records"
          :key="record.id"
          :class="[
            'record-card',
            {
              'batch-delete-mode': batchDeleteMode,
              selected: selectedRecords.includes(record.id),
            },
          ]"
        >
          <!-- 批量删除复选框 -->
          <div v-if="batchDeleteMode" class="batch-checkbox">
            <el-checkbox
              :model-value="selectedRecords.includes(record.id)"
              @change="toggleRecordSelection(record.id)"
            />
          </div>

          <!-- 记录卡片内容 -->
          <div class="record-content" @click="showRecordDetail(record)">
            <!-- 视频预览区域 -->
            <div class="video-preview">
              <VideoPreview
                :videos="record.formattedVideos || formatVideosForPreview(record.video_files)"
                mode="record"
                size="small"
                class="record-video-preview"
              />
            </div>

            <!-- 记录信息 -->
            <div class="record-info">
              <div class="record-header">
                <h3 class="record-title">{{ record.title || "未命名任务" }}</h3>
                <div class="header-actions">
                  <!-- 发布状态 -->
                  <el-tag :type="getStatusType(record.status)" size="small">
                    {{ record.status_display }}
                  </el-tag>
                  
                  <!-- 操作按钮 -->
                  <el-dropdown
                    v-if="!batchDeleteMode"
                    @click.stop
                    trigger="click"
                    class="action-dropdown"
                  >
                    <el-button size="small" text class="more-btn" @click.stop>
                      <el-icon><MoreFilled /></el-icon>
                    </el-button>
                    <template #dropdown>
                      <el-dropdown-menu>
                        <el-dropdown-item @click.stop="deleteRecord(record.id)" class="delete-item">
                          <el-icon><Delete /></el-icon>
                          删除记录
                        </el-dropdown-item>
                      </el-dropdown-menu>
                    </template>
                  </el-dropdown>
                </div>
              </div>

              <!-- 平台logo -->
              <div class="record-meta">
                <div class="meta-item platforms">
                  <div class="platform-logos">
                    <div
                      v-for="platform in getRecordPlatforms(record)"
                      :key="platform"
                      class="platform-logo-item"
                      :title="platform"
                    >
                      <img
                        v-if="getPlatformLogo(platform)"
                        :src="getPlatformLogo(platform)"
                        :alt="platform"
                        @error="handlePlatformLogoError"
                      />
                      <div v-else class="platform-text">
                        {{ platform.charAt(0) }}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- 时间信息 -->
              <div class="record-footer">
                <div class="time-info">
                  <div class="publish-time">
                    <span class="time-label">{{ getPublishTimeLabel(record) }}:</span>
                    <span class="time-value">{{ getPublishTimeValue(record) }}</span>
                  </div>
                  <div v-if="record.scheduled_time" class="scheduled-time">
                    <span class="time-label">定时发布:</span>
                    <span class="time-value">{{ formatTime(record.scheduled_time, true) }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 分页 -->
      <div v-if="records.length > 0" class="pagination-section">
        <el-pagination
          v-model:current-page="pagination.currentPage"
          v-model:page-size="pagination.pageSize"
          :page-sizes="[10, 20, 50, 100]"
          :total="pagination.total"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
        />
      </div>
    </div>

    <!-- 发布详情侧边栏 -->
    <PublishDetailSidebar
      v-model:visible="detailSidebarVisible"
      :record-id="selectedRecordId"
      @close="detailSidebarVisible = false"
      @switch-to-record="handleSwitchToRecord"
    />

    <!-- 新增发布对话框 -->
    <NewPublishDialog
      v-model:visible="newPublishDialogVisible"
      @published="handlePublishSuccess"
    />
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted,onBeforeUnmount } from "vue";
import {
  Plus,
  Refresh,
  Download,
  Delete,
  VideoPlay,
  Loading,
  MoreFilled,
} from "@element-plus/icons-vue";
import { publishApi } from "@/api/publish";
import { ElMessage, ElMessageBox } from "element-plus";
import PublishDetailSidebar from "./components/PublishDetailSidebar.vue";
import NewPublishDialog from "./components/NewPublishDialog.vue";
import VideoPreview from "./components/video/VideoPreview.vue";
import { pathService } from '@/utils/pathService';
// 响应式数据
const loading = ref(false);
const exporting = ref(false);
const records = ref([]);
const batchDeleteMode = ref(false);
const selectedRecords = ref([]);
const detailSidebarVisible = ref(false);
const selectedRecordId = ref(null);
const newPublishDialogVisible = ref(false);
const refreshTimer = ref(null);
const startAutoRefresh = () => {
  refreshTimer.value = setInterval(async () => {
    // 只更新状态，不重新加载视频数据
    await updateRecordStatuses();
  }, 10000); // 改为10秒，更及时
};

// 新增：只更新状态的方法
const updateRecordStatuses = async () => {
  try {
    const data = await publishApi.getPublishRecords({
      publisher: filters.publisher,
      content_type: filters.contentType,
      status: filters.status,
      limit: pagination.pageSize,
      offset: (pagination.currentPage - 1) * pagination.pageSize,
      // 添加参数：只返回状态信息，不返回视频数据
      status_only: true
    });

    if (data.code === 200 && data.data) {
      // 智能合并：只更新状态，保留现有的视频数据
      updateRecordsStatus(data.data);
    }
  } catch (error) {
    console.warn("状态更新失败:", error);
  }
};

// 智能状态合并
const updateRecordsStatus = (newRecords) => {
  newRecords.forEach(newRecord => {
    const existingIndex = records.value.findIndex(r => r.id === newRecord.id);
    if (existingIndex !== -1) {
      // 只更新状态相关字段，保留视频数据
      const existing = records.value[existingIndex];
      existing.status = newRecord.status;
      existing.status_display = newRecord.status_display;
      existing.account_statuses = newRecord.account_statuses;
      // 保留 video_files, cover_screenshots 等视频相关数据
    }
  });
};

const stopAutoRefresh = () => {
  if (refreshTimer.value) {
    clearInterval(refreshTimer.value);
    refreshTimer.value = null;
  }
};
// 筛选器
const filters = reactive({
  publisher: "全部发布人",
  contentType: "全部发布类型",
  status: "全部推送状态",
});

// 分页
const pagination = reactive({
  currentPage: 1,
  pageSize: 20,
  total: 0,
});
// 🔥 修改：删除单个记录的方法（去掉确认对话框）
const deleteRecord = async (recordId, event) => {
  // 阻止事件冒泡，防止触发卡片点击事件
  if (event) {
    event.stopPropagation();
    event.preventDefault();
  }
  
  try {
    const data = await publishApi.deletePublishRecords([recordId]);

    if (data.code === 200) {
      ElMessage.success("删除成功");
      await loadRecords(); // 重新加载记录
    } else {
      ElMessage.error(data.msg || "删除失败");
    }
  } catch (error) {
    console.error("删除记录失败:", error);
    ElMessage.error("删除失败");
  }
};
async function formatVideosForPreview(videoFiles) {
  if (!Array.isArray(videoFiles)) {
    return [];
  }

  // 🔥 确保路径服务已初始化
  await pathService.ensureInitialized();

  const result = [];
  
  for (const filename of videoFiles) {
    const encodedFilename = encodeURIComponent(filename);
    
    // 🔥 使用异步方法获取本地路径
    const localVideoUrl = await pathService.getVideoLocalUrl(filename);
    const localCoverUrl = await pathService.getCoverLocalUrl(filename);
    
    // 🔥 API 路径作为备用
    const apiVideoUrl = `${import.meta.env.VITE_API_BASE_URL}/getFile?filename=${encodedFilename}`;
    const apiCoverUrl = `${import.meta.env.VITE_API_BASE_URL}/getFile?filename=covers/${encodeURIComponent(filename.replace(/\.[^/.]+$/, '_cover.jpg'))}`;

    result.push({
      name: filename,
      // 🔥 优先本地，备用 API
      url: localVideoUrl || apiVideoUrl,
      poster: localCoverUrl || apiCoverUrl,
      // 🔥 备用路径
      urlFallback: apiVideoUrl,
      posterFallback: apiCoverUrl,
      path: filename,
    });
  }

  //console.log("📹 格式化视频预览数据（本地路径优先）:", result);
  return result;
}
// 计算属性
const filteredRecords = computed(() => {
  return records.value; // 筛选逻辑在后端处理
});

// 方法定义
const refreshRecords = async () => {
  await loadRecords();
};

const loadRecords = async () => {
  try {
    loading.value = true;

    const data = await publishApi.getPublishRecords({
      publisher: filters.publisher,
      content_type: filters.contentType,
      status: filters.status,
      limit: pagination.pageSize,
      offset: (pagination.currentPage - 1) * pagination.pageSize,
    });

    if (data.code === 200) {
      const rawRecords = data.data || [];
      
      // 🔥 处理每个记录的视频数据
      for (const record of rawRecords) {
        if (record.video_files) {
          // 🔥 异步格式化视频预览数据
          record.formattedVideos = await formatVideosForPreview(record.video_files);
        }
      }
      
      records.value = rawRecords;
      pagination.total = data.total || records.value.length;
      
      console.log("📊 发布记录数据加载完成:", records.value.length);
    }
  } catch (error) {
    console.error("获取发布记录失败:", error);
    records.value = [];
    pagination.total = 0;
  } finally {
    loading.value = false;
  }
};

const applyFilters = () => {
  pagination.currentPage = 1; // 重置到第一页
  loadRecords();
};

const exportRecords = async () => {
  try {
    exporting.value = true;

    const result = await publishApi.exportPublishRecords({
      publisher: filters.publisher,
      content_type: filters.contentType,
      status: filters.status,
    });

    if (result.code === 200) {
      ElMessage.success("导出成功");
    } else {
      ElMessage.error(result.msg || "导出失败");
    }
  } catch (error) {
    console.error("导出失败:", error);
    ElMessage.error("导出失败");
  } finally {
    exporting.value = false;
  }
};

const enterBatchDeleteMode = () => {
  batchDeleteMode.value = true;
  selectedRecords.value = [];
};

const cancelBatchDelete = () => {
  batchDeleteMode.value = false;
  selectedRecords.value = [];
};

const toggleRecordSelection = (recordId) => {
  const index = selectedRecords.value.indexOf(recordId);
  if (index > -1) {
    selectedRecords.value.splice(index, 1);
  } else {
    selectedRecords.value.push(recordId);
  }
};

const confirmBatchDelete = async () => {
  if (selectedRecords.value.length === 0) {
    ElMessage.warning("请选择要删除的记录");
    return;
  }

  try {
    await ElMessageBox.confirm(
      `确定要删除选中的 ${selectedRecords.value.length} 条发布记录吗？`,
      "批量删除确认",
      {
        confirmButtonText: "确定删除",
        cancelButtonText: "取消",
        type: "warning",
      }
    );

    const data = await publishApi.deletePublishRecords(selectedRecords.value);

    if (data.code === 200) {
      ElMessage.success(data.msg || "删除成功");
      cancelBatchDelete();
      await loadRecords();
    } else {
      ElMessage.error(data.msg || "删除失败");
    }
  } catch (error) {
    if (error !== "cancel") {
      console.error("批量删除失败:", error);
      ElMessage.error("删除失败");
    }
  }
};

const showRecordDetail = (record) => {
  if (batchDeleteMode.value) return; // 批量删除模式下不显示详情

  selectedRecordId.value = record.id;
  detailSidebarVisible.value = true;
};

const showNewPublishDialog = () => {
  newPublishDialogVisible.value = true;
};
// 🔥 新增：处理切换到新记录的方法
const handleSwitchToRecord = async (newRecordId) => {
  console.log(`🔄 切换到新发布记录详情: ${newRecordId}`);
  
  // 先关闭当前侧边栏
  detailSidebarVisible.value = false;
  
  // 短暂延迟后切换到新记录并重新打开侧边栏
  setTimeout(() => {
    selectedRecordId.value = newRecordId;
    detailSidebarVisible.value = true;
  }, 300);
  
  // 刷新记录列表
  setTimeout(async () => {
    await loadRecords();
  }, 1000);
};
const handlePublishSuccess = (publishData) => {
  newPublishDialogVisible.value = false;
  // 延迟加载记录，确保后端任务已创建
  setTimeout(async () => {
    await loadRecords(); // 刷新列表
    
    // 如果需要显示详情，自动打开最新记录的侧边栏
    if (publishData?.showDetail && records.value.length > 0) {
      const latestRecord = records.value[0];
      selectedRecordId.value = latestRecord.id;
      detailSidebarVisible.value = true;
    }
  }, 1500); // 给后端1秒时间创建记录
};

const getStatusType = (status) => {
  const typeMap = {
    pending: "warning",
    success: "success",
    partial: "warning",
    failed: "danger",
  };
  return typeMap[status] || "info";
};

const formatTime = (timeString, isScheduledTime = false) => {
  if (!timeString) return "-";
  
  const date = new Date(timeString);
  
  if (isScheduledTime) {
    // 🔥 定时发布时间：用户输入的就是中国时间，直接显示
    return date.toLocaleString("zh-CN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit", 
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Asia/Shanghai"
    });
  } else {
    // 🔥 系统创建时间：UTC时间需要转换为中国时间显示
    const chinaTime = new Date(date.getTime() + (8 * 60 * 60 * 1000));
    return chinaTime.toLocaleString("zh-CN", {
      year: "numeric", 
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit"
    });
  }
};

const handleSizeChange = (newSize) => {
  pagination.pageSize = newSize;
  pagination.currentPage = 1;
  loadRecords();
};

const handleCurrentChange = (newPage) => {
  pagination.currentPage = newPage;
  loadRecords();
};
// 获取发布时间标签
const getPublishTimeLabel = (record) => {
  // 如果有定时发布时间，显示"定时发布"
  //if (record.scheduled_time) {
  //  return "定时发布";
  //}
  // 否则显示"发布时间"
  return "发布时间";
};

// 获取发布时间值
const getPublishTimeValue = (record) => {
  // 优先显示定时发布时间
  //if (record.scheduled_time) {
  //  return formatTime(record.scheduled_time);
  //}
  // 否则显示创建时间
  return formatTime(record.created_at,false);
};
// 获取发布记录涉及的平台列表
const getRecordPlatforms = (record) => {
  // 如果记录中有账号状态信息，从中提取平台
  if (record.account_statuses && record.account_statuses.length > 0) {
    const platforms = [...new Set(record.account_statuses.map(status => status.platform))];
    return platforms;
  }
  
  // 否则使用记录的平台显示信息
  if (record.platform_display) {
    return [record.platform_display];
  }
  
  // 默认返回空数组
  return [];
};

// 获取平台logo路径
const getPlatformLogo = (platform) => {
  const logoMap = {
    抖音: "/logos/douyin.png",
    快手: "/logos/kuaishou.png",
    视频号: "/logos/wechat_shipinghao.png",
    微信视频号: "/logos/wechat_shipinghao.png",
    小红书: "/logos/xiaohongshu.jpg",
    wechat: "/logos/wechat_shipinghao.png", // 兼容英文平台名
    douyin: "/logos/douyin.png",
    kuaishou: "/logos/kuaishou.png",
    xiaohongshu: "/logos/xiaohongshu.jpg",
  };
  return logoMap[platform] || null;
};

// 处理平台logo加载错误
const handlePlatformLogoError = (e) => {
  console.warn("平台logo加载失败:", e);
  e.target.style.display = 'none';
  // 显示备用的文字
  const parent = e.target.parentElement;
  if (parent && !parent.querySelector('.platform-text')) {
    const textDiv = document.createElement('div');
    textDiv.className = 'platform-text';
    textDiv.textContent = parent.getAttribute('title')?.charAt(0) || 'P';
    parent.appendChild(textDiv);
  }
};
// 生命周期
onMounted(() => {
  loadRecords();
  startAutoRefresh(); // 启动自动刷新  
});
onBeforeUnmount(() => {
  stopAutoRefresh();
});
</script>

<!-- PublishRecords.vue 样式部分的修改 -->

<style lang="scss" scoped>
// 🎨 现代化配色方案
$primary: #6366f1; // 深紫色主色调
$primary-dark: #4f46e5; // 深紫色悬停
$primary-light: #a5b4fc; // 浅紫色
$secondary: #64748b; // 次要文字色
$text-primary: #0f172a; // 主文字色
$text-secondary: #475569; // 次要文字色
$text-muted: #94a3b8; // 弱化文字色

$bg-white: #ffffff; // 纯白背景
$border-light: #e2e8f0; // 浅色边框
$border-lighter: #f1f5f9; // 更浅边框

// 🎨 现代化阴影
$shadow-subtle: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
$shadow-soft: 0 4px 6px -1px rgba(0, 0, 0, 0.1),
  0 2px 4px -1px rgba(0, 0, 0, 0.06);
$shadow-hover: 0 8px 25px -8px rgba(99, 102, 241, 0.25);

// 🎨 现代化圆角
$radius-sm: 6px;
$radius-md: 8px;
$radius-lg: 12px;
$radius-xl: 16px;

// 基础布局
.publish-records {
  min-height: 100vh;
  background: $bg-white; // 纯白背景
  padding: 32px 40px; // 增加内边距

  // 🎨 页面头部 - 去掉分层设计
  .page-header {
    margin-bottom: 32px;

    .header-content {
      display: flex;
      justify-content: space-between;
      align-items: center;

      .header-left {
        display: flex;
        align-items: center;
        gap: 16px;

        .page-title {
          font-size: 24px; // 🔧 从32px调整为24px，保持字体和谐
          font-weight: 600; // 🔧 调整字重
          color: $text-primary;
          margin: 0;
          letter-spacing: -0.01em; // 🔧 调整字间距
        }

        .refresh-btn {
          background: transparent;
          border: none; // 🔧 去掉边框
          border-radius: $radius-md;
          width: 36px; // 🔧 稍微缩小尺寸
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);

          &:hover {
            background: rgba(99, 102, 241, 0.08); // 🔧 淡紫色背景
            color: $primary;
            transform: translateY(-1px); // 🔧 轻微上浮
            box-shadow: 0 4px 12px rgba(99, 102, 241, 0.15); // 🔧 3D淡紫色阴影
          }
        }
        &:active {
          transform: translateY(0);
        }
      }

      .header-actions {
        .new-publish-btn {
          background: $primary;
          border: none;
          color: white;
          padding: 10px 20px;
          font-size: 14px;
          font-weight: 600;
          border-radius: $radius-lg;
          box-shadow: $shadow-soft;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);

          &:hover {
            background: $primary-dark;
            transform: translateY(-2px); // 🔧 增加悬浮效果
            box-shadow: 0 8px 25px rgba(99, 102, 241, 0.3); // 🔧 增强3D阴影
          }

          &:active {
            transform: translateY(-1px);
          }

          .el-icon {
            margin-right: 8px;
          }
        }
      }
    }
  }

  // 🔧 筛选器区域 - 去掉边框和过度效果
  .filters-section {
    background: $bg-white;
    border: none; // 🔧 去掉边框
    border-radius: $radius-lg;
    padding: 20px 24px;
    margin-bottom: 24px;
    box-shadow: none; // 🔧 去掉阴影

    .filters-row {
      display: flex;
      align-items: center;
      gap: 16px;
      flex-wrap: wrap;

      .filter-group {
        :deep(.el-select) {
          width: 160px;

          .el-input__wrapper {
            background: $bg-white;
            border: 1px solid $border-light;
            border-radius: $radius-md;
            box-shadow: none;
            transition: all 0.2s ease;

            &:hover {
              border-color: $primary;
              box-shadow: none; // 🔧 去掉悬浮阴影
            }

            &.is-focus {
              border-color: $primary;
              box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.1); // 🔧 只保留focus状态的轻微效果
            }
          }
        }
      }

      .filter-actions {
        margin-left: auto;
        display: flex;
        gap: 12px;

        .el-button {
          border-radius: $radius-md;
          font-weight: 500;
          padding: 8px 16px;
          border: 1px solid $border-light; // 🔧 恢复边框
          background: $bg-white;
          color: $text-secondary;
          box-shadow: none; // 🔧 去掉阴影
          transition: all 0.2s ease;

          &:hover {
            border-color: $primary;
            color: $primary;
            background: rgba(99, 102, 241, 0.05);
            transform: none; // 🔧 去掉悬浮效果
            box-shadow: none; // 🔧 去掉3D阴影
          }

          &:active {
            transform: none; // 🔧 去掉按压效果
          }

          &.el-button--danger {
            border-color: #ef4444;
            color: #ef4444;

            &:hover {
              background: rgba(239, 68, 68, 0.05);
              box-shadow: none; // 🔧 去掉红色3D阴影
            }
          }
        }
      }
    }
  }

  // 🔧 页面头部按钮 - 简化效果
  .page-header {
    margin-bottom: 32px;

    .header-content {
      display: flex;
      justify-content: space-between;
      align-items: center;

      .header-left {
        display: flex;
        align-items: center;
        gap: 16px;

        .page-title {
          font-size: 24px;
          font-weight: 600;
          color: $text-primary;
          margin: 0;
          letter-spacing: -0.01em;
        }

        .refresh-btn {
          background: transparent;
          border: none;
          border-radius: $radius-md;
          width: 36px;
          height: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: $text-secondary;
          transition: all 0.2s ease;

          &:hover {
            background: rgba(99, 102, 241, 0.08);
            color: $primary;
            transform: none; // 🔧 去掉悬浮效果
            box-shadow: none; // 🔧 去掉3D阴影
          }

          &:active {
            transform: none;
          }
        }
      }

      .header-actions {
        .new-publish-btn {
          background: $primary;
          border: none;
          color: white;
          padding: 10px 20px;
          font-size: 14px;
          font-weight: 600;
          border-radius: $radius-lg;
          box-shadow: none; // 🔧 去掉初始阴影
          transition: all 0.2s ease;

          &:hover {
            background: $primary-dark;
            transform: none; // 🔧 去掉悬浮效果
            box-shadow: none; // 🔧 去掉3D阴影
          }

          &:active {
            transform: none;
          }

          .el-icon {
            margin-right: 6px;
          }
        }
      }
    }
  }

  // 🎨 记录列表区域
  .records-section {
    .loading-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 16px;
      padding: 80px 24px;
      color: $text-secondary;

      .is-loading {
        font-size: 32px;
        color: $primary;
        animation: rotate 1s linear infinite;
      }
    }

    .empty-records {
      padding: 80px 24px;
      text-align: center;

      .custom-empty {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        min-height: 200px;

        .empty-text {
          color: $text-muted;
          font-size: 16px;
          font-weight: 500;
          letter-spacing: 0.02em;
        }
      }
    }
    .records-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); // 🔥 减小最小宽度
      gap: 8px; // 🔥 减小网格间距，从 14px 改为 8px
      
      @media (max-width: 1200px) {
        grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); // 🔥 进一步减小
      }

      @media (max-width: 768px) {
        grid-template-columns: 1fr;
        gap: 6px; // 🔥 移动端更紧凑
      }

      .record-card {
        background: $bg-white;
        border: 1px solid $border-light;
        border-radius: $radius-md; // 🔥 减小圆角
        padding: 6px; // 🔥 大幅减少内边距，从 10px 改为 6px
        transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        cursor: pointer;
        height: fit-content;

        &:hover {
          border-color: $primary;
          box-shadow: $shadow-hover;
          transform: translateY(-1px);
        }

        .record-content {
          display: flex;
          gap: 8px; // 🔥 减小间距，从 12px 改为 8px
          align-items: flex-start;
        }

        // 🔥 紧凑的视频预览区域
        .video-preview {
          width: 70px;        // 🔥 进一步缩小宽度，从 90px 改为 70px
          height: 125px;      // 🔥 对应调整高度 (70 * 16 / 9 ≈ 125)
          border-radius: $radius-sm;
          flex-shrink: 0;
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
          background: transparent; // 🔥 移除背景色

          // 🔥 移除外框线，确保视频填满
          :deep(.video-preview) {
            width: 100%;
            height: 100%;
            border: none; // 🔥 移除边框
            border-radius: $radius-sm;
            
            .video-container {
              width: 100%;
              height: 100%;
              border: none; // 🔥 移除边框
              border-radius: $radius-sm;
            }

            .video-player {
              border: none; // 🔥 移除边框
              border-radius: $radius-sm;
              
              video {
                border: none; // 🔥 移除边框
                border-radius: $radius-sm;
              }
            }
          }
        }

        .record-info {
          flex: 1;
          min-width: 0;

          .record-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 4px; // 🔥 进一步减少间距，从 8px 改为 4px
            gap: 6px; // 🔥 减小间距

            .record-title {
              font-size: 14px; // 🔥 稍微减小字体，从 15px 改为 14px
              font-weight: 600;
              color: $text-primary;
              margin: 0;
              line-height: 1.2; // 🔥 减小行高
              flex: 1;
              overflow: hidden;
              text-overflow: ellipsis;
              white-space: nowrap;
              min-width: 0;
            }
          }

          .header-actions {
            display: flex;
            align-items: flex-start;
            gap: 3px; // 🔥 减小间距，从 4px 改为 3px
            margin-left: auto;
            flex-shrink: 0;

            :deep(.el-tag) {
              border-radius: $radius-sm;
              font-weight: 500;
              border: none;
              font-size: 9px; // 🔥 进一步减小字体，从 10px 改为 9px
              padding: 1px 3px; // 🔥 减少内边距
              max-width: 60px; // 🔥 减少最大宽度
              overflow: hidden;
              text-overflow: ellipsis;
              white-space: nowrap;
            }

            .action-dropdown .more-btn {
              width: 18px; // 🔥 减小尺寸，从 20px 改为 18px
              height: 18px;
              padding: 0;
              color: $text-muted;

              .el-icon {
                font-size: 12px; // 🔥 减小图标，从 14px 改为 12px
              }
            }
          }

          .record-meta {
            display: flex;
            flex-wrap: wrap;
            gap: 12px; // 🔥 减少间距，从 16px 改为 12px
            margin-bottom: 4px; // 🔥 减少间距，从 8px 改为 4px

            .meta-item.platforms .platform-logos {
              display: flex;
              gap: 2px; // 🔥 进一步减少间距，从 3px 改为 2px
              align-items: center;

              .platform-logo-item {
                width: 14px; // 🔥 减小尺寸，从 16px 改为 14px
                height: 14px;
                border-radius: 50%;
                background: white;
                display: flex;
                align-items: center;
                justify-content: center;
                box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
                border: 1px solid $border-light;

                img {
                  width: 12px; // 🔥 减小尺寸，从 14px 改为 12px
                  height: 12px;
                  border-radius: 50%;
                  object-fit: cover;
                }

                .platform-text {
                  font-size: 8px; // 🔥 减小字体，从 9px 改为 8px
                  font-weight: 600;
                  color: $text-primary;
                  line-height: 1;
                }
              }
            }
          }

          .record-footer {
            .time-info {
              display: flex;
              flex-direction: column;
              gap: 1px; // 🔥 减小间距，从 2px 改为 1px
              font-size: 11px; // 🔥 减小字体，从 12px 改为 11px
              color: $text-muted;

              .publish-time,
              .scheduled-time {
                display: flex;
                align-items: center;
                gap: 3px; // 🔥 减小间距，从 4px 改为 3px

                .time-label {
                  font-weight: 500;
                  color: $text-secondary;
                }

                .time-value {
                  font-weight: 600;
                  color: $text-primary;
                }
              }

              .scheduled-time {
                .time-label,
                .time-value {
                  color: $primary;
                }
              }
            }
          }
        }
      }
    }

    // 🎨 分页样式
    .pagination-section {
      margin-top: 32px;
      display: flex;
      justify-content: center;

      :deep(.el-pagination) {
        .el-pager li {
          border-radius: $radius-sm;
          margin: 0 2px;

          &.is-active {
            background: $primary;
            border-color: $primary;
          }
        }

        .btn-prev,
        .btn-next {
          border-radius: $radius-sm;
        }
      }
    }
  }
}
:deep(.el-dropdown-menu__item.delete-item) {
  color: #ef4444 !important;
  
  &:hover {
    background-color: rgba(239, 68, 68, 0.1) !important;
    color: #dc2626 !important;
  }
  
  .el-icon {
    color: inherit !important;
  }
}
// 🎨 动画效果
@keyframes rotate {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

/* 🎨 响应式设计优化 */
@media (max-width: 768px) {
  .publish-records {
    padding: 16px 20px;

    .page-header .header-content {
      flex-direction: column;
      align-items: stretch;
      gap: 16px;

      .header-left {
        justify-content: space-between;

        .page-title {
          font-size: 24px;
        }
      }
    }

    .filters-section .filters-row {
      flex-direction: column;
      align-items: stretch;

      .filter-group {
        :deep(.el-select) {
          width: 100%;
        }
      }

      .filter-actions {
        margin-left: 0;
        justify-content: stretch;

        > * {
          flex: 1;
        }
      }
    }

    .records-grid .record-card {
      padding: 16px;

      .record-content {
        flex-direction: column;
        gap: 12px;
      }

      .video-preview {
        width: 100%;
        height: 80px;
      }
    }
  }
}
</style>
