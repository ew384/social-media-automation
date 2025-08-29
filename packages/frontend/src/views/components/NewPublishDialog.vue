<template>
  <el-dialog
    v-model="dialogVisible"
    title="新增发布"
    width="720px"
    :close-on-click-modal="false"
    :close-on-press-escape="false"
    class="new-publish-dialog"
    @close="handleDialogClose"
  >
    <!-- 步骤指示器 -->
    <div class="steps-indicator-compact">
      <div
        v-for="(step, index) in steps"
        :key="step.key"
        :class="[
          'step-item-compact',
          {
            active: currentStep === step.key,
            completed: getStepIndex(currentStep) > index,
          },
        ]"
      >
        <div class="step-circle-compact">
          <el-icon v-if="getStepIndex(currentStep) > index"><Check /></el-icon>
          <span v-else>{{ index + 1 }}</span>
        </div>
        <div class="step-label-compact">{{ step.label }}</div>
      </div>
    </div>

    <!-- 步骤内容 -->
    <div class="step-content-compact">
      <!-- 步骤1: 选择视频 - 紧凑版 -->
      <div v-show="currentStep === 'video'" class="step-panel-compact">
        <div class="step-header-compact">
          <h4>选择视频文件</h4>
          <p>支持上传本地视频或从素材库选择</p>
        </div>

        <div class="upload-section-compact">
          <div v-if="selectedVideos.length === 0" class="upload-area-compact">
            <el-upload
              class="video-uploader-compact"
              drag
              multiple
              :auto-upload="true"
              :action="`${apiBaseUrl}/upload`"
              :on-success="handleVideoUploadSuccess"
              :on-error="handleVideoUploadError"
              accept="video/*"
              :headers="authHeaders"
            >
              <div class="upload-content-compact">
                <el-icon class="upload-icon-compact"><VideoCamera /></el-icon>
                <div class="upload-text-compact">
                  <div>将视频文件拖拽到此处</div>
                  <div class="upload-hint-compact">或 <em>点击上传</em></div>
                </div>
              </div>
            </el-upload>

            <div class="upload-options-compact">
              <el-button @click="selectFromRecent" class="library-btn-compact">
                <el-icon><Clock /></el-icon>
                从最近上传选择
              </el-button>
              <el-button @click="selectFromLibrary" class="library-btn-compact">
                <el-icon><Folder /></el-icon>
                从素材库选择
              </el-button>
            </div>
          </div>

          <!-- 已选择的视频列表 -->
          <div v-else class="selected-videos-compact">
            <div class="videos-header-compact">
              <h5>已选择视频 ({{ selectedVideos.length }})</h5>
              <el-button size="small" @click="addMoreVideos">
                <el-icon><Plus /></el-icon>
                添加更多
              </el-button>
            </div>
            <div class="videos-grid-compact">
              <div
                v-for="(video, index) in selectedVideos"
                :key="index"
                class="video-item-compact"
              >
                <div class="video-preview-compact">
                  <VideoPreview
                    :videos="[video]"
                    mode="record"
                    size="small"
                    :clickable="true"
                    @video-click="previewVideo"
                  />

                  <!-- 操作按钮覆盖层 -->
                  <div class="video-overlay-compact">
                    <div class="overlay-content">
                      <el-button size="small" @click.stop="previewVideo(video)">
                        <el-icon><View /></el-icon>
                      </el-button>
                      <el-button
                        size="small"
                        type="danger"
                        @click.stop="removeVideo(index)"
                      >
                        <el-icon><Delete /></el-icon>
                      </el-button>
                    </div>
                  </div>
                </div>

                <div class="video-info-compact">
                  <div class="video-name-compact">{{ video.name }}</div>
                  <div class="video-size-compact">
                    {{ formatFileSize(video.size) }}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 步骤2: 选择账号 -->
      <div v-show="currentStep === 'accounts'" class="step-panel">
        <div class="step-header">
          <h4>选择发布账号</h4>
          <div class="accounts-stats">
            已选择 {{ selectedAccounts.length }} / {{ availableAccounts.length }} 个账号
          </div>
        </div>
        <!-- 复用现有的账号选择组件 -->
        <AccountSelection
          :key="accountSelectionKey"
          v-model:selected-accounts="selectedAccounts"
          :available-accounts="availableAccounts"
        />
      </div>
      <!-- 步骤3: 编辑内容 -->
      <div v-show="currentStep === 'content'" class="step-panel">
        <div class="content-form">
          <!-- 🔥 修改：视频和封面并排显示 -->
          <div class="media-section">
            <!-- 视频预览 -->
            <div class="form-section video-section">
              <h5>视频</h5>
              <VideoPreview
                :videos="selectedVideos"
                mode="preview"
                size="medium"
                :current-index="0"
                @video-loaded="handleVideoLoaded"
                @video-error="handleVideoError"
              />
            </div>

            <!-- 封面选择 -->
            <div class="form-section cover-section">
              <h5>封面</h5>
              <CoverSelector
                ref="coverSelector"
                v-model:cover="publishForm.cover"
                :video-url="currentVideoUrl"
                @cover-changed="handleCoverChanged"
                @custom-cover-set="handleCustomCoverSet"
              />
            </div>
          </div>

          <!-- 选中的账号 -->
          <div class="form-section">
            <h5>发布账号</h5>
            <div class="selected-accounts-display">
              <CompactAccountCard
                v-for="account in selectedAccountsData"
                :key="account.id"
                :account="account"
                :removable="true"
                @remove="handleRemoveAccount"
              />
            </div>
          </div>

          <!-- 表单内容 -->
          <div class="form-section">
            <el-form
              :model="publishForm"
              label-width="80px"
              class="publish-form"
            >
              <!-- 标题 -->
              <el-form-item label="标题">
                <el-input
                  v-model="publishForm.title"
                  placeholder="请输入发布标题"
                  maxlength="100"
                  show-word-limit
                  class="title-input"
                />
              </el-form-item>

              <!-- 描述 -->
              <el-form-item label="描述">
                <el-input
                  v-model="publishForm.description"
                  type="textarea"
                  :rows="4"
                  placeholder="请输入描述内容，支持添加 #话题标签"
                  maxlength="500"
                  show-word-limit
                />
              </el-form-item>

              <!-- 抖音表单 -->
              <template v-if="hasDouyinAccounts">
                <div class="platform-form-section">
                  <h6>抖音发布设置</h6>

                  <el-form-item label="声明">
                    <el-select
                      v-model="publishForm.douyin.statement"
                      placeholder="选择声明"
                    >
                      <el-option label="无需声明" value="无需声明" />
                      <el-option label="内容由AI生成" value="内容由AI生成" />
                      <el-option label="可能引人不适" value="可能引人不适" />
                      <el-option
                        label="虚构演绎仅供娱乐"
                        value="虚构演绎仅供娱乐"
                      />
                      <el-option
                        label="危险行为，请勿模仿"
                        value="危险行为，请勿模仿"
                      />
                    </el-select>
                  </el-form-item>

                  <el-form-item label="位置">
                    <el-input
                      v-model="publishForm.douyin.location"
                      placeholder="输入发布地点"
                    />
                  </el-form-item>
                </div>
              </template>

              <!-- 视频号表单 -->
              <template v-if="hasWechatAccounts">
                <div class="platform-form-section">
                  <h6>视频号发布设置</h6>

                  <el-form-item label="原创">
                    <el-switch
                      v-model="publishForm.wechat.original"
                      active-text="原创"
                      inactive-text="非原创"
                    />
                  </el-form-item>

                  <el-form-item label="位置">
                    <el-input
                      v-model="publishForm.wechat.location"
                      placeholder="输入发布地点"
                    />
                  </el-form-item>
                </div>
              </template>

              <!-- 定时发布 -->
              <el-form-item label="发布设置">
                <div class="publish-settings">
                  <el-switch
                    v-model="publishForm.scheduleEnabled"
                    active-text="定时发布"
                    inactive-text="立即发布"
                  />

                  <div
                    v-if="publishForm.scheduleEnabled"
                    class="schedule-options"
                  >
                    <div class="schedule-row">
                      <span class="label">发布时间:</span>
                      <el-date-picker
                        v-model="publishForm.scheduleTime"
                        type="datetime"
                        placeholder="选择发布时间"
                        format="YYYY-MM-DD HH:mm"
                        value-format="YYYY-MM-DD HH:mm:ss"
                        :disabled-date="disabledDate"
                        :disabled-hours="disabledHours"
                        :disabled-minutes="disabledMinutes"
                      />
                    </div>
                  </div>
                </div>
              </el-form-item>
            </el-form>
          </div>
        </div>
      </div>
    </div>

    <!-- 对话框底部按钮 -->
    <template #footer>
      <div class="dialog-footer-compact">
        <div class="footer-left-compact">
          <el-button
            v-if="currentStep !== 'video'"
            @click="previousStep"
            class="prev-btn"
          >
            <el-icon><ArrowLeft /></el-icon>
            上一步
          </el-button>
        </div>

        <!-- 右侧按钮 -->
        <div class="footer-right-compact">
          <el-button
            v-if="currentStep !== 'content'"
            type="primary"
            @click="nextStep"
            :disabled="!canProceedToNextStep"
            class="next-btn"
          >
            下一步
            <el-icon><ArrowRight /></el-icon>
          </el-button>

          <!-- 一键发布按钮 -->
          <el-dropdown
            v-else
            split-button
            type="primary"
            @click="publishContent('background')"
            :disabled="!canPublish"
            :loading="publishing"
            class="publish-btn"
          >
            {{ publishing ? "发布中..." : "一键发布" }}
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item @click="publishContent('background')">
                  本机发布
                </el-dropdown-item>
                <el-dropdown-item @click="publishContent('browser')">
                  浏览器发布
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </div>
    </template>

    <!-- 素材选择对话框 -->
    <MaterialSelector
      v-model:visible="materialSelectorVisible"
      :default-tab="selectedMaterialTab"
      @selected="handleMaterialSelected"
    />
  </el-dialog>
