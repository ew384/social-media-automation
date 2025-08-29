<template>
  <el-dialog
    v-model="dialogVisible"
    title="选择封面图片"
    width="800px"
    :close-on-click-modal="false"
    class="image-material-selector-dialog"
  >
    <div class="selector-content">
      <!-- 搜索和筛选 -->
      <div class="search-section">
        <div class="search-controls">
          <el-input
            v-model="searchKeyword"
            placeholder="搜索图片..."
            clearable
            @input="handleSearch"
          >
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>
          
          <el-select
            v-model="selectedType"
            placeholder="文件类型"
            clearable
            style="width: 120px"
            @change="handleTypeFilter"
          >
            <el-option label="全部" value="" />
            <el-option label="JPG" value="jpg" />
            <el-option label="PNG" value="png" />
            <el-option label="GIF" value="gif" />
            <el-option label="WEBP" value="webp" />
          </el-select>

          <el-button @click="refreshMaterials" :loading="loading">
            <el-icon><Refresh /></el-icon>
            刷新
          </el-button>
        </div>
      </div>

      <!-- 图片网格 -->
      <div class="images-section">
        <div v-if="loading" class="loading-state">
          <el-icon class="rotating"><Loading /></el-icon>
          <span>加载中...</span>
        </div>

        <div v-else-if="error" class="error-state">
          <el-icon><Warning /></el-icon>
          <span>{{ error }}</span>
          <el-button @click="refreshMaterials">重试</el-button>
        </div>

        <div v-else-if="filteredImages.length === 0" class="empty-state">
          <el-button type="primary" @click="handleUpload">
            + 上传图片
          </el-button>
        </div>

        <div v-else class="images-grid">
          <div
            v-for="image in filteredImages"
            :key="image.id"
            :class="['image-item', { selected: selectedImage?.id === image.id }]"
            @click="selectImage(image)"
          >
            <div class="image-preview">
              <img
                :src="getImagePreviewUrl(image)"
                :alt="image.filename"
                @error="handleImageError"
              />
              
              <!-- 选中标记 -->
              <div v-if="selectedImage?.id === image.id" class="selected-mark">
                <el-icon><Check /></el-icon>
              </div>
              
              <!-- 图片信息覆盖层 -->
              <div class="image-overlay">
                <div class="image-info">
                  <div class="image-name">{{ image.filename }}</div>
                  <div class="image-size">{{ formatFileSize(image.filesize) }}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 分页 -->
      <div v-if="totalImages > pageSize" class="pagination-section">
        <el-pagination
          v-model:current-page="currentPage"
          :page-size="pageSize"
          :total="totalImages"
          layout="prev, pager, next, total"
          @current-change="handlePageChange"
        />
      </div>
    </div>

    <template #footer>
      <div class="dialog-footer">
        <div class="footer-left">
        </div>
        
        <div class="footer-right">
          <el-button @click="handleCancel">取消</el-button>
          <el-button 
            type="primary" 
            @click="handleConfirm" 
            :disabled="!selectedImage"
          >
            确认选择
          </el-button>
        </div>
      </div>
    </template>

    <!-- 隐藏的文件上传 -->
    <input
      ref="fileInput"
      type="file"
      accept="image/*"
      multiple
      style="display: none"
      @change="handleFileUpload"
    />
  </el-dialog>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue';
import {
  Search,
  Refresh,
  Loading,
  Warning,
  Picture,
  Plus,
  Check,
  Upload
} from '@element-plus/icons-vue';
import { ElMessage } from 'element-plus';
import { materialApi } from '@/api/material';

// Props
const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  }
});

// Emits
const emit = defineEmits(['update:visible', 'selected']);

// 响应式数据
const fileInput = ref(null);
const loading = ref(false);
const error = ref('');
const searchKeyword = ref('');
const selectedType = ref('');
const selectedImage = ref(null);
const currentPage = ref(1);
const pageSize = ref(20);
const allImages = ref([]);

// 计算属性
const dialogVisible = computed({
  get: () => props.visible,
  set: (value) => emit('update:visible', value)
});

