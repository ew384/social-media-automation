<template>
  <div :class="['message-bubble', { 'is-mine': message.sender === 'me' }]">
    <!-- 用户头像（对方消息显示） -->
    <div v-if="message.sender === 'user'" class="message-avatar">
      <el-avatar :size="32" :src="getUserAvatar()" @error="handleAvatarError" />
    </div>

    <!-- 消息内容 -->
    <div class="message-content">
      <!-- 消息气泡 -->
      <div :class="['bubble', message.sender]">
        <!-- 文字内容 -->
        <div v-if="message.text" class="text-content">
          {{ displayText }}
        </div>

        <!-- 图片内容 -->
        <div
          v-if="message.images && message.images.length > 0"
          class="images-content"
        >
          <div
            v-for="(image, index) in message.images"
            :key="index"
            class="image-item"
            @click="handleImageClick(image, index)"
          >
            <img
              :src="getImageUrl(image)"
              :alt="`图片 ${index + 1}`"
              @error="handleImageError"
              @load="handleImageLoad"
            />
            <div class="image-overlay">
              <el-icon><ZoomIn /></el-icon>
            </div>
          </div>
        </div>
        <!-- 🔥 状态指示器直接放在消息内容内部 -->
        <div v-if="message.sender === 'me'" class="message-status">
          <!-- 发送中状态 -->
          <div v-if="message.status === 'sending'" class="status-sending">
            <el-icon class="loading-icon"><Loading /></el-icon>
          </div>

          <!-- 发送成功状态 -->
          <div v-else-if="message.status === 'sent'" class="status-sent">
            <el-icon class="success-icon"><Check /></el-icon>
          </div>

          <!-- 发送失败状态 -->
          <div v-else-if="message.status === 'failed'" class="status-failed">
            <el-icon class="error-icon"><Close /></el-icon>
            <span v-if="message.error" class="error-tooltip">{{
              message.error
            }}</span>
          </div>

          <!-- 已同步确认状态（数据库中的消息）- 通常不显示，或显示更淡的勾 -->
          <div v-else class="status-confirmed">
            <el-icon class="confirmed-icon"><Check /></el-icon>
          </div>
        </div>
      </div>
    </div>

    <!-- 我的头像（我的消息显示） -->
    <div v-if="message.sender === 'me'" class="message-avatar">
      <el-avatar :size="32" :src="getMyAvatar()" @error="handleAvatarError" />
    </div>
  </div>
</template>

<script setup>
import { computed } from "vue";
import {
  ZoomIn,
  Check,
  Clock,
  Loading,
  Close,
  CircleCheck,
} from "@element-plus/icons-vue";
import { useMessageStore } from "@/stores/message";
import { getPlatformKey } from "@/utils/platform";
import { useAccountStore } from "@/stores/account";
import { convertWechatToEmoji } from "@/utils/emoji";
const props = defineProps({
  message: {
    type: Object,
    required: true,
  },
  platform: {
    type: String,
    default: "",
  },
});
const messageStore = useMessageStore();
const accountStore = useAccountStore();
// Emits
const emit = defineEmits(["image-preview"]);
const displayText = computed(() => {
  return convertWechatToEmoji(props.message.text);
});
// 计算属性
const isMessageRead = computed(() => {
  return props.message.is_read === true || props.message.is_read === 1;
});

