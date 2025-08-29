<template>
  <div class="cover-selector">
    <!-- 当前封面展示 -->
    <div class="cover-display">
      <div class="cover-image" @click="openCoverMenu">
        <img v-if="currentCover" :src="currentCover" alt="视频封面" />
        <div v-else class="cover-placeholder">
          <span>点击选择封面</span>
        </div>
        <div class="cover-overlay">
          <el-icon><Edit /></el-icon>
          <span>更换封面</span>
        </div>
      </div>

    </div>

    <!-- 封面选择菜单 -->
    <el-dialog 
    v-model="menuVisible" 
    title="选择封面方式" 
    width="480px"
    :close-on-click-modal="true"
    >
    <div class="cover-menu-grid">
        <div class="menu-option" @click="handleVideoCapture">
        <div class="option-icon">
            <el-icon><VideoCamera /></el-icon>
        </div>
        <div class="option-content">
            <div class="option-title">视频截取</div>
            <div class="option-desc">从当前视频中截取一帧作为封面</div>
        </div>
        </div>
        
        <div class="menu-option" @click="handleLocalUpload">
        <div class="option-icon">
            <el-icon><Upload /></el-icon>
        </div>
        <div class="option-content">
            <div class="option-title">本地选择</div>
            <div class="option-desc">从本地选择图片文件作为封面</div>
        </div>
        </div>
        
        <div class="menu-option" @click="handleMaterialSelect">
        <div class="option-icon">
            <el-icon><Folder /></el-icon>
        </div>
        <div class="option-content">
            <div class="option-title">素材库选择</div>
            <div class="option-desc">从素材库中选择已上传的图片</div>
        </div>
        </div>
        
        <div 
        class="menu-option" 
        :class="{ disabled: !currentCover }"
        @click="handleCropCover"
        >
        <div class="option-icon">
            <el-icon><Crop /></el-icon>
        </div>
        <div class="option-content">
            <div class="option-title">剪裁封面</div>
            <div class="option-desc">对已选择的封面进行裁剪</div>
        </div>
        </div>
    </div>
    </el-dialog>

    <!-- 隐藏的文件输入框 -->
    <input
      ref="fileInput"
      type="file"
      accept="image/*"
      style="display: none"
      @change="handleFileSelect"
    />

    <!-- 视频截取对话框 -->
    <VideoFrameCapture
      v-model:visible="videoCaptureVisible"
      :video-url="videoUrl"
      @captured="handleFrameCaptured"
    />

    <!-- 封面裁剪对话框 -->
    <CoverCropper
      v-model:visible="cropperVisible"
      :image-url="currentCover"
      @cropped="handleCoverCropped"
    />

    <!-- 素材库选择对话框 -->
    <ImageMaterialSelector
      v-model:visible="materialSelectorVisible"
      @selected="handleMaterialSelected"
    />
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import {
  Picture,
  Edit,
  VideoCamera,
  Crop,
  Upload,
  Folder
} from '@element-plus/icons-vue';
import { ElMessage } from 'element-plus';

import VideoFrameCapture from './VideoFrameCapture.vue';
import CoverCropper from '../cover/CoverCropper.vue';
import ImageMaterialSelector from '../cover/ImageMaterialSelector.vue';

// Props
const props = defineProps({
  cover: {
    type: String,
    default: ''
  },
  videoUrl: {
    type: String,
    default: ''
  }
});

// Emits
const emit = defineEmits(['update:cover', 'cover-changed']);

// 响应式数据
const coverDropdown = ref(null);
const fileInput = ref(null);
const menuVisible = ref(false);
const videoCaptureVisible = ref(false);
const cropperVisible = ref(false);
const materialSelectorVisible = ref(false);

// 计算属性
const currentCover = computed({
  get: () => props.cover,
  set: (value) => {
    emit('update:cover', value);
    emit('cover-changed', value);
  }
});

// 方法
const openCoverMenu = () => {
  menuVisible.value = true;
};

