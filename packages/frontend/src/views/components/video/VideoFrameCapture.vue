<template>
  <el-dialog
    v-model="dialogVisible"
    title="选择封面"
    width="400px"
    :close-on-click-modal="false"
    class="video-frame-capture-dialog"
  >
    <div class="capture-content">
      <!-- 视频播放器 -->
      <div class="video-player-section">
        <div class="video-container">
          <video
            ref="videoElement"
            :src="videoUrl"
            controls
            @loadedmetadata="handleVideoLoaded"
            @timeupdate="handleTimeUpdate"
            @seeked="handleSeeked"
            @error="handleVideoError"
            :width="videoWidth"
            :height="videoHeight"
          >
            您的浏览器不支持视频播放
          </video>
          
          <!-- 加载状态 -->
          <div v-if="loading" class="video-loading">
            <el-icon class="rotating"><Loading /></el-icon>
            <span>视频加载中...</span>
          </div>

          <!-- 错误状态 -->
          <div v-if="error" class="video-error">
            <el-icon><VideoCamera /></el-icon>
            <span>{{ error }}</span>
          </div>
        </div>
      </div>

      <!-- 隐藏的画布用于截图 -->
      <canvas
        ref="captureCanvas"
        style="display: none;"
      ></canvas>
    </div>

    <template #footer>
      <div class="dialog-footer">
        <el-button @click="handleCancel">取消</el-button>
        <el-button type="primary" @click="handleCapture" :disabled="!canCapture">
          确认选择
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, computed, watch, nextTick } from 'vue';
import {
  Loading,
  VideoCamera
} from '@element-plus/icons-vue';
import { ElMessage } from 'element-plus';

// Props
const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  videoUrl: {
    type: String,
    default: ''
  }
});

// Emits
const emit = defineEmits(['update:visible', 'captured']);

// 响应式数据
const videoElement = ref(null);
const captureCanvas = ref(null);
const loading = ref(false);
const error = ref('');
const currentTime = ref(0);
const duration = ref(0);
const videoWidth = ref(300);
const videoHeight = ref(400);
const originalVideoWidth = ref(0);
const originalVideoHeight = ref(0);

// 计算属性
const dialogVisible = computed({
  get: () => props.visible,
  set: (value) => emit('update:visible', value)
});

const canCapture = computed(() => {
  const result = !loading.value && !error.value && duration.value > 0 && videoElement.value;
  
  // 调试信息
  console.log('🔍 canCapture 状态检查:', {
    loading: loading.value,
    error: error.value,
    duration: duration.value,
    hasVideoElement: !!videoElement.value,
    result: result,
    timestamp: Date.now()
  });
  
  return result;
});

// 监听器
watch(() => props.visible, async (visible) => {
  if (visible && props.videoUrl) {
    console.log('对话框打开，开始加载视频:', props.videoUrl);
    await loadVideo();
  } else if (!visible) {
    // 关闭时停止播放，但不重置其他状态
    if (videoElement.value) {
      videoElement.value.pause();
    }
  }
});

watch(() => props.videoUrl, async (newUrl) => {
  if (newUrl && props.visible) {
    console.log('视频URL变化，重新加载:', newUrl);
    await loadVideo();
  }
});

// 方法
const loadVideo = async () => {
  if (!props.videoUrl || !videoElement.value) return;

  loading.value = true;
  error.value = '';
  currentTime.value = 0;
  duration.value = 0;

  try {
    await nextTick();
    
    const video = videoElement.value;
    video.currentTime = 0;
    
    // 检查视频是否已经加载完成
    if (video.readyState >= 1) {
      console.log('🎯 视频已缓存，直接处理');
      handleVideoLoaded();
      return;
    }
    
    await new Promise((resolve, reject) => {
      const onLoaded = () => {
        video.removeEventListener('loadedmetadata', onLoaded);
        video.removeEventListener('error', onError);
        resolve();
      };
      
      const onError = () => {
        video.removeEventListener('loadedmetadata', onLoaded);
        video.removeEventListener('error', onError);
        reject(new Error('视频加载失败'));
      };
      
      video.addEventListener('loadedmetadata', onLoaded);
      video.addEventListener('error', onError);
    });

  } catch (err) {
    error.value = err.message || '视频加载失败';
    console.error('视频加载失败:', err);
  } finally {
    loading.value = false;
  }
};

