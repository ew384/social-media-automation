<template>
  <el-dialog
    v-model="dialogVisible"
    title="剪切封面"
    width="520px"
    :close-on-click-modal="false"
    class="cover-cropper-dialog"
  >
    <div class="cropper-content">
      <!-- 封面展示区域 -->
      <div class="cover-display-section">
        <div class="cover-container">
          <div v-if="loading" class="image-loading">
            <el-icon class="rotating"><Loading /></el-icon>
            <span>图片加载中...</span>
          </div>

          <div v-else-if="error" class="image-error">
            <el-icon><Picture /></el-icon>
            <span>{{ error }}</span>
          </div>

          <div v-else class="image-wrapper">
            <img
              ref="imageElement"
              :src="imageUrl"
              @load="handleImageLoad"
              @error="handleImageError"
              class="cover-image"
            />
            
            <!-- 裁剪框覆盖层 -->
            <div
              v-if="showCropBox"
              class="crop-overlay"
              :style="cropOverlayStyle"
            >
              <div class="crop-box" :style="cropBoxStyle">
                <!-- 裁剪框边框 -->
                <div class="crop-border"></div>
                <!-- 网格线 -->
                <div class="crop-grid">
                  <div class="grid-line grid-line-v"></div>
                  <div class="grid-line grid-line-v"></div>
                  <div class="grid-line grid-line-h"></div>
                  <div class="grid-line grid-line-h"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 控制面板 -->
      <div class="control-panel">
        <div class="section-title">选择比例</div>
        <div class="ratio-buttons">
          <el-button
            v-for="ratio in aspectRatios"
            :key="ratio.key"
            :type="selectedRatio === ratio.key ? 'primary' : 'default'"
            size="default"
            @click="selectRatio(ratio.key)"
            class="ratio-btn"
          >
            {{ ratio.label }}
          </el-button>
        </div>
      </div>
    </div>

    <template #footer>
      <div class="dialog-footer">
        <el-button @click="handleCancel">取消</el-button>
        <el-button type="primary" @click="handleCrop" :disabled="!canCrop">
          确定
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, computed, watch, reactive, nextTick } from 'vue';
import { Loading, Picture } from '@element-plus/icons-vue';
import { ElMessage } from 'element-plus';

// Props
const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  imageUrl: {
    type: String,
    default: ''
  }
});

// Emits
const emit = defineEmits(['update:visible', 'cropped']);

// 响应式数据
const imageElement = ref(null);
const loading = ref(false);
const error = ref('');
const showCropBox = ref(false);
const selectedRatio = ref('原始比例');

// 图片信息
const imageInfo = reactive({
  naturalWidth: 0,
  naturalHeight: 0,
  displayWidth: 0,
  displayHeight: 0,
  scale: 1
});

// 裁剪位置
const cropPosition = reactive({
  x: 0,
  y: 0
});

// 长宽比选项
const aspectRatios = [
  { key: '原始比例', label: '原始比例', ratio: null },
  { key: '3:2', label: '3:2', ratio: 3/2 },
  { key: '9:16', label: '9:16', ratio: 9/16 },
  { key: '3:4', label: '3:4', ratio: 3/4 },
  { key: '1:1', label: '1:1', ratio: 1 }
];

// 计算属性
const dialogVisible = computed({
  get: () => props.visible,
  set: (value) => emit('update:visible', value)
});

const canCrop = computed(() => {
  return !loading.value && !error.value && showCropBox.value;
});

const currentRatio = computed(() => {
  const ratio = aspectRatios.find(r => r.key === selectedRatio.value);
  return ratio?.ratio;
});

const cropDimensions = computed(() => {
  if (!imageInfo.displayWidth || !imageInfo.displayHeight) {
    return { width: 0, height: 0 };
  }

  const ratio = currentRatio.value;
  
  if (!ratio) {
    // 原始比例
    return {
      width: imageInfo.displayWidth,
      height: imageInfo.displayHeight
    };
  }

  // 计算适合的尺寸
  const containerRatio = imageInfo.displayWidth / imageInfo.displayHeight;
  
  if (ratio > containerRatio) {
    // 宽度受限
    return {
      width: imageInfo.displayWidth,
      height: Math.round(imageInfo.displayWidth / ratio)
    };
  } else {
    // 高度受限
    return {
      width: Math.round(imageInfo.displayHeight * ratio),
      height: imageInfo.displayHeight
    };
  }
});

