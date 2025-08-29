<template>
  <el-dialog
    v-model="dialogVisible"
    title="选择视频"
    width="80%"
    class="material-selector-dialog"
    :close-on-click-modal="false"
  >
    <div class="material-selector">
      <!-- 加载状态 -->
      <div v-if="loading" class="loading-container">
        <el-icon class="is-loading"><Loading /></el-icon>
        <span>加载视频中...</span>
      </div>

      <!-- 视频内容 -->
      <div v-else class="videos-content">
        <!-- 标签页切换 -->
        <el-tabs v-model="activeTab" class="video-tabs">
          <!-- 最近上传 -->
          <el-tab-pane label="最近上传" name="recent">
            <div class="tab-content">
              <div v-if="recentVideos.length > 0">
                <div class="videos-header">
                  <h5>最近上传的视频 ({{ recentVideos.length }} 个)</h5>
                  <div class="selection-info">
                    <span v-if="selectedRecentIds.length > 0">
                      已选择 {{ selectedRecentIds.length }} 个视频
                    </span>
                    <el-button
                      v-if="selectedRecentIds.length > 0"
                      size="small"
                      @click="clearRecentSelection"
                    >
                      清空选择
                    </el-button>
                  </div>
                </div>

                <div class="videos-grid">
                  <div
                    v-for="video in recentVideos"
                    :key="`recent_${video.id}`"
                    :class="[
                      'video-item',
                      {
                        selected: selectedRecentIds.includes(video.id),
                      },
                    ]"
                    @click="toggleRecentSelection(video.id)"
                  >
                    <!-- 视频预览 -->
                    <div class="video-preview">
                      <VideoPreview
                        :videos="[formatVideoForPreview(video, 'recent')]"
                        mode="record"
                        size="small"
                        :clickable="true"
                        @video-click="handleRecentVideoDirectPlay"
                      />
                      <!-- 🔥 移除播放按钮覆盖层，直接使用 VideoPreview 的内置播放功能 -->
                      
                      <!-- 选中标记 -->
                      <div
                        v-if="selectedRecentIds.includes(video.id)"
                        class="selected-mark"
                      >
                        <el-icon><Check /></el-icon>
                      </div>
                      <!-- 来源标记 -->
                      <div class="source-badge recent">最近</div>
                    </div>

                    <!-- 视频信息 -->
                    <div class="video-info">
                      <div class="video-name" :title="video.filename">
                        {{ video.filename }}
                      </div>
                      <div class="video-meta">
                        <span class="video-size">{{ video.filesize }} MB</span>
                        <span class="video-date">{{ formatDate(video.upload_time) }}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div v-else class="empty-videos">
                <el-empty description="暂无最近上传的视频" />
              </div>
            </div>
          </el-tab-pane>

          <!-- 素材库 -->
          <el-tab-pane label="素材库" name="library">
            <div class="tab-content">
              <div v-if="libraryMaterials.length > 0">
                <div class="videos-header">
                  <h5>素材库视频 ({{ libraryMaterials.length }} 个)</h5>
                  <div class="selection-info">
                    <span v-if="selectedLibraryIds.length > 0">
                      已选择 {{ selectedLibraryIds.length }} 个素材
                    </span>
                    <el-button
                      v-if="selectedLibraryIds.length > 0"
                      size="small"
                      @click="clearLibrarySelection"
                    >
                      清空选择
                    </el-button>
                  </div>
                </div>

                <div class="videos-grid">
                  <div
                    v-for="material in libraryMaterials"
                    :key="`library_${material.id}`"
                    :class="[
                      'video-item',
                      {
                        selected: selectedLibraryIds.includes(material.id),
                      },
                    ]"
                    @click="toggleLibrarySelection(material.id)"
                  >
                    <!-- 视频预览 -->
                    <div class="video-preview">
                      <VideoPreview
                        :videos="[formatVideoForPreview(material, 'library')]"
                        mode="record"
                        size="small"
                        :clickable="true"
                        @video-click="previewLibraryMaterial"
                      />

                      <!-- 选中标记 -->
                      <div
                        v-if="selectedLibraryIds.includes(material.id)"
                        class="selected-mark"
                      >
                        <el-icon><Check /></el-icon>
                      </div>
                      <!-- 来源标记 -->
                      <div class="source-badge library">素材库</div>
                    </div>

                    <!-- 视频信息 -->
                    <div class="video-info">
                      <div class="video-name" :title="material.filename">
                        {{ material.filename }}
                      </div>
                      <div class="video-meta">
                        <span class="video-size"
                          >{{ material.filesize }} MB</span
                        >
                        <span class="video-date">{{
                          formatDate(material.upload_time)
                        }}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div v-else class="empty-videos">
                <el-empty description="暂无素材库视频" />
              </div>
            </div>
          </el-tab-pane>
        </el-tabs>
      </div>
    </div>

    <template #footer>
      <div class="dialog-footer">
        <el-button @click="handleCancel">取消</el-button>
        <el-button
          type="primary"
          @click="handleConfirm"
          :disabled="getTotalSelectedCount() === 0"
        >
          确认选择 ({{ getTotalSelectedCount() }})
        </el-button>
      </div>
    </template>
  </el-dialog>
  <el-dialog
    v-model="videoDialogVisible"
    title="视频预览"
    width="50%"
    :modal="false"
    :append-to-body="true"
    class="video-preview-dialog"
    @close="handleVideoDialogClose"
  >
    <div class="video-player-container">
      <video 
        ref="previewVideoRef"
        v-if="currentPreviewVideo" 
        :src="currentPreviewVideo.url" 
        controls 
        autoplay
        style="width: 100%; height: 300px; border-radius: 8px; object-fit: contain;"
      >
      </video>
    </div>
  </el-dialog>
