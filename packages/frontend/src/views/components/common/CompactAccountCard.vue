<template>
  <div class="compact-account-card">
    <div class="account-avatar">
      <div class="avatar-container">
        <el-avatar
          :size="32"
          :src="getAvatarUrl(account)"
          @error="handleAvatarError"
        >
          <span>{{ account.userName ? account.userName.charAt(0) : 'U' }}</span>
        </el-avatar>
        
        <!-- 平台logo -->
        <div class="platform-logo">
          <img
            v-if="getPlatformLogo(account.platform)"
            :src="getPlatformLogo(account.platform)"
            :alt="account.platform"
            @error="handlePlatformLogoError"
          />
          <div v-else class="platform-text">
            {{ account.platform ? account.platform.charAt(0) : 'P' }}
          </div>
        </div>
        
        <!-- 状态点 -->
        <div
          :class="[
            'status-dot',
            account.status === '正常' ? 'online' : 'offline',
          ]"
        ></div>
      </div>
    </div>
    
    <div class="account-info">
      <div class="account-name">{{ account.userName || '未命名账号' }}</div>
      <div class="account-platform">{{ account.platform }}</div>
    </div>
    
    <!-- 移除按钮 -->
    <div v-if="removable" class="remove-btn" @click="handleRemove">
      <el-icon><Close /></el-icon>
    </div>
  </div>
</template>

<script setup>
import { Close } from '@element-plus/icons-vue';

// Props
const props = defineProps({
  account: {
    type: Object,
    required: true
  },
  removable: {
    type: Boolean,
    default: false
  }
});

// Emits
const emit = defineEmits(['remove']);

// 方法
const getAvatarUrl = (account) => {
  if (account.avatar && account.avatar !== "/default-avatar.png") {
    if (account.avatar.startsWith("assets/avatar/")) {
      return `http://localhost:3409/${account.avatar}`;
    }
    return account.avatar;
  }
  return null;
};

const handleAvatarError = (e) => {
  console.warn("头像加载失败:", e);
};

const handlePlatformLogoError = (e) => {
  console.warn("平台logo加载失败:", e);
  e.target.style.display = 'none';
};

const getPlatformLogo = (platform) => {
  const logoMap = {
    抖音: "/logos/douyin.png",
    快手: "/logos/kuaishou.png",
    视频号: "/logos/wechat_shipinghao.png",
    微信视频号: "/logos/wechat_shipinghao.png",
    小红书: "/logos/xiaohongshu.jpg",
  };
  return logoMap[platform] || null;
};

const handleRemove = () => {
  emit('remove', props.account);
};
</script>

<style lang="scss" scoped>
$primary: #6366f1;
$success: #10b981;
$danger: #ef4444;
$info: #6b7280;

$bg-white: #ffffff;
$bg-gray: #f5f7f9cd;
$text-primary: #0f172a;
$text-secondary: #475569;
$border-light: #ffffff;

$radius-sm: 4px;
$radius-md: 8px;
$space-xs: 4px;
$space-sm: 8px;
$space-md: 16px;

.compact-account-card {
  display: flex;
  align-items: center;
  gap: $space-sm;
  padding: $space-sm;
  background: $bg-gray;
  border-radius: $radius-md;
  border: 1px solid $border-light;
  min-width: 140px;
  position: relative;
  transition: all 0.2s ease;

  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    
    .remove-btn {
      opacity: 1;
    }
  }

  .account-avatar {
    flex-shrink: 0;

    .avatar-container {
      position: relative;

      :deep(.el-avatar) {
        border: 2px solid white;
        box-shadow: 0 1px 4px rgba(0, 0, 0, 0.1);
      }

      .platform-logo {
        position: absolute;
        bottom: -2px;
        right: -2px;
        width: 14px;
        height: 14px;
        border-radius: 50%;
        background: white;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
        border: 1px solid white;

        img {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          object-fit: cover;
        }

        .platform-text {
          font-size: 8px;
          font-weight: 600;
          color: $text-primary;
        }
      }

      .status-dot {
        position: absolute;
        top: 0;
        right: 0;
        width: 8px;
        height: 8px;
        border-radius: 50%;
        border: 2px solid white;

        &.online {
          background-color: $success;
        }

        &.offline {
          background-color: $danger;
        }
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
      line-height: 1.2;
      margin-bottom: 2px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .account-platform {
      font-size: 10px;
      color: $text-secondary;
      line-height: 1;
    }
  }

  .remove-btn {
    position: absolute;
    top: -4px;
    right: -4px;
    width: 16px;
    height: 16px;
    background: $danger;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    opacity: 0;
    transition: all 0.2s ease;
    color: white;

    .el-icon {
      font-size: 10px;
    }

    &:hover {
      transform: scale(1.1);
    }
  }
}
</style>