const filteredImages = computed(() => {
  let images = [...allImages.value];

  // 过滤出图片文件
  images = images.filter(item => {
    const ext = getFileExtension(item.filename).toLowerCase();
    return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'].includes(ext);
  });

  // 类型筛选
  if (selectedType.value) {
    images = images.filter(item => {
      const ext = getFileExtension(item.filename).toLowerCase();
      return ext === selectedType.value || 
             (selectedType.value === 'jpg' && ext === 'jpeg');
    });
  }

  // 关键词搜索
  if (searchKeyword.value.trim()) {
    const keyword = searchKeyword.value.trim().toLowerCase();
    images = images.filter(item => 
      item.filename.toLowerCase().includes(keyword)
    );
  }

  // 分页
  const start = (currentPage.value - 1) * pageSize.value;
  const end = start + pageSize.value;
  
  return images.slice(start, end);
});

const totalImages = computed(() => {
  let images = [...allImages.value];

  // 过滤出图片文件
  images = images.filter(item => {
    const ext = getFileExtension(item.filename).toLowerCase();
    return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'].includes(ext);
  });

  // 类型筛选
  if (selectedType.value) {
    images = images.filter(item => {
      const ext = getFileExtension(item.filename).toLowerCase();
      return ext === selectedType.value || 
             (selectedType.value === 'jpg' && ext === 'jpeg');
    });
  }

  // 关键词搜索
  if (searchKeyword.value.trim()) {
    const keyword = searchKeyword.value.trim().toLowerCase();
    images = images.filter(item => 
      item.filename.toLowerCase().includes(keyword)
    );
  }

  return images.length;
});

// 监听器
watch(() => props.visible, (visible) => {
  if (visible) {
    loadMaterials();
    resetSelection();
  }
});

// 生命周期
onMounted(() => {
  if (props.visible) {
    loadMaterials();
  }
});

// 方法
const loadMaterials = async () => {
  loading.value = true;
  error.value = '';
  
  try {
    const response = await materialApi.getAllMaterials();
    
    if (response.code === 200 && response.data) {
      allImages.value = response.data;
    } else {
      throw new Error(response.msg || '获取素材失败');
    }
  } catch (err) {
    console.error('加载素材失败:', err);
    error.value = err.message || '加载素材失败';
    allImages.value = [];
  } finally {
    loading.value = false;
  }
};

const refreshMaterials = () => {
  loadMaterials();
};

const handleSearch = () => {
  currentPage.value = 1;
};

const handleTypeFilter = () => {
  currentPage.value = 1;
};

const handlePageChange = (page) => {
  currentPage.value = page;
};

const selectImage = (image) => {
  selectedImage.value = image;
};

const resetSelection = () => {
  selectedImage.value = null;
  searchKeyword.value = '';
  selectedType.value = '';
  currentPage.value = 1;
};

const handleUpload = () => {
  fileInput.value?.click();
};

const handleFileUpload = async (event) => {
  const files = Array.from(event.target.files);
  if (files.length === 0) return;

  // 验证文件
  const validFiles = files.filter(file => {
    if (!file.type.startsWith('image/')) {
      ElMessage.warning(`${file.name} 不是图片文件`);
      return false;
    }
    
    if (file.size > 10 * 1024 * 1024) { // 10MB
      ElMessage.warning(`${file.name} 文件过大，请选择小于10MB的图片`);
      return false;
    }
    
    return true;
  });

  if (validFiles.length === 0) return;

  // 上传文件
  for (const file of validFiles) {
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      await materialApi.uploadMaterial(formData);
    } catch (err) {
      console.error(`上传 ${file.name} 失败:`, err);
      ElMessage.error(`上传 ${file.name} 失败`);
    }
  }

  ElMessage.success(`成功上传 ${validFiles.length} 个文件`);
  
  // 刷新素材列表
  await loadMaterials();
  
  // 清空文件输入
  event.target.value = '';
};

const handleConfirm = () => {
  if (!selectedImage.value) {
    ElMessage.warning('请选择一张图片');
    return;
  }

  const imageUrl = getImagePreviewUrl(selectedImage.value);
  emit('selected', imageUrl);
  dialogVisible.value = false;
};