</template>

<script setup>
// 在 MaterialSelector.vue 的 <script setup> 部分替换现有代码
import VideoPreview from "./video/VideoPreview.vue";
import { ref, computed, watch } from "vue";
import { Loading, VideoPlay, View, Check } from "@element-plus/icons-vue";
import { ElMessage } from "element-plus";
import { nextTick } from "vue";
const videoDialogVisible = ref(false);
const currentPreviewVideo = ref(null);
const previewVideoRef = ref(null); 
const showVideoDialog = (video) => {
  currentPreviewVideo.value = video;
  videoDialogVisible.value = true;
};
// Props
const props = defineProps({
  visible: {
    type: Boolean,
    default: false,
  },
  defaultTab: {
    type: String,
    default: "recent",
  },
});

// Emits
const emit = defineEmits(["update:visible", "selected"]);

// 🔍 调试：组件初始化日志
console.log("🔍 MaterialSelector 组件初始化");

// API配置
const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:3409";
const authHeaders = computed(() => ({
  Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
}));

const loading = ref(false);
const activeTab = ref("recent");
const recentVideos = ref([]);
const libraryMaterials = ref([]);
const selectedRecentIds = ref([]);
const selectedLibraryIds = ref([]);
// 新增：处理视频对话框关闭
const handleVideoDialogClose = () => {
  // 停止视频播放
  if (previewVideoRef.value) {
    previewVideoRef.value.pause();
    previewVideoRef.value.currentTime = 0; // 重置播放进度
  }
  videoDialogVisible.value = false;
  currentPreviewVideo.value = null;
};

// 新增：监听对话框关闭
watch(videoDialogVisible, (newValue) => {
  if (!newValue && previewVideoRef.value) {
    previewVideoRef.value.pause();
    previewVideoRef.value.currentTime = 0;
  }
});
watch(() => props.defaultTab, (newTab) => {
  if (newTab) {
    activeTab.value = newTab;
  }
}, { immediate: true });
// 🔍 调试：监控 props.visible 的变化
watch(
  () => props.visible,
  (newValue, oldValue) => {
    console.log("📊 MaterialSelector props.visible 变化:", {
      old: oldValue,
      new: newValue,
      timestamp: new Date().toISOString(),
      stack: new Error().stack.split("\n").slice(0, 5), // 只显示前5行调用栈
    });
  },
  { immediate: true }
);

// 🔍 调试：使用标志位防止循环的 dialogVisible
let isUpdatingDialogVisible = false;
const formatVideoForPreview = (video, source) => {
  let videoUrl;

  if (source === "recent") {
    videoUrl = `${apiBaseUrl}/getFile?filename=${video.file_path}`;
  } else {
    // 素材库视频
    const filename = video.file_path
      ? video.file_path.split("/").pop()
      : video.filename;
    videoUrl = `${apiBaseUrl}/getFile?filename=${filename}`;
  }

  return {
    name: video.filename,
    path: video.file_path || video.filename,
    url: videoUrl,
    size: (video.filesize || 0) * 1024 * 1024,
    type: "video/mp4",
    id: `${source}_${video.id}`,
    source: source,
  };
};
const dialogVisible = computed({
  get: () => {
    console.log("📥 MaterialSelector dialogVisible get:", props.visible);
    return props.visible;
  },
  set: (value) => {
    console.log("📤 MaterialSelector dialogVisible set:", {
      current: props.visible,
      new: value,
      isUpdating: isUpdatingDialogVisible,
      timestamp: new Date().toISOString(),
      stack: new Error().stack.split("\n").slice(0, 3), // 只显示前3行调用栈
    });

    // 防止循环更新
    if (isUpdatingDialogVisible) {
      console.log("⚠️ MaterialSelector 跳过设置，正在更新中");
      return;
    }

    if (value !== props.visible) {
      console.log("✅ MaterialSelector 准备发射 update:visible:", value);
      isUpdatingDialogVisible = true;
      emit("update:visible", value);

      // 在下一个 tick 重置标志位
      nextTick(() => {
        isUpdatingDialogVisible = false;
        console.log("🔄 MaterialSelector 重置更新标志位");
      });
    } else {
      console.log("⚠️ MaterialSelector 跳过发射，值相同");
    }
  },
});

