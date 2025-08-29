<template>
  <el-dialog
    :model-value="modelValue"
    @update:model-value="$emit('update:modelValue', $event)"
    :show-close="false"
    :close-on-click-modal="true"
    :close-on-press-escape="true"
    fullscreen
    class="image-preview-dialog"
    append-to-body
  >
    <div class="image-preview-container">
      <!-- 顶部工具栏 -->
      <div class="preview-toolbar">
        <div class="toolbar-left">
          <span class="image-counter" v-if="images.length > 1">
            {{ currentIndex + 1 }} / {{ images.length }}
          </span>
        </div>

        <div class="toolbar-center">
          <h3 class="preview-title">图片预览</h3>
        </div>

        <div class="toolbar-right">
          <!-- 下载按钮 -->
          <el-button
            circle
            @click="downloadImage"
            class="toolbar-btn"
            title="下载图片"
          >
            <el-icon><Download /></el-icon>
          </el-button>

          <!-- 关闭按钮 -->
          <el-button
            circle
            @click="closePreview"
            class="toolbar-btn close-btn"
            title="关闭"
          >
            <el-icon><Close /></el-icon>
          </el-button>
        </div>
      </div>

      <!-- 图片展示区域 -->
      <div class="preview-content" @click="closePreview">
        <!-- 左侧导航按钮 -->
        <div
          v-if="images.length > 1"
          class="nav-button nav-prev"
          @click.stop="previousImage"
          :class="{ disabled: currentIndex === 0 }"
        >
          <el-icon><ArrowLeft /></el-icon>
        </div>

        <!-- 图片容器 -->
        <div class="image-container" @click.stop>
          <img
            :src="currentImageUrl"
            :alt="`图片 ${currentIndex + 1}`"
            class="preview-image"
            @load="handleImageLoad"
            @error="handleImageError"
            @wheel="handleWheel"
            :style="imageStyle"
            ref="previewImageRef"
          />

          <!-- 加载状态 -->
          <div v-if="isLoading" class="loading-overlay">
            <el-icon class="loading-spinner"><Loading /></el-icon>
            <span>加载中...</span>
          </div>

          <!-- 错误状态 -->
          <div v-if="hasError" class="error-overlay">
            <el-icon class="error-icon"><Picture /></el-icon>
            <span>图片加载失败</span>
          </div>
        </div>

        <!-- 右侧导航按钮 -->
        <div
          v-if="images.length > 1"
          class="nav-button nav-next"
          @click.stop="nextImage"
          :class="{ disabled: currentIndex === images.length - 1 }"
        >
          <el-icon><ArrowRight /></el-icon>
        </div>
      </div>

      <!-- 底部控制栏 -->
      <div class="preview-controls">
        <!-- 缩放控制 -->
        <div class="zoom-controls">
          <el-button
            circle
            size="small"
            @click="zoomOut"
            :disabled="scale <= 0.5"
            title="缩小"
          >
            <el-icon><ZoomOut /></el-icon>
          </el-button>

          <span class="zoom-text">{{ Math.round(scale * 100) }}%</span>

          <el-button
            circle
            size="small"
            @click="zoomIn"
            :disabled="scale >= 3"
            title="放大"
          >
            <el-icon><ZoomIn /></el-icon>
          </el-button>

          <el-button circle size="small" @click="resetZoom" title="重置">
            <el-icon><Refresh /></el-icon>
          </el-button>
        </div>

        <!-- 缩略图（多图片时显示） -->
        <div v-if="images.length > 1" class="thumbnails-container">
          <div class="thumbnails">
            <div
              v-for="(image, index) in images"
              :key="index"
              :class="['thumbnail', { active: index === currentIndex }]"
              @click="goToImage(index)"
            >
              <img
                :src="image"
                :alt="`缩略图 ${index + 1}`"
                @error="handleThumbnailError"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  </el-dialog>
</template>

<script setup>
import { ref, computed, watch, nextTick } from "vue";
import {
  Close,
  Download,
  ArrowLeft,
  ArrowRight,
  Loading,
  Picture,
  ZoomOut,
  ZoomIn,
  Refresh,
} from "@element-plus/icons-vue";
import { ElMessage } from "element-plus";

// Props
const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false,
  },
  imageUrl: {
    type: String,
    default: "",
  },
  images: {
    type: Array,
    default: () => [],
  },
  currentIndex: {
    type: Number,
    default: 0,
  },
});

// Emits
const emit = defineEmits(["update:modelValue", "close"]);