// 获取用户头像
const getUserAvatar = () => {
  return messageStore.selectedThread?.avatar || "/default-avatar.png";
};
// 获取我的头像
const getMyAvatar = () => {
  const selectedAccount = messageStore.selectedAccount;
  if (!selectedAccount) return "/default-avatar.png";

  // 🔥 使用工具函数进行平台名称标准化
  const selectedPlatformKey = getPlatformKey(selectedAccount.platform);

  // 🔥 找到匹配的账号（支持平台名称的多种格式）
  const fullAccount = accountStore.accounts.find((acc) => {
    const accountPlatformKey = getPlatformKey(acc.platform);
    const accountMatch =
      acc.userName === selectedAccount.accountId ||
      acc.id === selectedAccount.accountId;

    return accountPlatformKey === selectedPlatformKey && accountMatch;
  });

  //console.log("🔍 找到的完整账号:", fullAccount);

  if (!fullAccount) return "/default-avatar.png";

  // 🔥 使用 PlatformAccounts 相同的 getAvatarUrl 逻辑
  if (
    fullAccount.local_avatar &&
    fullAccount.local_avatar !== "/default-avatar.png"
  ) {
    return fullAccount.local_avatar.startsWith("assets/avatar/")
      ? `http://localhost:3409/${fullAccount.local_avatar}`
      : fullAccount.local_avatar;
  }

  if (
    fullAccount.avatar_url &&
    fullAccount.avatar_url !== "/default-avatar.png"
  ) {
    return fullAccount.avatar_url;
  }

  if (fullAccount.avatar && fullAccount.avatar !== "/default-avatar.png") {
    return fullAccount.avatar.startsWith("assets/avatar/")
      ? `http://localhost:3409/${fullAccount.avatar}`
      : fullAccount.avatar;
  }

  if (fullAccount.userName && fullAccount.platform) {
    const platformKey = getPlatformKey(fullAccount.platform);
    if (platformKey !== fullAccount.platform.toLowerCase()) {
      return `http://localhost:3409/assets/avatar/${platformKey}/${fullAccount.userName}/avatar.jpg`;
    }
  }

  return "/default-avatar.png";
};
// 获取图片URL
const getImageUrl = (imagePath) => {
  if (!imagePath) return "/placeholder-image.png";

  // 如果是完整URL，直接返回
  if (imagePath.startsWith("http://") || imagePath.startsWith("https://")) {
    return imagePath;
  }

  // 如果是相对路径，构造完整URL
  if (imagePath.startsWith("assets/")) {
    return `http://localhost:3409/${imagePath}`;
  }

  // 如果是base64或其他格式
  if (imagePath.startsWith("data:image/")) {
    return imagePath;
  }

  // 默认返回占位图
  return "/placeholder-image.png";
};