// 计算属性
const getTotalSelectedCount = () => {
  return selectedRecentIds.value.length + selectedLibraryIds.value.length;
};

const loadAllVideoSources = async () => {
  console.log("🚀 MaterialSelector 开始加载视频源");
  loading.value = true;
  try {
    const [recentResponse, libraryResponse] = await Promise.all([
      fetch(`${apiBaseUrl}/getRecentUploads`, {
        headers: authHeaders.value,
      }).then((res) => res.json()),
      fetch(`${apiBaseUrl}/getFiles`, {
        headers: authHeaders.value,
      }).then((res) => res.json()),
    ]);

    // 使用 nextTick 确保 DOM 更新完成
    await nextTick();

    if (recentResponse.code === 200) {
      // 🔥 限制最近上传的视频只显示最新的4个
      const recentData = (recentResponse.data || [])
        .sort((a, b) => new Date(b.upload_time) - new Date(a.upload_time)) // 按时间倒序排列
        .slice(0, 6); // 只取前4个
      
      recentVideos.value = [...recentData];
      //console.log("✅ MaterialSelector 最近上传的视频:", recentVideos.value.length);
    } else {
      //console.error("❌ MaterialSelector 获取最近上传视频失败:", recentResponse.msg);
      recentVideos.value = [];
    }

    if (libraryResponse.code === 200) {
      const filteredMaterials = (libraryResponse.data || []).filter(
        (material) => isVideoFile(material.filename)
      );
      libraryMaterials.value = [...filteredMaterials];
      console.log(
        "✅ MaterialSelector 素材库视频:",
        libraryMaterials.value.length
      );
    } else {
      console.error(
        "❌ MaterialSelector 获取素材库视频失败:",
        libraryResponse.msg
      );
      libraryMaterials.value = [];
    }
  } catch (error) {
    console.error("❌ MaterialSelector 获取视频列表出错:", error);
    ElMessage.error("获取视频列表失败");
    recentVideos.value = [];
    libraryMaterials.value = [];
  } finally {
    loading.value = false;
    console.log("🏁 MaterialSelector 视频源加载完成");
  }
};

// 🔍 调试：监控 visible 变化的 watch
watch(
  () => props.visible,
  async (newVisible, oldVisible) => {
    console.log("🎬 MaterialSelector visible watch 触发:", {
      old: oldVisible,
      new: newVisible,
      timestamp: new Date().toISOString(),
    });

    if (newVisible) {
      console.log("👁️ MaterialSelector 对话框显示，开始初始化");
      clearAllSelections();
      await nextTick();
      await loadAllVideoSources();
    } else {
      console.log("👁️‍🗨️ MaterialSelector 对话框隐藏");
    }
  },
  { immediate: false }
);

const isVideoFile = (filename) => {
  const videoExtensions = [
    ".mp4",
    ".avi",
    ".mov",
    ".mkv",
    ".flv",
    ".wmv",
    ".webm",
    ".m4v",
    ".3gp",
  ];
  return videoExtensions.some((ext) => filename.toLowerCase().endsWith(ext));
};
const handleRecentVideoDirectPlay = (videoData) => {
  console.log("🎬 最近视频直接播放:", videoData.name);
  // 阻止事件冒泡，防止触发选择逻辑
  event?.stopPropagation?.();
  
  // 直接播放视频，不弹出对话框
  // VideoPreview 组件内部会处理播放逻辑
};
const toggleRecentSelection = (videoId) => {
  const index = selectedRecentIds.value.indexOf(videoId);
  if (index > -1) {
    selectedRecentIds.value.splice(index, 1);
  } else {
    selectedRecentIds.value.push(videoId);
  }
};