// 本地状态
const currentIndex = ref(0);
const scale = ref(1);
const isLoading = ref(false);
const hasError = ref(false);
const previewImageRef = ref(null);

// 计算属性
const currentImageUrl = computed(() => {
  if (props.images.length > 0) {
    return props.images[currentIndex.value] || props.imageUrl;
  }
  return props.imageUrl;
});

const imageStyle = computed(() => {
  return {
    transform: `scale(${scale.value})`,
    transition: "transform 0.3s ease",
  };
});

// 事件处理
const closePreview = () => {
  emit("update:modelValue", false);
  emit("close");
  resetState();
};

const resetState = () => {
  scale.value = 1;
  isLoading.value = false;
  hasError.value = false;
};

const previousImage = () => {
  if (currentIndex.value > 0) {
    currentIndex.value--;
    resetImageState();
  }
};

const nextImage = () => {
  if (currentIndex.value < props.images.length - 1) {
    currentIndex.value++;
    resetImageState();
  }
};

const goToImage = (index) => {
  currentIndex.value = index;
  resetImageState();
};

const resetImageState = () => {
  scale.value = 1;
  isLoading.value = true;
  hasError.value = false;
};

const zoomIn = () => {
  if (scale.value < 3) {
    scale.value = Math.min(3, scale.value + 0.25);
  }
};

const zoomOut = () => {
  if (scale.value > 0.5) {
    scale.value = Math.max(0.5, scale.value - 0.25);
  }
};

const resetZoom = () => {
  scale.value = 1;
};

const handleWheel = (event) => {
  event.preventDefault();

  if (event.deltaY < 0) {
    zoomIn();
  } else {
    zoomOut();
  }
};

const handleImageLoad = () => {
  isLoading.value = false;
  hasError.value = false;
};

const handleImageError = () => {
  isLoading.value = false;
  hasError.value = true;
};

const handleThumbnailError = (e) => {
  e.target.src = "/placeholder-image.png";
};