// 格式化时间
const formatTime = (timestamp) => {
  if (!timestamp) return "";

  const messageTime = new Date(timestamp);
  return messageTime.toLocaleTimeString("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
};

// 事件处理
const handleImageClick = (image, index) => {
  const imageUrl = getImageUrl(image);
  const allImages = props.message.images.map((img) => getImageUrl(img));
  emit("image-preview", imageUrl, allImages, index);
};

const handleAvatarError = (e) => {
  e.target.src = "/default-avatar.png";
};

const handleImageError = (e) => {
  e.target.src = "/placeholder-image.png";
};

const handleImageLoad = (e) => {
  // 图片加载完成，可以在这里处理一些逻辑
  console.log("图片加载完成:", e.target.src);
};
// 🔥 新增：计算消息样式类
const messageClasses = computed(() => ({
  "is-mine": message.sender === "me",
  "is-user": message.sender === "user",
  "is-sending": message.status === "sending",
  "is-failed": message.status === "failed",
  // ... 其他现有的类保持不变
}));
</script>

<style lang="scss" scoped>
$primary: #5b73de;
$success: #10b981;
$text-primary: #1e293b;
$text-secondary: #64748b;
$text-muted: #94a3b8;
$bg-white: #ffffff;
$bg-light: #f8fafc;
$bg-blue-light: #e6f7ff;
$bg-gray-light: #f6f6f6;
$border-light: #e2e8f0;
$shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
$radius-md: 8px;
$radius-lg: 12px;
$space-xs: 4px;
$space-sm: 8px;
$space-md: 16px;

.message-bubble {
  display: flex;
  gap: $space-sm;
  margin-bottom: $space-md;
  align-items: flex-end;

  &.is-mine {
    flex-direction: row-reverse;

    .message-content {
      align-items: flex-end;

      .bubble {
        &.me {
          background: linear-gradient(135deg, $primary 0%, #8b9ee8 100%);
          color: white;
          border-bottom-right-radius: $space-xs;
        }
      }
    }
  }

  .message-avatar {
    flex-shrink: 0;

    :deep(.el-avatar) {
      border: 2px solid $bg-light;
      box-shadow: $shadow-sm;
    }
  }

  .message-content {
    position: relative;
    display: flex;
    flex-direction: column;
    max-width: 70%;
    min-width: 0;

    .bubble {
      padding: $space-sm $space-md;
      border-radius: $radius-lg;
      position: relative; // 🔥 关键：为状态图标绝对定位做准备
      word-wrap: break-word;
      word-break: break-word;

      &.user {
        background: $bg-white;
        color: $text-primary;
        border: 1px solid $border-light;
        border-bottom-left-radius: $space-xs;
        box-shadow: $shadow-sm;
      }

      &.me {
        background: linear-gradient(135deg, $primary 0%, #8b9ee8 100%);
        color: white;
        border-bottom-right-radius: $space-xs;
        box-shadow: 0 2px 8px rgba(91, 115, 222, 0.3);
      }

      .text-content {
        font-size: 14px;
        line-height: 1.4;
        margin-bottom: $space-xs;
        white-space: pre-wrap;
      }

      .images-content {
        margin-bottom: $space-xs;

        .image-item {
          position: relative;
          cursor: pointer;
          border-radius: $radius-md;
          overflow: hidden;
          margin-bottom: $space-xs;
          transition: transform 0.3s ease;

          &:hover {
            transform: scale(1.02);

            .image-overlay {
              opacity: 1;
            }
          }

          &:last-child {
            margin-bottom: 0;
          }

          img {
            width: 100%;
            max-width: 200px;
            height: auto;
            border-radius: $radius-md;
            display: block;
            box-shadow: $shadow-sm;
          }

          .image-overlay {
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.4);
            display: flex;
            align-items: center;
            justify-content: center;
            opacity: 0;
            transition: opacity 0.3s ease;
            border-radius: $radius-md;

            .el-icon {
              font-size: 24px;
              color: white;
            }
          }
        }
      }

      .message-meta {
        display: flex;
        align-items: center;
        gap: $space-xs;
        font-size: 11px;
        margin-top: $space-xs;

        .message-time {
          color: $text-muted;
        }

        .message-status {
          display: flex;
          align-items: center;

          .el-icon {
            font-size: 12px;
          }

          .status-read {
            color: $success;
          }

          .status-sent {
            color: $text-muted;
          }
        }
      }

      // 🔥 新增：状态图标样式 - 放在 .bubble 内部
      .message-status {
        position: absolute;
        bottom: 4px;
        right: 8px;
        display: flex;
        align-items: center;
        justify-content: flex-end;
        height: 16px;
        z-index: 2; // 确保在其他内容之上

        .status-sending {
          color: rgba(255, 255, 255, 0.7); // 白色半透明（在蓝色背景上）

          .loading-icon {
            font-size: 12px;
            animation: rotate 1s linear infinite;
          }
        }

        .status-sent {
          color: rgba(255, 255, 255, 0.9); // 白色（在蓝色背景上）

          .success-icon {
            font-size: 14px;
          }
        }

        .status-failed {
          position: relative;
          color: #fca5a5; // 浅红色（在蓝色背景上更明显）
          cursor: pointer;

          .error-icon {
            font-size: 14px;
          }

          .error-tooltip {
            position: absolute;
            bottom: 120%;
            right: 0;
            background: #1f2937;
            color: white;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 11px;
            white-space: nowrap;
            opacity: 0;
            pointer-events: none;
            transition: opacity 0.3s;
            z-index: 10;

            &::after {
              content: "";
              position: absolute;
              top: 100%;
              right: 8px;
              border: 4px solid transparent;
              border-top-color: #1f2937;
            }
          }

          &:hover .error-tooltip {
            opacity: 1;
          }
        }

        .status-confirmed {
          color: rgba(255, 255, 255, 0.5); // 很淡的白色

          .confirmed-icon {
            font-size: 12px;
          }
        }
      }
    }
  }

  // 🔥 状态修饰符样式
  &.is-sending {
    opacity: 0.8;

    .bubble {
      border: 1px dashed rgba(255, 255, 255, 0.5) !important;
    }
  }

  &.is-failed {
    .bubble {
      border-left: 3px solid #ef4444 !important;
      background: linear-gradient(135deg, #ef4444 0%, #fca5a5 100%) !important;
    }
  }
}

// 特殊样式处理
.bubble {
  // 连续消息气泡间距
  .message-bubble + .message-bubble {
    margin-top: $space-xs;
  }

  // 图片消息的特殊样式
  &:has(.images-content:only-child) {
    padding: $space-xs;
    background: transparent !important;
    box-shadow: none !important;
    border: none !important;

    &.user {
      background: transparent !important;
    }

    &.me {
      background: transparent !important;
    }
  }
}

// 响应式处理
@media (max-width: 768px) {
  .message-bubble {
    .message-content {
      max-width: 85%;
    }

    .bubble {
      .images-content {
        .image-item {
          img {
            max-width: 160px;
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
</style>