</template>

<script setup>
import { ref, reactive, computed, watch } from "vue";
import {
  Plus,
  Check,
  VideoCamera,
  Folder,
  Clock,
  VideoPlay,
  View,
  Delete,
  ArrowLeft,
  ArrowRight,
} from "@element-plus/icons-vue";
import { ElMessage } from "element-plus";
import { useAccountStore } from "@/stores/account";
import AccountSelection from "./AccountSelection.vue";
import MaterialSelector from "./MaterialSelector.vue";
import VideoPreview from "./video/VideoPreview.vue";
import CoverSelector from "./video/CoverSelector.vue";
import CompactAccountCard from "./common/CompactAccountCard.vue";

import { nextTick } from "vue";
// Props
const props = defineProps({
  visible: {
    type: Boolean,
    default: false,
  },
});

// Emits
const emit = defineEmits(["update:visible", "published"]);

// Store
const accountStore = useAccountStore();

// API配置
const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:3409";
const authHeaders = computed(() => ({
  Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
}));

const currentStep = ref("video");
const publishing = ref(false);
const materialSelectorVisible = ref(false);

// 步骤配置
const steps = [
  { key: "video", label: "选择视频" },
  { key: "accounts", label: "选择账号" },
  { key: "content", label: "编辑内容" },
];

// 表单数据
const selectedVideos = ref([]);
const selectedAccounts = ref([]);
const publishForm = reactive({
  title: "",
  description: "",
  cover: "",
  scheduleEnabled: false,
  scheduleTime: "",
  douyin: {
    statement: "无需声明",
    location: "",
  },
  wechat: {
    original: true,
    location: "",
  },
});

// 计算属性
const availableAccounts = computed(() => accountStore.accounts);
// 新增：当前视频URL计算属性
const currentVideoUrl = computed(() => {
  return selectedVideos.value.length > 0 ? selectedVideos.value[0].url : "";
});

// 新增：选中账号的详细数据
const selectedAccountsData = computed(() => {
  return selectedAccounts.value
    .map((accountId) => {
      return availableAccounts.value.find((acc) => acc.id === accountId);
    })
    .filter(Boolean);
});

const hasDouyinAccounts = computed(() => {
  return selectedAccounts.value.some((accountId) => {
    const account = availableAccounts.value.find((acc) => acc.id === accountId);
    return account?.platform === "抖音";
  });
});