const downloadImage = async () => {
  try {
    const response = await fetch(currentImageUrl.value);
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = `image_${currentIndex.value + 1}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    window.URL.revokeObjectURL(url);
    ElMessage.success("图片下载成功");
  } catch (error) {
    console.error("下载图片失败:", error);
    ElMessage.error("图片下载失败");
  }
};

// 键盘事件处理
const handleKeyDown = (event) => {
  if (!props.modelValue) return;

  switch (event.key) {
    case "Escape":
      closePreview();
      break;
    case "ArrowLeft":
      previousImage();
      break;
    case "ArrowRight":
      nextImage();
      break;
    case "+":
    case "=":
      zoomIn();
      break;
    case "-":
      zoomOut();
      break;
    case "0":
      resetZoom();
      break;
  }
};

// 监听器
watch(
  () => props.modelValue,
  (newValue) => {
    if (newValue) {
      currentIndex.value = props.currentIndex;
      resetImageState();
      document.addEventListener("keydown", handleKeyDown);
    } else {
      document.removeEventListener("keydown", handleKeyDown);
    }
  }
);

watch(
  () => props.currentIndex,
  (newIndex) => {
    currentIndex.value = newIndex;
  }
);

// 组件卸载时清理事件监听器
import { onUnmounted } from "vue";
onUnmounted(() => {
  document.removeEventListener("keydown", handleKeyDown);
});
</script>

<style lang="scss" scoped>
$bg-black: #000000;
$bg-dark: rgba(0, 0, 0, 0.8);
$bg-overlay: rgba(0, 0, 0, 0.6);
$text-white: #ffffff;
$text-gray: #94a3b8;
$primary: #5b73de;
$radius-md: 8px;
$space-xs: 4px;
$space-sm: 8px;
$space-md: 16px;
$space-lg: 24px;

:deep(.image-preview-dialog) {
  .el-dialog__body {
    padding: 0;
    background: $bg-black;
  }

  .el-dialog__header {
    display: none;
  }
}

.image-preview-container {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: $bg-black;
  color: $text-white;
}

// 顶部工具栏
.preview-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: $space-md $space-lg;
  background: $bg-overlay;
  backdrop-filter: blur(10px);
  position: relative;
  z-index: 10;

  .toolbar-left {
    flex: 1;

    .image-counter {
      font-size: 14px;
      color: $text-gray;
    }
  }

  .toolbar-center {
    .preview-title {
      font-size: 16px;
      font-weight: 600;
      margin: 0;
      text-align: center;
    }
  }

  .toolbar-right {
    flex: 1;
    display: flex;
    justify-content: flex-end;
    gap: $space-sm;

    .toolbar-btn {
      background: rgba(255, 255, 255, 0.1);
      border: 1px solid rgba(255, 255, 255, 0.2);
      color: $text-white;

      &:hover {
        background: rgba(255, 255, 255, 0.2);
        border-color: rgba(255, 255, 255, 0.3);
      }

      &.close-btn:hover {
        background: rgba(239, 68, 68, 0.3);
        border-color: rgba(239, 68, 68, 0.5);
      }
    }
  }
}

// 图片展示区域
.preview-content {
  flex: 1;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;

  .nav-button {
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    z-index: 5;
    width: 48px;
    height: 48px;
    background: $bg-overlay;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.3s ease;
    backdrop-filter: blur(10px);

    &:hover:not(.disabled) {
      background: rgba(255, 255, 255, 0.2);
      transform: translateY(-50%) scale(1.1);
    }

    &.disabled {
      opacity: 0.3;
      cursor: not-allowed;
    }

    &.nav-prev {
      left: $space-lg;
    }

    &.nav-next {
      right: $space-lg;
    }

    .el-icon {
      font-size: 20px;
      color: $text-white;
    }
  }

  .image-container {
    position: relative;
    max-width: 90%;
    max-height: 90%;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: auto;

    .preview-image {
      max-width: 100%;
      max-height: 100%;
      object-fit: contain;
      cursor: grab;
      user-select: none;

      &:active {
        cursor: grabbing;
      }
    }

    .loading-overlay,
    .error-overlay {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: $space-sm;
      color: $text-gray;

      .el-icon {
        font-size: 48px;
      }

      .loading-spinner {
        animation: rotate 1s linear infinite;
      }

      span {
        font-size: 14px;
      }
    }
  }
}

// 底部控制栏
.preview-controls {
  padding: $space-md $space-lg;
  background: $bg-overlay;
  backdrop-filter: blur(10px);
  display: flex;
  flex-direction: column;
  gap: $space-md;

  .zoom-controls {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: $space-sm;

    .el-button {
      background: rgba(255, 255, 255, 0.1);
      border: 1px solid rgba(255, 255, 255, 0.2);
      color: $text-white;

      &:hover:not(:disabled) {
        background: rgba(255, 255, 255, 0.2);
        border-color: rgba(255, 255, 255, 0.3);
      }

      &:disabled {
        opacity: 0.3;
      }
    }

    .zoom-text {
      font-size: 14px;
      font-weight: 500;
      min-width: 50px;
      text-align: center;
      color: $text-white;
    }
  }

  .thumbnails-container {
    display: flex;
    justify-content: center;

    .thumbnails {
      display: flex;
      gap: $space-xs;
      max-width: 100%;
      overflow-x: auto;
      padding: $space-xs 0;

      .thumbnail {
        width: 60px;
        height: 60px;
        border-radius: $radius-md;
        overflow: hidden;
        cursor: pointer;
        transition: all 0.3s ease;
        border: 2px solid transparent;

        &:hover {
          border-color: rgba(255, 255, 255, 0.5);
        }

        &.active {
          border-color: $primary;
          box-shadow: 0 0 0 2px rgba(91, 115, 222, 0.3);
        }

        img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
      }

      &::-webkit-scrollbar {
        height: 4px;
      }

      &::-webkit-scrollbar-track {
        background: rgba(255, 255, 255, 0.1);
        border-radius: 2px;
      }

      &::-webkit-scrollbar-thumb {
        background: rgba(255, 255, 255, 0.3);
        border-radius: 2px;

        &:hover {
          background: rgba(255, 255, 255, 0.5);
        }
      }
    }
  }
}

// 旋转动画
@keyframes rotate {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

// 响应式适配
@media (max-width: 768px) {
  .preview-toolbar {
    padding: $space-sm $space-md;

    .toolbar-right {
      gap: $space-xs;
    }
  }

  .preview-content {
    .nav-button {
      width: 40px;
      height: 40px;

      &.nav-prev {
        left: $space-sm;
      }

      &.nav-next {
        right: $space-sm;
      }

      .el-icon {
        font-size: 16px;
      }
    }
  }

  .preview-controls {
    padding: $space-sm $space-md;

    .thumbnails-container {
      .thumbnails {
        .thumbnail {
          width: 48px;
          height: 48px;
        }
      }
    }
  }
}
</style>