const handleVideoCapture = () => {
  console.log('🎬 点击视频截取，videoUrl:', props.videoUrl);
  
  if (!props.videoUrl) {
    ElMessage.warning('请先选择视频文件');
    return;
  }
  
  console.log('✅ 准备打开视频截取对话框');
  menuVisible.value = false; // 关闭菜单
  videoCaptureVisible.value = true;
  
  console.log('📊 videoCaptureVisible状态:', videoCaptureVisible.value);
};

const handleLocalUpload = () => {
  menuVisible.value = false; // 关闭菜单
  fileInput.value?.click();
};

const handleMaterialSelect = () => {
  menuVisible.value = false; // 关闭菜单
  materialSelectorVisible.value = true;
};

const handleCropCover = () => {
  if (!currentCover.value) {
    ElMessage.warning('请先选择封面图片');
    return;
  }
  menuVisible.value = false; // 关闭菜单
  cropperVisible.value = true;
};


const handleFileSelect = (event) => {
  const file = event.target.files[0];
  if (!file) return;

  // 验证文件类型
  if (!file.type.startsWith('image/')) {
    ElMessage.error('请选择图片文件');
    return;
  }

  // 验证文件大小 (5MB)
  if (file.size > 5 * 1024 * 1024) {
    ElMessage.error('图片大小不能超过5MB');
    return;
  }

  // 创建文件URL
  const reader = new FileReader();
  reader.onload = async (e) => {
    currentCover.value = e.target.result;

    await saveCoverToLocal(e.target.result);
    
    ElMessage.success('封面已更新');
  };
  reader.readAsDataURL(file);

  // 清空input值，允许重复选择同一文件
  event.target.value = '';
};
const hasCustomCover = ref(false);
// 🔥 修改：添加 async 关键字
const handleFrameCaptured = async (frameData) => {
  currentCover.value = frameData;
  hasCustomCover.value = true; // 🔥 标记用户已自定义封面
  
  // 🔥 立即保存封面到本地
  await saveCoverToLocal(frameData);
  
  // 🔥 通知父组件用户已设置自定义封面
  emit('cover-changed', frameData);
  emit('custom-cover-set', true); // 新增事件
  //ElMessage.success('封面截取成功');
};
// 🔥 新增：获取是否有自定义封面的方法
const hasCustomCoverSet = () => {
  return hasCustomCover.value;
};
// 🔥 新增：保存封面到本地的方法
const saveCoverToLocal = async (frameData) => {
  const videoFileName = getCurrentVideoFileName();
  
  if (!videoFileName) {
    console.warn('⚠️ 无法获取视频文件名，跳过封面保存');
    return;
  }

  try {
    console.log(`📸 保存封面到本地: ${videoFileName}`);
    
    const { materialApi } = await import('@/api/material');
    const result = await materialApi.saveCoverScreenshot(frameData, videoFileName);
    
    if (result.code === 200) {
      console.log(`✅ 封面保存成功: ${result.data.coverPath}`);
    } else {
      console.warn(`⚠️ 封面保存失败: ${result.msg}`);
    }
  } catch (error) {
    console.error('❌ 保存封面异常:', error);
  }
};

// 🔥 新增：获取当前视频文件名的辅助方法
const getCurrentVideoFileName = () => {
  if (props.videoUrl) {
    try {
      const url = new URL(props.videoUrl);
      const params = new URLSearchParams(url.search);
      const filename = params.get('filename');
      
      if (filename) {
        return decodeURIComponent(filename);
      }
      
      const pathParts = url.pathname.split('/');
      const lastPart = pathParts[pathParts.length - 1];
      if (lastPart && lastPart.includes('.')) {
        return lastPart;
      }
    } catch (error) {
      console.warn('⚠️ 解析视频URL失败:', error);
    }
  }
  
  return null;
};