const hasWechatAccounts = computed(() => {
  return selectedAccounts.value.some((accountId) => {
    const account = availableAccounts.value.find((acc) => acc.id === accountId);
    return account?.platform === "视频号" || account?.platform === "微信视频号";
  });
});

const canProceedToNextStep = computed(() => {
  switch (currentStep.value) {
    case "video":
      return selectedVideos.value.length > 0;
    case "accounts":
      return selectedAccounts.value.length > 0;
    case "content":
      return true;
    default:
      return true;
  }
});

const canPublish = computed(() => {
  return (
    selectedVideos.value.length > 0 &&
    selectedAccounts.value.length > 0
  );
});

// 方法定义
const getStepIndex = (stepKey) => {
  return steps.findIndex((step) => step.key === stepKey);
};

const nextStep = () => {
  const currentIndex = getStepIndex(currentStep.value);
  if (currentIndex < steps.length - 1) {
    currentStep.value = steps[currentIndex + 1].key;
  }
};

const previousStep = () => {
  const currentIndex = getStepIndex(currentStep.value);
  if (currentIndex > 0) {
    currentStep.value = steps[currentIndex - 1].key;
  }
};

const customCoverSet = ref(false);

// 🔥 修改现有的 handleVideoUploadSuccess 方法
const handleVideoUploadSuccess = async (response, file) => {
  if (response.code === 200) {
    const filePath = response.data.path || response.data;
    const filename = filePath.split("/").pop();

    const videoInfo = {
      name: file.name,
      path: filePath,
      url: `${apiBaseUrl}/getFile?filename=${filename}`,
      size: file.size,
      type: file.type,
    };

    selectedVideos.value.push(videoInfo);

    // 🔥 如果是第一个视频且没有自定义封面，生成默认封面
    if (selectedVideos.value.length === 1 && !customCoverSet.value) {
      await generateAndSetDefaultCover(videoInfo.url);
    }

    ElMessage.success("视频上传成功");
  } else {
    ElMessage.error(response.msg || "上传失败");
  }
};
// 🔥 新增：生成并设置默认封面
const generateAndSetDefaultCover = async (videoUrl) => {
  try {
    console.log("📸 开始生成默认封面:", videoUrl);

    const defaultCover = await generateDefaultCoverDataURL(videoUrl);
    if (defaultCover) {
      publishForm.cover = defaultCover;
      await saveCoverToLocal(defaultCover);
      console.log("✅ 默认封面已设置");
    }
  } catch (error) {
    console.error("❌ 生成默认封面失败:", error);
  }
};

// 🔥 新增：生成默认封面 DataURL
const generateDefaultCoverDataURL = (videoUrl) => {
  return new Promise((resolve) => {
    const video = document.createElement("video");
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    video.crossOrigin = "anonymous";
    video.preload = "metadata";

    video.onloadedmetadata = () => {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      video.currentTime = 0.1; // 0.1秒处截图，避免黑屏
    };

    video.onseeked = () => {
      try {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataURL = canvas.toDataURL("image/jpeg", 0.8);
        resolve(dataURL);
      } catch (error) {
        console.error("❌ 封面绘制失败:", error);
        resolve(null);
      }
    };

    video.onerror = () => {
      console.error("❌ 视频加载失败，无法生成封面");
      resolve(null);
    };

    video.src = videoUrl;
  });
};

// 🔥 新增：封面处理逻辑
const handleCoverGeneration = async (videoFile, videoUrl, filename) => {
  if (customCoverSet.value && publishForm.cover) {
    console.log("🎨 用户已设置自定义封面，保存自定义封面到本地");
    await saveCustomCoverToLocal(publishForm.cover, filename);
  } else {
    console.log("📸 用户未设置封面，生成默认首帧封面");
    await generateDefaultPoster(videoFile, videoUrl, filename);
  }
};

// 🔥 生成默认首帧封面（仅本地）
const generateDefaultPoster = async (videoFile, videoUrl, filename) => {
  try {
    console.log("📸 开始生成默认封面:", filename);

    return new Promise((resolve) => {
      const video = document.createElement("video");
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");

      video.crossOrigin = "anonymous";
      video.preload = "metadata";

      video.onloadedmetadata = () => {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        video.currentTime = 0.1; // 0.1秒处截图，避免黑屏
      };

      video.onseeked = () => {
        try {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

          canvas.toBlob(
            async (blob) => {
              if (blob) {
                const posterFilename = filename.replace(
                  /\.[^/.]+$/,
                  "_poster.png"
                );
                await saveToLocalCovers(blob, posterFilename);
                console.log("✅ 默认封面生成完成:", posterFilename);
              }
              resolve();
            },
            "image/png",
            0.8
          );
        } catch (error) {
          console.error("❌ 封面绘制失败:", error);
          resolve();
        }
      };

      video.onerror = () => {
        console.error("❌ 视频加载失败，无法生成封面");
        resolve();
      };

      video.src = videoUrl;
    });
  } catch (error) {
    console.error("❌ 默认封面生成失败:", error);
  }
};

// 🔥 保存自定义封面到本地
const saveCustomCoverToLocal = async (frameData, videoFilename) => {
  try {
    const response = await fetch(frameData);
    const blob = await response.blob();
    const posterFilename = videoFilename.replace(/\.[^/.]+$/, "_poster.png");

    await saveToLocalCovers(blob, posterFilename);
    console.log("✅ 自定义封面保存完成:", posterFilename);
  } catch (error) {
    console.error("保存自定义封面失败:", error);
  }
};

// 🔥 本地保存方法（简化版）
const saveToLocalCovers = async (blob, filename) => {
  try {
    console.log("💾 准备保存封面到本地:", filename);

    // 创建下载链接，让用户手动保存到 videoFiles/covers 文件夹
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.style.display = "none";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    console.log("📥 封面已下载，请保存到 videoFiles/covers 文件夹:", filename);
  } catch (error) {
    console.warn("❌ 本地保存失败:", error);
  }
};

// 🔥 监听封面组件的事件
const handleCustomCoverSet = (isCustom) => {
  customCoverSet.value = isCustom;
  console.log("🎨 用户自定义封面状态:", isCustom);
};