const toggleLibrarySelection = (materialId) => {
  const index = selectedLibraryIds.value.indexOf(materialId);
  if (index > -1) {
    selectedLibraryIds.value.splice(index, 1);
  } else {
    selectedLibraryIds.value.push(materialId);
  }
};

const clearRecentSelection = () => {
  selectedRecentIds.value = [];
};

const clearLibrarySelection = () => {
  selectedLibraryIds.value = [];
};

const clearAllSelections = () => {
  console.log("🧹 MaterialSelector 清空所有选择");
  selectedRecentIds.value = [];
  selectedLibraryIds.value = [];
};

const previewRecentVideo = (videoData) => {
  // videoData 现在是格式化后的视频对象
  window.open(videoData.url, "_blank");
};

const previewLibraryMaterial = (videoData) => {
  // videoData 现在是格式化后的视频对象
  window.open(videoData.url, "_blank");
};

const formatDate = (dateString) => {
  if (!dateString) return "-";
  const date = new Date(dateString);
  return date.toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
};

const handleCancel = () => {
  console.log("❌ MaterialSelector 用户点击取消按钮");
  clearAllSelections();
  // 🔍 直接设置为 false，不触发计算属性
  emit("update:visible", false);
};

const handleConfirm = () => {
  console.log("✅ MaterialSelector 用户点击确认按钮");
  const selectedVideos = [];

  // 处理最近上传的视频
  const selectedRecentVideos = recentVideos.value.filter((video) =>
    selectedRecentIds.value.includes(video.id)
  );

  selectedRecentVideos.forEach((video) => {
    selectedVideos.push({
      name: video.filename,
      path: video.file_path,
      url: `${apiBaseUrl}/getFile?filename=${video.file_path}`,
      size: (video.filesize || 0) * 1024 * 1024,
      type: "video/mp4",
      id: `recent_${video.id}`,
      source: "recent",
    });
  });

  // 处理素材库视频
  const selectedLibraryMaterials = libraryMaterials.value.filter((material) =>
    selectedLibraryIds.value.includes(material.id)
  );

  selectedLibraryMaterials.forEach((material) => {
    const filename = material.file_path
      ? material.file_path.split("/").pop()
      : material.filename;
    selectedVideos.push({
      name: material.filename,
      path: material.file_path || material.filename,
      url: `${apiBaseUrl}/getFile?filename=${filename}`,
      size: (material.filesize || 0) * 1024 * 1024,
      type: "video/mp4",
      id: `library_${material.id}`,
      source: "library",
    });
  });

  if (selectedVideos.length === 0) {
    ElMessage.warning("请选择至少一个视频");
    return;
  }

  console.log("📤 MaterialSelector 发射选中的视频:", selectedVideos.length);
  emit("selected", selectedVideos);
  emit("update:visible", false);
  clearAllSelections();
};
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
$shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1),
  0 2px 4px -1px rgba(0, 0, 0, 0.06);

$radius-sm: 4px;
$radius-md: 8px;
$radius-lg: 12px;
$radius-xl: 16px;

$space-xs: 4px;
$space-sm: 8px;
$space-md: 16px;
$space-lg: 24px;
$space-xl: 32px;