const handleVideoLoaded = () => {
  const video = videoElement.value;
  if (!video) return;

  duration.value = video.duration;
  currentTime.value = 0;
  
  // 设置显示尺寸 (3:4比例)
  const targetRatio = 3 / 4;
  const videoRatio = video.videoWidth / video.videoHeight;
  
  if (videoRatio > targetRatio) {
    // 视频比目标比例更宽，以高度为准
    videoHeight.value = 400;
    videoWidth.value = Math.round(400 * targetRatio);
  } else {
    // 视频比目标比例更窄，以宽度为准
    videoWidth.value = 300;
    videoHeight.value = Math.round(300 / targetRatio);
  }

  // 记录原始视频尺寸
  originalVideoWidth.value = video.videoWidth;
  originalVideoHeight.value = video.videoHeight;

  console.log('✅ 视频加载完成:', {
    duration: duration.value,
    original: { width: originalVideoWidth.value, height: originalVideoHeight.value },
    display: { width: videoWidth.value, height: videoHeight.value },
    readyState: video.readyState,
    timestamp: Date.now()
  });
};

const handleTimeUpdate = () => {
  if (videoElement.value) {
    currentTime.value = videoElement.value.currentTime;
  }
};

const handleSeeked = () => {
  if (videoElement.value) {
    currentTime.value = videoElement.value.currentTime;
  }
};

const handleCapture = async () => {
  const video = videoElement.value;
  const canvas = captureCanvas.value;
  
  if (!video || !canvas) {
    ElMessage.error('视频未准备好');
    return;
  }

  try {
    // 使用原始视频尺寸进行截图以保持高清晰度
    canvas.width = originalVideoWidth.value;
    canvas.height = originalVideoHeight.value;
    
    const ctx = canvas.getContext('2d');
    
    // 确保视频在当前时间点
    video.currentTime = currentTime.value;
    
    // 等待视频帧更新
    await new Promise(resolve => {
      const checkFrame = () => {
        if (Math.abs(video.currentTime - currentTime.value) < 0.1) {
          resolve();
        } else {
          requestAnimationFrame(checkFrame);
        }
      };
      checkFrame();
    });
    
    // 绘制高清截图
    ctx.drawImage(video, 0, 0, originalVideoWidth.value, originalVideoHeight.value);
    
    // 获取高质量图片数据
    const dataURL = canvas.toDataURL('image/jpeg', 0.95);
    
    emit('captured', dataURL);
    
    dialogVisible.value = false;
    ElMessage.success('封面截取成功');
    
  } catch (err) {
    console.error('截取失败:', err);
    ElMessage.error('截取失败，请重试');
  }
};

const handleCancel = () => {
  // 停止播放
  if (videoElement.value) {
    videoElement.value.pause();
  }
  
  dialogVisible.value = false;
};

const handleVideoError = (event) => {
  error.value = '视频播放出错';
  console.error('视频播放错误:', event);
};

const formatTime = (seconds) => {
  if (!seconds || isNaN(seconds)) return '00:00';
  
  const minutes = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};
</script>

<style lang="scss" scoped>
$primary: #6366f1;
$success: #10b981;
$danger: #ef4444;
$bg-white: #ffffff;
$bg-light: #f8fafc;
$bg-gray: #f1f5f9;
$text-primary: #0f172a;
$text-secondary: #475569;
$text-muted: #94a3b8;
$border-light: #e2e8f0;
$radius-md: 8px;
$radius-lg: 12px;
$space-sm: 8px;
$space-md: 16px;
$space-lg: 24px;

.video-frame-capture-dialog {
  :deep(.el-dialog) {
    border-radius: $radius-lg;
  }

  :deep(.el-dialog__body) {
    padding: $space-lg;
  }

  .capture-content {
    display: flex;
    flex-direction: column;
    align-items: center;

    .video-player-section {
      width: 100%;
      display: flex;
      flex-direction: column;
      align-items: center;

      .video-container {
        position: relative;
        border-radius: $radius-md;
        overflow: hidden;
        margin-bottom: $space-md;
        display: flex;
        justify-content: center;
        align-items: center;

        video {
          border-radius: $radius-md;
          object-fit: cover;
          background: transparent;
        }

        .video-loading,
        .video-error {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: $space-sm;
          color: white;
          z-index: 10;

          .el-icon {
            font-size: 32px;
            
            &.rotating {
              animation: rotate 2s linear infinite;
            }
          }

          span {
            font-size: 14px;
          }
        }

        .video-error {
          color: $danger;
        }
      }

      .time-display {
        text-align: center;
        font-size: 14px;
        font-weight: 500;
        color: $text-primary;
        background: $bg-light;
        padding: 6px 12px;
        border-radius: $radius-md;
        border: 1px solid $border-light;
      }
    }
  }

  .dialog-footer {
    display: flex;
    justify-content: flex-end;
    gap: $space-sm;
  }
}

@keyframes rotate {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

// 响应式设计
@media (max-width: 480px) {
  .video-frame-capture-dialog {
    :deep(.el-dialog) {
      width: 95vw;
      margin: 5vh auto;
    }
    
    .capture-content {
      .video-player-section {
        .video-container {
          video {
            max-width: 250px;
            max-height: 334px;
          }
        }
      }
    }
  }
}
</style>