const handleVideoUploadError = (error) => {
  ElMessage.error("视频上传失败");
  console.error("上传错误:", error);
};

const selectedMaterialTab = ref("recent");

// 修改方法
const selectFromRecent = () => {
  selectedMaterialTab.value = "recent";
  nextTick(() => {
    materialSelectorVisible.value = true;
  });
};

const selectFromLibrary = () => {
  selectedMaterialTab.value = "library";
  nextTick(() => {
    materialSelectorVisible.value = true;
  });
};

// 修改 addMoreVideos 方法
const addMoreVideos = () => {
  nextTick(() => {
    materialSelectorVisible.value = true;
  });
};

const handleMaterialSelected = async (materials) => {
  const newMaterials = materials.filter((material) => {
    const exists = selectedVideos.value.find((v) => v.path === material.path);
    return !exists;
  });

  if (newMaterials.length > 0) {
    selectedVideos.value.push(...newMaterials);

    // 🔥 如果是第一次添加视频且没有自定义封面，生成默认封面
    if (
      selectedVideos.value.length === newMaterials.length &&
      !customCoverSet.value
    ) {
      await generateAndSetDefaultCover(newMaterials[0].url);
    }

    ElMessage.success(`已添加 ${newMaterials.length} 个视频`);
  }

  materialSelectorVisible.value = false;
};

const removeVideo = (index) => {
  selectedVideos.value.splice(index, 1);
};

const previewVideo = (video) => {
  window.open(video.url, "_blank");
};

const getAccountName = (accountId) => {
  const account = availableAccounts.value.find((acc) => acc.id === accountId);
  return account ? account.userName : accountId;
};

const formatFileSize = (size) => {
  const mb = size / (1024 * 1024);
  return mb.toFixed(1) + "MB";
};
// 视频相关处理方法
const handleVideoLoaded = (videoData) => {
  console.log("视频已加载:", videoData);
  // 可以在这里处理视频加载完成后的逻辑
};

const handleVideoError = (error) => {
  console.error("视频加载错误:", error);
  ElMessage.error("视频加载失败");
};

// 封面相关处理方法
const handleCoverChanged = (coverUrl) => {
  console.log("封面已更新:", coverUrl);
  publishForm.cover = coverUrl;

  // 如果用户设置了封面，标记为自定义封面
  if (coverUrl && coverUrl !== publishForm.cover) {
    customCoverSet.value = true;
  }
};
// 🔥 新增：保存封面到本地的方法
const saveCoverToLocal = async (frameData) => {
  // 获取当前选中的第一个视频文件名
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
  // 从选中的视频列表中获取第一个视频的文件名
  if (selectedVideos.value.length > 0) {
    const firstVideo = selectedVideos.value[0];
    return firstVideo.name || firstVideo.path || null;
  }
  
  return null;
};
// 账号相关处理方法
const handleRemoveAccount = (account) => {
  const index = selectedAccounts.value.indexOf(account.id);
  if (index > -1) {
    selectedAccounts.value.splice(index, 1);
    ElMessage.success(`已移除账号：${account.userName}`);
  }
};
// 禁用过去的日期
const disabledDate = (time) => {
  return time.getTime() < Date.now() - 24 * 60 * 60 * 1000; // 禁用昨天及之前
};

// 禁用过去的小时
const disabledHours = () => {
  const now = new Date();
  const selectedDate = new Date(publishForm.scheduleTime);

  // 如果选择的是今天，禁用当前小时之前的小时
  if (selectedDate.toDateString() === now.toDateString()) {
    return Array.from({ length: now.getHours() }, (_, i) => i);
  }

  return [];
};

// 禁用过去的分钟
const disabledMinutes = (hour) => {
  const now = new Date();
  const selectedDate = new Date(publishForm.scheduleTime);

  // 如果选择的是今天的当前小时，禁用当前分钟之前的分钟
  if (
    selectedDate.toDateString() === now.toDateString() &&
    hour === now.getHours()
  ) {
    return Array.from({ length: now.getMinutes() + 1 }, (_, i) => i);
  }

  return [];
};
const extractTimeFromSchedule = (scheduleTime) => {
  if (!scheduleTime) return "10:00";

  try {
    // 🔥 方案2：直接从字符串中提取时间部分
    if (typeof scheduleTime === "string") {
      // 处理 "2025-08-11 13:00:00" 格式
      const timeMatch = scheduleTime.match(/\s(\d{2}):(\d{2})/);
      if (timeMatch) {
        return `${timeMatch[1]}:${timeMatch[2]}`;
      }
    }

    // 回退到原方法
    const date = new Date(scheduleTime);
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    return `${hours}:${minutes}`;
  } catch (error) {
    console.error("提取时间失败:", error);
    return "10:00";
  }
};

const calculateDaysFromNow = (scheduleTime) => {
  if (!scheduleTime) return 0;

  try {
    // 🔥 方案2：直接从字符串中提取日期部分
    if (typeof scheduleTime === "string") {
      const dateMatch = scheduleTime.match(/^(\d{4}-\d{2}-\d{2})/);
      if (dateMatch) {
        const targetDateStr = dateMatch[1];
        const today = new Date().toISOString().split("T")[0];

        const targetDate = new Date(targetDateStr + "T00:00:00");
        const todayDate = new Date(today + "T00:00:00");

        const diffTime = targetDate - todayDate;
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

        console.log("🔧 calculateDaysFromNow 字符串方法:", {
          targetDateStr,
          today,
          diffDays,
        });

        return Math.max(0, diffDays);
      }
    }

    // 回退到原方法
    const now = new Date();
    const target = new Date(scheduleTime);
    const diffTime = target - now;
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  } catch (error) {
    console.error("计算天数失败:", error);
    return 0;
  }
};
const getDisplayTitleFromSaved = (savedForm) => {
  const title = savedForm.title.trim();
  const description = savedForm.description.trim();
  
  if (title) return title;
  if (description) {
    return description.length > 20 ? description.substring(0, 20) + '...' : description;
  }
  return '未命名发布任务';
};

const getLocationForPlatformFromSaved = (platformType, savedForm) => {
  if (platformType === 3) return savedForm.douyin.location || "";
  if (platformType === 2) return savedForm.wechat.location || "";
  return "";
};