.material-selector-dialog {
  :deep(.el-dialog) {
    border-radius: $radius-xl;
  }

  .material-selector {
    .loading-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: $space-md;
      padding: $space-xl;
      color: $text-secondary;

      .is-loading {
        font-size: 32px;
        animation: rotate 1s linear infinite;
      }
    }

    .videos-content {
      .video-tabs {
        :deep(.el-tabs__header) {
          margin-bottom: $space-lg;
        }

        :deep(.el-tabs__nav-wrap) {
          background: $bg-gray;
          border-radius: $radius-md;
          padding: $space-xs;
        }

        :deep(.el-tabs__active-bar) {
          display: none;
        }

        :deep(.el-tabs__item) {
          padding: $space-sm $space-lg;
          border-radius: $radius-sm;
          font-weight: 500;
          transition: all 0.3s ease;

          &.is-active {
            background: white;
            color: $primary;
            box-shadow: $shadow-sm;
          }
        }
      }

      .tab-content {
        .videos-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: $space-lg;

          h5 {
            font-size: 16px;
            font-weight: 600;
            color: $text-primary;
            margin: 0;
          }

          .selection-info {
            display: flex;
            align-items: center;
            gap: $space-md;
            font-size: 14px;
            color: $text-secondary;
          }
        }
        .videos-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); // 🔥 减小网格列宽以适应竖屏
          gap: $space-sm;
          max-height: 600px; // 🔥 增加整体高度以容纳竖屏视频
          overflow-y: auto;

          .video-item {
            background: $bg-gray;
            border: 2px solid transparent;
            border-radius: $radius-lg;
            overflow: hidden;
            cursor: pointer;
            transition: all 0.3s ease;

            &:hover {
              transform: translateY(-2px);
              box-shadow: $shadow-md;
            }

            &.selected {
              border-color: $primary;
              box-shadow: 0 0 0 2px rgba(91, 115, 222, 0.2);
            }

            .video-preview {
              height: 200px; // 🔥 关键修改：大幅增加高度以适应竖屏比例 (140 * 16 / 9 ≈ 250px)
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              display: flex;
              align-items: center;
              justify-content: center;
              position: relative;
              overflow: hidden;

              // 🔥 确保内部组件使用正确的竖屏比例
              :deep(.video-preview.mode-record) {
                width: 100%;
                height: 100%;
                border: none;
                border-radius: 0;
                background: transparent;

                .video-container {
                  width: 100%;
                  height: 100%;
                  border: none;
                  border-radius: 0;
                  background: transparent;
                  aspect-ratio: 9 / 16; // 🔥 竖屏比例
                }

                .video-player {
                  width: 100%;
                  height: 100%;
                  border-radius: 0;
                  aspect-ratio: 9 / 16; // 🔥 竖屏比例

                  video {
                    width: 100%;
                    height: 100%;
                    object-fit: cover; // 🔥 填满容器
                    border-radius: 0;
                  }
                }
              }

              .play-overlay {
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                opacity: 0;
                transition: opacity 0.2s ease;
                z-index: 5;

                .el-button {
                  background: rgba(0, 0, 0, 0.7);
                  border: none;
                  color: white;
                  width: 32px;
                  height: 32px;
                  
                  &:hover {
                    background: rgba(0, 0, 0, 0.8);
                  }

                  .el-icon {
                    font-size: 14px;
                  }
                }
              }

              &:hover .play-overlay {
                opacity: 1;
              }

              .selected-mark {
                position: absolute;
                top: 6px;
                right: 6px;
                width: 20px;
                height: 20px;
                background-color: $primary;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                color: white;
                font-size: 12px;
                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
                z-index: 10;
              }

              .source-badge {
                position: absolute;
                top: 6px;
                left: 6px;
                padding: 1px 6px;
                border-radius: 4px;
                font-size: 10px;
                font-weight: 500;
                color: white;
                z-index: 10;

                &.recent {
                  background-color: $warning;
                }

                &.library {
                  background-color: $success;
                }
              }
            }

            .video-info {
              padding: $space-sm;

              .video-name {
                font-weight: 500;
                color: $text-primary;
                margin-bottom: 4px;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
                font-size: 13px;
              }

              .video-meta {
                display: flex;
                justify-content: space-between;
                font-size: 11px;
                color: $text-secondary;

                .video-size {
                  font-weight: 500;
                }
              }
            }
          }
        }

        // 🔥 针对最近上传标签页的特殊优化
        [aria-labelledby="tab-recent"] .videos-grid {
          // 最近上传只显示4个，可以使用稍大的网格但保持竖屏比例
          grid-template-columns: repeat(4, 1fr); // 🔥 4列网格，每列相等
          max-height: 350px; // 🔥 适中的最大高度
          gap: $space-md; // 🔥 稍大的间距

          .video-item {
            .video-preview {
              height: 180px; // 🔥 适中的高度，确保竖屏比例
            }
          }
        }
        // 🔥 针对最近上传标签页的特殊样式
        .el-tab-pane[aria-labelledby="tab-recent"] {
          .videos-grid {
            // 最近上传只显示4个，可以使用更大的网格
            grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); // 稍大一些，因为只有4个
            max-height: 200px; // 减小最大高度
          }
        }
        .empty-videos {
          padding: $space-xl;
          text-align: center;
        }
      }
    }
  }
.video-preview-dialog {
  :deep(.el-dialog) {
    position: relative;
    z-index: 3000; // 确保在 MaterialSelector 对话框之上
    max-height: 80vh; // 限制最大高度
  }
  
  :deep(.el-dialog__body) {
    padding: 10px 20px; // 减少内边距
  }
  
  .video-player-container {
    display: flex;
    justify-content: center;
    align-items: center;
  }
}
  .dialog-footer {
    display: flex;
    justify-content: flex-end;
    gap: $space-sm;
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
  .material-selector-dialog {
    .material-selector {
      .videos-content {
        .tab-content {
          .videos-grid {
            grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
            max-height: 300px;
          }
        }
      }
    }
  }
}
</style>