const handleCancel = () => {
  dialogVisible.value = false;
};

const getImagePreviewUrl = (image) => {
  return materialApi.getMaterialPreviewUrl(image.final_filename);
};

const getFileExtension = (filename) => {
  const lastDot = filename.lastIndexOf('.');
  return lastDot !== -1 ? filename.substring(lastDot + 1) : '';
};

const formatFileSize = (size) => {
  if (!size) return '0 MB';
  
  if (typeof size === 'string') {
    // 如果已经是格式化的字符串，直接返回
    return size.includes('MB') || size.includes('KB') ? size : size + ' MB';
  }
  
  const mb = size / (1024 * 1024);
  return mb.toFixed(1) + ' MB';
};

const handleImageError = (event) => {
  console.warn('图片加载失败:', event.target.src);
  event.target.src = '/placeholder-image.svg'; // 可以设置占位图
};
</script>

<style lang="scss" scoped>
$primary: #6366f1;
$success: #10b981;
$warning: #f59e0b;
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

.image-material-selector-dialog {
  :deep(.el-dialog) {
    border-radius: $radius-lg;
  }

  :deep(.el-dialog__body) {
    padding: $space-lg;
  }

  .selector-content {
    .search-section {
      margin-bottom: $space-lg;

      .search-controls {
        display: flex;
        gap: $space-md;
        align-items: center;

        .el-input {
          flex: 1;
        }
      }
    }

    .images-section {
      min-height: 400px;
      margin-bottom: $space-lg;

      .loading-state,
      .error-state,
      .empty-state {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        height: 300px;
        color: $text-muted;
        gap: $space-md;

        .el-icon {
          font-size: 48px;
          
          &.rotating {
            animation: rotate 2s linear infinite;
          }
        }

        span {
          font-size: 16px;
        }
      }

      .error-state {
        color: $danger;
      }

      .images-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
        gap: $space-md;

        .image-item {
          border-radius: $radius-md;
          overflow: hidden;
          cursor: pointer;
          transition: all 0.2s ease;
          border: 2px solid transparent;

          &:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);

            .image-overlay {
              opacity: 1;
            }
          }

          &.selected {
            border-color: $primary;
            box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.2);
          }

          .image-preview {
            position: relative;
            aspect-ratio: 1;
            background: $bg-gray;
            overflow: hidden;

            img {
              width: 100%;
              height: 100%;
              object-fit: cover;
              transition: transform 0.2s ease;
            }

            .selected-mark {
              position: absolute;
              top: 8px;
              right: 8px;
              width: 24px;
              height: 24px;
              background: $primary;
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              color: white;
              font-size: 14px;
              z-index: 2;
            }

            .image-overlay {
              position: absolute;
              bottom: 0;
              left: 0;
              right: 0;
              background: linear-gradient(transparent, rgba(0, 0, 0, 0.8));
              padding: $space-md $space-sm $space-sm;
              opacity: 0;
              transition: opacity 0.2s ease;

              .image-info {
                color: white;

                .image-name {
                  font-size: 12px;
                  font-weight: 500;
                  margin-bottom: 2px;
                  overflow: hidden;
                  text-overflow: ellipsis;
                  white-space: nowrap;
                }

                .image-size {
                  font-size: 11px;
                  opacity: 0.8;
                }
              }
            }
          }
        }
      }
    }

    .pagination-section {
      display: flex;
      justify-content: center;
    }
  }

  .dialog-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;

    .footer-left {
      .el-button {
        display: flex;
        align-items: center;
        gap: 4px;
      }
    }

    .footer-right {
      display: flex;
      gap: $space-sm;
    }
  }
}

@keyframes rotate {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

// 响应式设计
@media (max-width: 768px) {
  .image-material-selector-dialog {
    .selector-content {
      .search-section .search-controls {
        flex-direction: column;
        
        .el-input {
          order: -1;
        }
      }

      .images-section .images-grid {
        grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
      }
    }

    .dialog-footer {
      flex-direction: column;
      gap: $space-sm;

      .footer-left,
      .footer-right {
        width: 100%;
        justify-content: center;
      }
    }
  }
}
</style>