const getPlatformSpecificSettingsFromSaved = (platformType, savedForm) => {
  const settings = {};
  if (platformType === 3) {
    settings.statement = savedForm.douyin.statement;
    settings.location = savedForm.douyin.location;
  } else if (platformType === 2) {
    settings.original = savedForm.wechat.original;
    settings.location = savedForm.wechat.location;
  }
  return settings;
};
const publishContent = async (mode = "background") => {
  if (!canPublish.value) {
    ElMessage.warning("请完善发布信息");
    return;
  }
  // 🔥 新增：定时发布时间验证
  if (publishForm.scheduleEnabled && publishForm.scheduleTime) {
    const scheduleDate = new Date(publishForm.scheduleTime);
    const now = new Date();

    if (scheduleDate <= now) {
      ElMessage.error("定时发布时间不能早于当前时间，请重新选择");
      return;
    }

    // 检查是否太接近当前时间（至少5分钟后）
    const minTime = new Date(now.getTime() + 5 * 60 * 1000);
    if (scheduleDate < minTime) {
      ElMessage.warning("定时发布时间建议设置在5分钟后，以确保发布成功");
      // 不阻止发布，只是提醒
    }

    console.log("🔧 时间验证通过:", {
      current: now.toLocaleString("zh-CN"),
      scheduled: scheduleDate.toLocaleString("zh-CN"),
      valid: scheduleDate > now,
    });
  }
  try {
    publishing.value = true;
    emit("published", { showDetail: true });

    // 🔥 关键：在重置之前保存当前表单数据
    const savedFormData = {
      selectedVideos: [...selectedVideos.value],
      selectedAccounts: [...selectedAccounts.value],
      publishForm: { ...publishForm },
      availableAccounts: [...availableAccounts.value]
    };

    // 🔥 立即重置表单数据，释放配置流程供下次使用
    resetAllFormData();
    // 🔥 直接发射关闭事件，不调用 handleDialogClose
    nextTick(() => {
      emit("update:visible", false);
    });

    // 🔥 使用保存的数据进行 API 调用
    const accountsByPlatform = {};
    savedFormData.selectedAccounts.forEach((accountId) => {
      const account = savedFormData.availableAccounts.find(acc => acc.id === accountId);
      if (account) {
        const platformType = getPlatformType(account.platform);
        if (!accountsByPlatform[platformType]) {
          accountsByPlatform[platformType] = [];
        }
        accountsByPlatform[platformType].push(account);
      }
    });

    // 为每个平台发送发布请求 - 使用保存的数据
    const publishPromises = Object.entries(accountsByPlatform).map(
      async ([platformType, accounts]) => {
        const publishData = {
          type: parseInt(platformType),
          title: savedFormData.publishForm.title.trim() || '',
          displayTitle: getDisplayTitleFromSaved(savedFormData.publishForm),
          tags: extractTags(savedFormData.publishForm.description),
          fileList: savedFormData.selectedVideos.map(video => video.path || video.name),
          accountList: accounts.map((account) => ({
            filePath: account.filePath,
            accountName: account.userName,
            accountId: account.accountId,
            platform: account.platform,
            type: account.type,
            avatar: account.avatar,
            bio: account.bio,
            followersCount: account.followersCount,
            videosCount: account.videosCount,
          })),
          thumbnail: savedFormData.publishForm.cover,
          location: getLocationForPlatformFromSaved(parseInt(platformType), savedFormData.publishForm),
          enableTimer: savedFormData.publishForm.scheduleEnabled ? 1 : 0,
          videosPerDay: 1,
          dailyTimes: savedFormData.publishForm.scheduleEnabled && savedFormData.publishForm.scheduleTime
            ? [extractTimeFromSchedule(savedFormData.publishForm.scheduleTime)]
            : ["10:00"],
          startDays: savedFormData.publishForm.scheduleEnabled && savedFormData.publishForm.scheduleTime
            ? calculateDaysFromNow(savedFormData.publishForm.scheduleTime)
            : 0,
          category: 0,
          mode: mode,
          original: savedFormData.publishForm.wechat.original,
          ...getPlatformSpecificSettingsFromSaved(parseInt(platformType), savedFormData.publishForm),
        };

        const response = await fetch(`${apiBaseUrl}/postVideo`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...authHeaders.value,
          },
          body: JSON.stringify(publishData),
        });

        return await response.json();
      }
    );

    // 异步处理结果，不阻塞用户操作
    Promise.all(publishPromises).then(results => {
      const allSuccess = results.every((result) => result.code === 200);
      const successCount = results.filter((result) => result.code === 200).length;

      if (allSuccess) {
        ElMessage.success(`发布成功！共发布到 ${Object.keys(accountsByPlatform).length} 个平台`);
      } else if (successCount > 0) {
        ElMessage.warning(`部分发布成功：${successCount}/${results.length} 个平台成功`);
      } else {
        ElMessage.error("发布失败，请检查网络连接和账号状态");
      }
    }).catch(error => {
      console.error("发布失败:", error);
      ElMessage.error("发布失败：" + error.message);
    });
  } catch (error) {
    console.error("发布失败:", error);
    ElMessage.error("发布失败：" + error.message);
  } finally {
    publishing.value = false;
  }
};
const accountSelectionKey = ref(0);

// 🔥 创建统一的默认配置
const DEFAULT_FORM_STATE = {
  title: "",
  description: "",
  cover: "",
  scheduleEnabled: false,
  scheduleTime: "",
  douyin: {
    statement: "无需声明",
    location: "",
  },
  wechat: {
    original: true,  // 🔥 确保原创默认为true
    location: "",
  },
};

// 🔥 创建统一的重置方法
const resetAllFormData = () => {
  // 重置步骤
  currentStep.value = "video";
  
  // 清空数组
  selectedVideos.value.length = 0;
  selectedAccounts.value.length = 0;
  
  // 🔥 使用统一配置重置表单
  Object.assign(publishForm, JSON.parse(JSON.stringify(DEFAULT_FORM_STATE)));
  
  // 重置封面状态
  customCoverSet.value = false;
  
  // 🔥 关键：立即重置 publishing 状态
  publishing.value = false;
  // 🔥 强制重置 AccountSelection 组件
  accountSelectionKey.value++;
  console.log("📝 发布配置已重置，可进行下次配置");
};
const getPlatformType = (platformName) => {
  const typeMap = {
    小红书: 1,
    视频号: 2,
    微信视频号: 2,
    抖音: 3,
    快手: 4,
  };
  return typeMap[platformName] || 2;
};