// 🔥 新增：将图片URL转换为base64的辅助方法
const convertImageToBase64 = (imageUrl) => {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      ctx.drawImage(img, 0, 0);
      
      try {
        const base64Data = canvas.toDataURL('image/jpeg', 0.8);
        resolve(base64Data);
      } catch (error) {
        console.error('❌ Canvas转换失败:', error);
        resolve(null);
      }
    };
    
    img.onerror = () => {
      console.error('❌ 图片加载失败');
      resolve(null);
    };
    
    img.src = imageUrl;
  });
};
// 暴露方法给父组件
defineExpose({
  hasCustomCoverSet
});
const handleCoverCropped = async (croppedData) => {
  currentCover.value = croppedData;
  
  // 🔥 立即保存裁剪后的封面
  await saveCoverToLocal(croppedData);
  
  ElMessage.success('封面裁剪完成');
};

const handleMaterialSelected = async (imageUrl) => {
  currentCover.value = imageUrl;
  // 🔥 对于从素材库选择的图片，也需要保存
  try {
    const base64Data = await convertImageToBase64(imageUrl);
    if (base64Data) {
      await saveCoverToLocal(base64Data);
    }
  } catch (error) {
    console.warn('⚠️ 转换素材库图片失败:', error);
  }
  
  ElMessage.success('封面已选择');
};
</script>

<style lang="scss" scoped>
$primary: #6366f1;
$bg-white: #ffffff;
$bg-gray: #fbfbfb;
$text-primary: #0f172a;
$text-secondary: #475569;
$text-muted: #94a3b8;
$border-light: #ffffff;
$radius-md: 8px;
$radius-lg: 12px;
$space-sm: 8px;
$space-md: 16px;
// 添加到现有样式中
.cover-menu-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 12px;

  .menu-option {
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 16px;
    border: 1px solid $border-light;
    border-radius: $radius-md;
    cursor: pointer;
    transition: all 0.2s ease;

    &:hover {
      border-color: $primary;
      background-color: rgba(99, 102, 241, 0.05);
    }

    &.disabled {
      opacity: 0.5;
      cursor: not-allowed;
      
      &:hover {
        border-color: $border-light;
        background-color: transparent;
      }
    }

    .option-icon {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background-color: $bg-gray;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;

      .el-icon {
        font-size: 20px;
        color: $primary;
      }
    }

    .option-content {
      flex: 1;

      .option-title {
        font-size: 16px;
        font-weight: 600;
        color: $text-primary;
        margin-bottom: 4px;
      }

      .option-desc {
        font-size: 13px;
        color: $text-secondary;
        line-height: 1.4;
      }
    }
  }
}
.cover-selector {
  .cover-display {
    display: flex;
    align-items: center;
    gap: $space-md;
    padding: $space-md;
    background: $bg-gray;
    border-radius: $radius-lg;
    border: 1px solid $border-light;

    .cover-image {
      position: relative;
      width: 120px;
      height: 68px; // 16:9 比例
      border-radius: $radius-md;
      overflow: hidden;
      cursor: pointer;
      transition: all 0.2s ease;

      &:hover {
        .cover-overlay {
          opacity: 1;
        }
      }

      img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }

      .cover-placeholder {
        width: 100%;
        height: 100%;
        background: $bg-white;
        border: 2px dashed $border-light;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 4px;
        color: $text-muted;

        .el-icon {
          font-size: 24px;
        }

        span {
          font-size: 12px;
        }
      }

      .cover-overlay {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.7);
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 4px;
        color: white;
        opacity: 0;
        transition: opacity 0.2s ease;

        .el-icon {
          font-size: 16px;
        }

        span {
          font-size: 12px;
        }
      }
    }

    .cover-info {
      flex: 1;

      .cover-title {
        font-size: 14px;
        font-weight: 600;
        color: $text-primary;
        margin-bottom: 4px;
      }

      .cover-desc {
        font-size: 12px;
        color: $text-secondary;
      }
    }
  }

  :deep(.cover-menu) {
    min-width: 160px;

    .el-dropdown-menu__item {
      display: flex;
      align-items: center;
      gap: $space-sm;
      font-size: 14px;
      padding: $space-sm $space-md;

      .el-icon {
        font-size: 16px;
        color: $text-secondary;
      }

      &:hover .el-icon {
        color: $primary;
      }

      &.is-disabled {
        .el-icon {
          color: $text-muted;
        }
      }
    }
  }
}
</style>