const maxPosition = computed(() => ({
  x: Math.max(0, imageInfo.displayWidth - cropDimensions.value.width),
  y: Math.max(0, imageInfo.displayHeight - cropDimensions.value.height)
}));

const cropOverlayStyle = computed(() => ({
  width: `${imageInfo.displayWidth}px`,
  height: `${imageInfo.displayHeight}px`
}));

const cropBoxStyle = computed(() => ({
  left: `${cropPosition.x}px`,
  top: `${cropPosition.y}px`,
  width: `${cropDimensions.value.width}px`,
  height: `${cropDimensions.value.height}px`
}));

// 监听器
watch(() => props.visible, async (visible) => {
  if (visible && props.imageUrl) {
    await loadImage();
  }
});

watch(() => props.imageUrl, async (newUrl) => {
  if (newUrl && props.visible) {
    await loadImage();
  }
});

watch(selectedRatio, () => {
  resetCropPosition();
});

// 方法
const loadImage = async () => {
  if (!props.imageUrl) return;

  loading.value = true;
  error.value = '';
  showCropBox.value = false;

  try {
    await nextTick();
    
    const img = imageElement.value;
    if (!img) return;

    await new Promise((resolve, reject) => {
      const onLoad = () => {
        img.removeEventListener('load', onLoad);
        img.removeEventListener('error', onError);
        resolve();
      };
      
      const onError = () => {
        img.removeEventListener('load', onLoad);
        img.removeEventListener('error', onError);
        reject(new Error('图片加载失败'));
      };
      
      img.addEventListener('load', onLoad);
      img.addEventListener('error', onError);
      
      if (img.complete) {
        onLoad();
      }
    });

  } catch (err) {
    error.value = err.message || '图片加载失败';
    console.error('图片加载失败:', err);
  } finally {
    loading.value = false;
  }
};

const handleImageLoad = () => {
  const img = imageElement.value;
  if (!img) return;

  // 获取图片信息
  imageInfo.naturalWidth = img.naturalWidth;
  imageInfo.naturalHeight = img.naturalHeight;
  imageInfo.displayWidth = img.offsetWidth;
  imageInfo.displayHeight = img.offsetHeight;
  imageInfo.scale = imageInfo.naturalWidth / imageInfo.displayWidth;

  // 重置裁剪设置
  selectedRatio.value = '原始比例';
  resetCropPosition();
  showCropBox.value = true;
};

const handleImageError = () => {
  error.value = '图片加载失败';
};

const selectRatio = (ratioKey) => {
  selectedRatio.value = ratioKey;
};

const resetCropPosition = () => {
  cropPosition.x = Math.round(maxPosition.value.x / 2);
  cropPosition.y = Math.round(maxPosition.value.y / 2);
};

const handleCrop = async () => {
  if (!imageElement.value) {
    ElMessage.error('图片未准备好');
    return;
  }

  try {
    // 创建高质量输出画布
    const outputCanvas = document.createElement('canvas');
    const outputCtx = outputCanvas.getContext('2d');
    
    // 计算实际输出尺寸
    const scale = imageInfo.scale;
    const outputWidth = cropDimensions.value.width * scale;
    const outputHeight = cropDimensions.value.height * scale;
    
    outputCanvas.width = outputWidth;
    outputCanvas.height = outputHeight;
    
    // 计算裁剪区域
    const sourceX = cropPosition.x * scale;
    const sourceY = cropPosition.y * scale;
    
    // 绘制高质量裁剪图片
    outputCtx.drawImage(
      imageElement.value,
      sourceX, sourceY, outputWidth, outputHeight,
      0, 0, outputWidth, outputHeight
    );

    // 转换为数据URL
    const dataURL = outputCanvas.toDataURL('image/jpeg', 0.9);
    
    emit('cropped', dataURL);
    dialogVisible.value = false;
    ElMessage.success('封面裁剪完成');
    
  } catch (err) {
    console.error('裁剪失败:', err);
    ElMessage.error('裁剪失败，请重试');
  }
};