const extractTags = (description) => {
  if (!description) return [];
  const tagRegex = /#([^#\s]+)/g;
  const tags = [];
  let match;

  while ((match = tagRegex.exec(description)) !== null) {
    tags.push(match[1]);
  }

  return tags;
};

const dialogVisible = computed({
  get: () => props.visible,
  set: (value) => emit("update:visible", value), // 移除不必要的判断
});

// 3. 修复 handleDialogClose 方法
const handleDialogClose = () => {
  if (publishing.value) {
    ElMessage.warning("发布中，请稍候...");
    return;
  }

  resetAllFormData();
  nextTick(() => {
    emit("update:visible", false);
  });
};
</script>

<style lang="scss" scoped>
// 🎨 变量定义
$primary: #6366f1;
$primary-dark: #4f46e5;
$primary-light: #a5b4fc;
$success: #10b981;
$warning: #f59e0b;
$danger: #ef4444;
$info: #6b7280;

$bg-light: #f8fafc;
$bg-white: #ffffff;
$bg-gray: #f1f5f9;

$text-primary: #0f172a;
$text-secondary: #475569;
$text-muted: #94a3b8;

$border-light: #e2e8f0;
$shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
$shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1),
  0 2px 4px -1px rgba(0, 0, 0, 0.06);
$shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1),
  0 4px 6px -2px rgba(0, 0, 0, 0.05);
$shadow-soft: 0 4px 6px -1px rgba(0, 0, 0, 0.1),
  0 2px 4px -1px rgba(0, 0, 0, 0.06);

$radius-sm: 6px;
$radius-md: 8px;
$radius-lg: 12px;
$radius-xl: 16px;

$space-xs: 4px;
$space-sm: 8px;
$space-md: 16px;
$space-lg: 24px;
$space-xl: 32px;
// 在 NewPublishDialog.vue 的 <style> 部分添加以下样式