const handleCancel = () => {
  dialogVisible.value = false;
};
</script>

<style lang="scss" scoped>
$primary: #6366f1;
$primary-dark: #4f46e5;
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

.cover-cropper-dialog {
  :deep(.el-dialog) {
    border-radius: $radius-lg;
  }

  :deep(.el-dialog__header) {
    padding: 20px 24px 16px;
    border-bottom: 1px solid $border-light;

    .el-dialog__title {
      font-size: 16px;
      font-weight: 600;
      color: $text-primary;
    }
  }

  :deep(.el-dialog__body) {
    padding: $space-lg;
  }

  :deep(.el-dialog__footer) {
    padding: 16px 24px 20px;
    border-top: 1px solid $border-light;
  }

  .cropper-content {
    display: flex;
    flex-direction: column;
    gap: $space-lg;

    // 封面展示区域
    .cover-display-section {
      display: flex;
      justify-content: center;

      .cover-container {
        width: 200px;
        aspect-ratio: 9 / 16;
        border-radius: $radius-lg;
        overflow: hidden;
        background: $bg-gray;
        position: relative;
        border: 1px solid $border-light;

        .image-loading,
        .image-error {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: $space-sm;
          color: $text-muted;

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

        .image-error {
          color: $danger;
        }

        .image-wrapper {
          width: 100%;
          height: 100%;
          position: relative;

          .cover-image {
            width: 100%;
            height: 100%;
            object-fit: cover;
            display: block;
          }

          .crop-overlay {
            position: absolute;
            top: 0;
            left: 0;
            background: rgba(0, 0, 0, 0.5);

            .crop-box {
              position: absolute;
              border: 2px solid $primary;
              box-shadow: 0 0 0 1000px rgba(0, 0, 0, 0.5);

              .crop-border {
                position: absolute;
                top: -2px;
                left: -2px;
                right: -2px;
                bottom: -2px;
                border: 2px solid $primary;
                pointer-events: none;
              }

              .crop-grid {
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                opacity: 0.3;

                .grid-line {
                  position: absolute;
                  background: white;

                  &.grid-line-v {
                    width: 1px;
                    height: 100%;
                    
                    &:nth-child(1) { left: 33.33%; }
                    &:nth-child(2) { left: 66.66%; }
                  }

                  &.grid-line-h {
                    width: 100%;
                    height: 1px;
                    
                    &:nth-child(3) { top: 33.33%; }
                    &:nth-child(4) { top: 66.66%; }
                  }
                }
              }
            }
          }
        }
      }
    }

    // 控制面板
    .control-panel {
      .section-title {
        font-size: 14px;
        font-weight: 600;
        color: $text-primary;
        margin-bottom: $space-md;
        text-align: center;
      }

      .ratio-buttons {
        display: flex;
        flex-wrap: nowrap;
        gap: 10px;
        justify-content: center;

        .ratio-btn {
          min-width: 60px;
          padding: 6px 12px;
          border-radius: $radius-md;
          font-size: 13px;
          font-weight: 500;
          transition: all 0.2s ease;
          flex-shrink: 0;

          &:hover {
            transform: translateY(-1px);
          }

          &.el-button--primary {
            background-color: $primary;
            border-color: $primary;
            color: white;

            &:hover {
              background-color: $primary-dark;
              border-color: $primary-dark;
            }
          }

          &.el-button--default {
            background-color: $bg-white;
            border-color: $border-light;
            color: $text-secondary;

            &:hover {
              border-color: $primary;
              color: $primary;
            }
          }
        }
      }
    }
  }

  .dialog-footer {
    display: flex;
    justify-content: center;
    gap: $space-md;

    .el-button {
      min-width: 80px;
      padding: 8px 24px;
      border-radius: $radius-md;
      font-weight: 500;
    }
  }
}

@keyframes rotate {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

// 响应式设计
@media (max-width: 600px) {
  .cover-cropper-dialog {
    :deep(.el-dialog) {
      width: 95% !important;
    }

    .cropper-content {
      .cover-display-section .cover-container {
        width: 160px;
      }

      .control-panel .ratio-buttons {
        .ratio-btn {
          min-width: 55px;
          font-size: 12px;
          padding: 5px 10px;
        }
      }
    }
  }
}
</style>