// 🔥 新增：媒体区域并排布局
.media-section {
  display: grid;
  grid-template-columns: 200px 200px; // 🔥 固定宽度，每个占 300px
  gap: 30px;
  margin-bottom: 24px;
  justify-content: center; // 🔥 居中显示

  .video-section,
  .cover-section {
    margin-bottom: 0; // 覆盖默认的 margin-bottom
  }
  // 🔥 统一视频和封面的容器尺寸
  .video-section,
  .cover-section {
    // 设置相同的宽高比容器
    .video-container,
    .cover-display {
      aspect-ratio: 9 / 16;
      width: 100%;
      border-radius: 12px;
      overflow: hidden;
    }
  }

  // 🔥 修复封面选择器样式
  .cover-section {
    :deep(.cover-selector) {
      .cover-display {
        // 移除默认样式，重新设置
        display: block;
        align-items: unset;
        gap: unset;
        padding: 0;
        background: transparent;
        border-radius: 12px;
        border: none; // 🔥 移除边框
        aspect-ratio: 9 / 16;

        .cover-image {
          width: 100%;
          height: 100%;
          border-radius: 12px;
          overflow: hidden;
          cursor: pointer;
          position: relative;

          img {
            width: 100%;
            height: 100%;
            object-fit: cover;
            border-radius: 12px;
          }

          .cover-placeholder {
            width: 100%;
            height: 100%;
            background: #f1f5f9;
            border: 2px dashed #e2e8f0;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 8px;
            color: #94a3b8;
            border-radius: 12px;

            span {
              font-size: 14px;
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
            border-radius: 12px;

            .el-icon {
              font-size: 16px;
            }

            span {
              font-size: 12px;
            }
          }

          &:hover .cover-overlay {
            opacity: 1;
          }
        }

        // 🔥 隐藏封面信息部分，只保留图片显示
        .cover-info {
          display: none;
        }
      }
    }
  }

  // 🔥 确保视频预览器尺寸一致
  .video-section {
    :deep(.video-preview) {
      &.mode-preview {
        display: block;
        justify-content: unset;

        .video-container {
          width: 100%;
          max-width: none;
          min-width: unset;
          aspect-ratio: 9 / 16;
          border-radius: 12px;
          border: none;

          .video-player {
            aspect-ratio: 9 / 16;
            border-radius: 12px;

            video {
              border-radius: 12px;
            }
          }
        }
      }
    }
  }
}
// 🎨 紧凑版对话框
.new-publish-dialog {
  :deep(.el-dialog) {
    border-radius: $radius-xl;
    margin: 5vh auto;

    .el-dialog__header {
      background: $bg-light;
      border-bottom: 1px solid $border-light;
      border-radius: $radius-xl $radius-xl 0 0;
      padding: 16px 24px;
    }

    .el-dialog__body {
      padding: 20px 24px;
    }

    .el-dialog__footer {
      padding: 16px 24px;
    }
  }

  // 🔧 紧凑版步骤指示器
  .steps-indicator-compact {
    display: flex;
    justify-content: center;
    margin-bottom: 24px;
    position: relative;

    &::before {
      content: "";
      position: absolute;
      top: 16px;
      left: 25%;
      right: 25%;
      height: 2px;
      background-color: $border-light;
      z-index: 1;
    }

    .step-item-compact {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
      flex: 1;
      max-width: 120px;
      z-index: 2;

      .step-circle-compact {
        width: 32px;
        height: 32px;
        border-radius: 50%;
        background-color: $bg-white;
        border: 2px solid $border-light;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 600;
        color: $text-muted;
        font-size: 14px;
        transition: all 0.2s ease;
      }

      .step-label-compact {
        font-size: 13px;
        color: $text-muted;
        font-weight: 500;
        text-align: center;
      }

      &.active {
        .step-circle-compact {
          background-color: $primary;
          border-color: $primary;
          color: white;
        }

        .step-label-compact {
          color: $primary;
          font-weight: 600;
        }
      }

      &.completed {
        .step-circle-compact {
          background-color: $success;
          border-color: $success;
          color: white;
        }

        .step-label-compact {
          color: $success;
        }
      }
    }
  }

  // 🔧 紧凑版步骤内容
  .step-content-compact {
    min-height: 320px;

    .step-panel-compact {
      .step-header-compact {
        text-align: center;
        margin-bottom: 20px;

        h4 {
          font-size: 16px;
          font-weight: 600;
          color: $text-primary;
          margin: 0 0 4px 0;
        }

        p {
          color: $text-secondary;
          margin: 0;
          font-size: 13px;
        }
      }
    }
  }

  // 🔧 紧凑版上传区域
  .upload-section-compact {
    .upload-area-compact {
      .video-uploader-compact {
        width: 100%;

        :deep(.el-upload-dragger) {
          width: 100%;
          height: 140px;
          border: 2px dashed $border-light;
          border-radius: $radius-lg;
          background-color: $bg-gray;
          transition: all 0.2s ease;

          &:hover {
            border-color: $primary;
            background-color: rgba(99, 102, 241, 0.05);
          }
        }

        .upload-content-compact {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;

          .upload-icon-compact {
            font-size: 32px;
            color: $primary;
          }

          .upload-text-compact {
            text-align: center;

            .upload-hint-compact {
              color: $text-secondary;
              font-size: 13px;

              em {
                color: $primary;
                font-style: normal;
              }
            }
          }
        }
      }

      .upload-options-compact {
        margin-top: 16px;
        text-align: center;

        .library-btn-compact {
          padding: 8px 16px;
          border-radius: $radius-lg;
        }
      }
    }

    .selected-videos-compact {
      .videos-header-compact {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 12px;

        h5 {
          font-size: 14px;
          font-weight: 600;
          color: $text-primary;
          margin: 0;
        }
      }

      .videos-grid-compact {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
        gap: 12px;

        .video-item-compact {
          background: $bg-gray;
          border-radius: $radius-lg;
          overflow: hidden;
          transition: all 0.2s ease;
          position: relative;

          &:hover {
            transform: translateY(-1px);
            box-shadow: $shadow-soft;

            .video-overlay-compact {
              opacity: 1;
            }
          }

          .video-preview-compact {
            height: 80px;
            position: relative;
            overflow: hidden;

            // 确保 VideoPreview 组件填满容器
            :deep(.video-preview) {
              width: 100%;
              height: 100%;
              border: none;
              border-radius: 0;

              .video-container {
                width: 100%;
                height: 100%;
                border: none;
                border-radius: 0;
                background: transparent;
              }

              .video-player {
                width: 100%;
                height: 100%;
                border-radius: 0;

                video {
                  width: 100%;
                  height: 100%;
                  object-fit: cover; // 填满容器，保持等比例
                }
              }
            }

            .video-overlay-compact {
              position: absolute;
              top: 0;
              left: 0;
              right: 0;
              bottom: 0;
              background: rgba(0, 0, 0, 0.7);
              display: flex;
              align-items: center;
              justify-content: center;
              opacity: 0;
              transition: opacity 0.2s ease;
              z-index: 10;

              .overlay-content {
                display: flex;
                gap: 4px;
              }

              .el-button {
                --el-button-size: 24px;
                width: 24px;
                height: 24px;
                padding: 0;

                .el-icon {
                  font-size: 12px;
                }
              }
            }
          }

          .video-info-compact {
            padding: 8px;

            .video-name-compact {
              font-weight: 500;
              color: $text-primary;
              margin-bottom: 2px;
              overflow: hidden;
              text-overflow: ellipsis;
              white-space: nowrap;
              font-size: 12px;
            }

            .video-size-compact {
              font-size: 11px;
              color: $text-secondary;
            }
          }
        }
      }
    }
  }

  // 🔧 账号选择区域样式
  .step-panel-compact {
    .accounts-section {
      .accounts-layout {
        display: grid;
        grid-template-columns: 200px 1fr;
        gap: 20px;
        min-height: 280px;

        .groups-sidebar {
          background: $bg-gray;
          border-radius: $radius-lg;
          padding: 16px;
          border: 1px solid $border-light;

          .sidebar-header {
            margin-bottom: 12px;
            padding-bottom: 8px;
            border-bottom: 1px solid $border-light;

            h5 {
              font-size: 14px;
              font-weight: 600;
              color: $text-primary;
              margin: 0;
            }
          }

          .group-category-title {
            font-size: 11px;
            font-weight: 500;
            color: $text-secondary;
            margin: 12px 0 8px 0;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }

          .sidebar-group-item {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 8px;
            border-radius: $radius-md;
            cursor: pointer;
            transition: all 0.2s ease;
            margin-bottom: 4px;

            &:hover {
              background-color: rgba(99, 102, 241, 0.1);
            }

            &.active {
              background-color: rgba(99, 102, 241, 0.1);
              border: 2px solid $primary;
              color: $text-primary;
            }

            .group-icon {
              width: 24px;
              height: 24px;
              border-radius: $radius-sm;
              display: flex;
              align-items: center;
              justify-content: center;
              flex-shrink: 0;

              .el-icon {
                font-size: 14px;
                color: white;
              }

              &.platform-logo-container {
                background: $bg-white;
                border: 1px solid $border-light;

                img {
                  width: 20px;
                  height: 20px;
                  border-radius: $radius-sm;
                  object-fit: cover;
                }
              }

              &.all-accounts {
                background-color: $info;
              }
            }

            .group-info {
              flex: 1;
              min-width: 0;

              .group-name {
                display: block;
                font-weight: 500;
                color: $text-primary;
                font-size: 12px;
                margin-bottom: 2px;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
              }

              .group-count {
                font-size: 10px;
                color: $text-secondary;
              }
            }
          }
        }

        .accounts-main {
          .accounts-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 12px;
            padding-bottom: 8px;
            border-bottom: 1px solid $border-light;

            .header-left {
              display: flex;
              flex-direction: column;
              gap: 8px;

              h5 {
                font-size: 14px;
                font-weight: 600;
                color: $text-primary;
                margin: 0;
              }

              .select-all-control {
                display: flex;
                align-items: center;
                gap: 8px;
                cursor: pointer;

                .custom-checkbox {
                  width: 16px;
                  height: 16px;
                  border: 2px solid $border-light;
                  border-radius: $radius-sm;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  background: white;

                  &.checked {
                    background-color: $primary;
                    border-color: $primary;
                    color: white;
                  }

                  &.indeterminate {
                    background-color: $warning;
                    border-color: $warning;
                    color: white;
                  }

                  .el-icon {
                    font-size: 10px;
                  }
                }

                .select-all-text {
                  font-size: 12px;
                  font-weight: 500;
                  color: $text-secondary;
                }
              }
            }

            .header-right {
              display: flex;
              align-items: center;
              gap: 12px;

              .selected-count {
                font-size: 12px;
                color: $text-secondary;
                font-weight: 500;
              }
            }
          }

          .accounts-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
            gap: 12px;
            max-height: 220px;
            overflow-y: auto;

            .account-card {
              background: $bg-gray;
              border: 2px solid transparent;
              border-radius: $radius-lg;
              padding: 8px 12px;
              cursor: pointer;
              transition: all 0.2s ease;
              position: relative;
              display: flex;
              align-items: center;
              gap: 12px;
              height: 60px;

              &:hover {
                transform: translateY(-1px);
                box-shadow: $shadow-md;
              }

              &.selected {
                border-color: $primary;
                background-color: rgba(99, 102, 241, 0.05);
              }

              &.disabled {
                opacity: 0.5;
                cursor: not-allowed;
              }

              .account-avatar {
                flex-shrink: 0;

                .avatar-container {
                  position: relative;

                  :deep(.el-avatar) {
                    border: 2px solid #f1f5f9;
                    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
                  }

                  .platform-logo {
                    position: absolute;
                    bottom: -2px;
                    right: -2px;
                    width: 16px;
                    height: 16px;
                    border-radius: 50%;
                    background: white;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.2);

                    img {
                      width: 14px;
                      height: 14px;
                      border-radius: 50%;
                      object-fit: cover;
                    }
                  }

                  .status-dot {
                    position: absolute;
                    top: 2px;
                    right: 2px;
                    width: 10px;
                    height: 10px;
                    border-radius: 50%;
                    border: 2px solid white;

                    &.online {
                      background-color: $success;
                    }

                    &.offline {
                      background-color: $danger;
                    }
                  }

                  .selected-mark {
                    position: absolute;
                    top: -4px;
                    right: -4px;
                    width: 16px;
                    height: 16px;
                    background-color: $primary;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: white;
                    font-size: 10px;
                  }
                }
              }

              .account-info {
                flex: 1;
                min-width: 0;

                .account-name {
                  font-weight: 500;
                  color: $text-primary;
                  font-size: 12px;
                  overflow: hidden;
                  text-overflow: ellipsis;
                  white-space: nowrap;
                  margin: 0;
                }

                .account-group {
                  margin-top: 2px;

                  :deep(.el-tag) {
                    font-size: 10px;
                    height: 16px;
                    padding: 0 4px;
                  }
                }
              }
            }
          }
        }
      }
    }
  }

  // 🔧 内容表单区域
  .content-form {
    .form-section {
      margin-bottom: 20px;

      &:last-child {
        margin-bottom: 0;
      }

      h5 {
        font-size: 14px;
        font-weight: 600;
        color: $text-primary;
        margin: 0 0 8px 0;
      }
    }

    .video-display {
      display: flex;
      align-items: center;
      gap: 12px;
      background: $bg-gray;
      padding: 12px;
      border-radius: $radius-lg;

      .video-thumbnail {
        width: 50px;
        height: 30px;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        border-radius: $radius-md;
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;

        .video-icon {
          font-size: 14px;
        }
      }

      .video-info {
        .video-count {
          font-weight: 600;
          color: $text-primary;
          margin-bottom: 2px;
          font-size: 12px;
        }

        .video-names {
          font-size: 10px;
          color: $text-secondary;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
      }
    }

    .selected-accounts-display {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;

      .account-tag {
        border-radius: $radius-md;
        font-size: 11px;
        height: 20px;
        padding: 0 6px;
      }
    }

    .publish-form {
      :deep(.el-form-item) {
        margin-bottom: 16px;

        .el-form-item__label {
          font-size: 13px;
          font-weight: 500;
        }
      }

      .title-input {
        :deep(.el-input__inner) {
          height: 36px;
          border-radius: $radius-md;
        }
      }

      .platform-form-section {
        background: $bg-light;
        padding: 12px;
        border-radius: $radius-lg;
        margin-bottom: 12px;

        h6 {
          font-size: 13px;
          font-weight: 600;
          color: $text-primary;
          margin: 0 0 8px 0;
        }
      }

      .publish-settings {
        .schedule-options {
          margin-top: 12px;
          padding: 12px;
          background: $bg-gray;
          border-radius: $radius-md;

          .schedule-row {
            display: flex;
            align-items: center;
            gap: 12px;

            .label {
              min-width: 70px;
              font-weight: 500;
              color: $text-primary;
              font-size: 13px;
            }
          }
        }
      }
    }
  }

  // 🔧 紧凑版对话框底部
  .dialog-footer-compact {
    display: flex;
    justify-content: space-between;
    align-items: center;

    .footer-left-compact {
      display: flex;
      gap: 5px;
    }

    .footer-right-compact {
      display: flex;
      gap: 8px;
    }
  }
}

// 🔧 响应式设计优化
@media (max-width: 768px) {
  // 🔥 媒体区域响应式布局
  .media-section {
    grid-template-columns: 1fr;
    gap: 16px;

    .video-section,
    .cover-section {
      margin-bottom: 16px;
    }
  }

  // 对话框响应式调整
  .new-publish-dialog {
    :deep(.el-dialog) {
      width: 95% !important;
      margin: 2vh auto;
    }

    .steps-indicator-compact {
      .step-item-compact {
        .step-label-compact {
          font-size: 11px;
        }
      }
    }

    .videos-grid-compact {
      grid-template-columns: repeat(auto-fill, minmax(100px, 1fr)) !important;
    }

    .accounts-layout {
      grid-template-columns: 1fr !important;

      .groups-sidebar {
        order: 2;
        margin-top: 16px;
      }

      .accounts-main {
        order: 1;
      }
    }
  }
}
</style>
