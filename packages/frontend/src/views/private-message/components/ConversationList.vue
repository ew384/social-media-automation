<template>
  <div class="conversation-list">
    <!-- 顶部工具栏 -->
    <div class="toolbar">
      <!-- 搜索框 -->
      <div class="search-container">
        <el-input
          v-model="searchKeyword"
          placeholder="搜索会话..."
          clearable
          @input="handleSearch"
          class="search-input"
        >
          <template #prefix>
            <el-icon class="search-icon"><Search /></el-icon>
          </template>
        </el-input>
      </div>

      <!-- 筛选标签 -->
      <div class="filter-tabs">
        <div
          v-for="filter in filterOptions"
          :key="filter.key"
          :class="['filter-tab', { active: filterType === filter.key }]"
          @click="setFilter(filter.key)"
        >
          <span class="filter-label">{{ filter.label }}</span>
          <span v-if="filter.count > 0" class="filter-count">{{
            filter.count
          }}</span>
        </div>
      </div>
    </div>

    <!-- 会话列表区域 -->
    <div class="conversations-container">
      <!-- 加载状态 -->
      <div v-if="messageStore.isLoadingThreads" class="loading-state">
        <div class="loading-content">
          <el-icon class="loading-spinner"><Loading /></el-icon>
          <span class="loading-text">加载会话中...</span>
        </div>
      </div>

      <!-- 会话列表 -->
      <div
        v-else-if="filteredConversations.length > 0"
        class="conversations-list"
      >
        <div
          v-for="conversation in filteredConversations"
          :key="conversation.id"
          :class="[
            'conversation-item',
            {
              active: isConversationSelected(conversation),
              unread: conversation.unread_count > 0,
              pinned: conversation.is_pinned,
            },
          ]"
          @click="handleSelectConversation(conversation)"
        >
          <!-- 左侧头像区域 -->
          <div class="avatar-section">
            <div class="user-avatar-container">
              <el-avatar
                :size="44"
                :src="conversation.avatar || '/default-avatar.png'"
                @error="handleAvatarError"
                class="user-avatar"
              />

              <!-- 在线状态点 -->
              <div v-if="conversation.is_online" class="online-indicator"></div>

              <!-- 平台标识 -->
              <div class="platform-indicator">
                <img
                  :src="getPlatformLogo(conversation.platform)"
                  :alt="conversation.platform"
                  class="platform-logo"
                />
              </div>
            </div>
          </div>

          <!-- 右侧内容区域 -->
          <div class="content-section">
            <!-- 顶部信息行 -->
            <div class="header-row">
              <div class="user-info">
                <span class="user-name">{{ conversation.user_name }}</span>
                <span v-if="conversation.is_verified" class="verified-badge">
                  <el-icon><Select /></el-icon>
                </span>
              </div>

              <div class="meta-info">
                <span class="message-time">{{
                  formatMessageTime(conversation.last_message_time)
                }}</span>
                <div v-if="conversation.unread_count > 0" class="unread-count">
                  {{
                    conversation.unread_count > 99
                      ? "99+"
                      : conversation.unread_count
                  }}
                </div>
              </div>
            </div>

            <!-- 消息预览行 -->
            <div class="message-row">
              <div class="message-preview">
                <span class="message-content">{{
                  getMessagePreview(conversation)
                }}</span>
              </div>

              <!-- 消息状态和操作 -->
              <div class="message-status">
                <el-icon v-if="conversation.is_pinned" class="pin-icon"
                  ><Lock
                /></el-icon>
                <el-icon v-if="conversation.is_muted" class="mute-icon"
                  ><MuteNotification
                /></el-icon>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 空状态 -->
      <div v-else class="empty-state">
        <div class="empty-content">
          <div class="empty-illustration">
            <el-icon class="empty-icon"><ChatDotRound /></el-icon>
          </div>
          <h3 class="empty-title">{{ getEmptyTitle() }}</h3>
          <p class="empty-description">{{ getEmptyDescription() }}</p>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup>
import { ref, computed, watch } from "vue";
import {
  Search,
  Loading,
  ChatDotRound,
  Select,
  Lock,
  MuteNotification,
  User,
} from "@element-plus/icons-vue";
import { useMessageStore } from "@/stores/message";
import { getPlatformLogo } from "@/utils/platform";
import { convertWechatToEmoji } from "@/utils/emoji";
// 状态管理
const messageStore = useMessageStore();

// 本地状态
const searchKeyword = ref("");
const filterType = ref("all");
const isLoadingMore = ref(false);
const searchResults = ref([]);
const isSearching = ref(false);

// 筛选选项
const filterOptions = computed(() => [
  {
    key: "all",
    label: "全部",
    count: messageStore.threadsList?.length || 0,
  },
  {
    key: "unread",
    label: "未读",
    count:
      messageStore.threadsList?.filter((conv) => conv.unread_count > 0)
        .length || 0,
  },
  {
    key: "recent",
    label: "最近",
    count: getRecentConversationsCount(),
  },
]);

// 计算属性
const filteredConversations = computed(() => {
  let conversations = [];

  // 如果有搜索关键词，显示搜索结果
  if (searchKeyword.value.trim()) {
    return searchResults.value;
  }

  // 否则显示普通会话列表
  conversations = messageStore.threadsList || [];

  // 根据筛选类型过滤
  switch (filterType.value) {
    case "unread":
      conversations = conversations.filter((conv) => conv.unread_count > 0);
      break;
    case "recent":
      const oneDayAgo = new Date(
        Date.now() - 24 * 60 * 60 * 1000
      ).toISOString();
      conversations = conversations.filter(
        (conv) => conv.last_message_time && conv.last_message_time > oneDayAgo
      );
      break;
    case "all":
    default:
      break;
  }

  // 按置顶、未读、时间排序
  return conversations.sort((a, b) => {
    // 置顶会话优先
    if (a.is_pinned && !b.is_pinned) return -1;
    if (!a.is_pinned && b.is_pinned) return 1;

    // 未读会话优先
    if (a.unread_count > 0 && b.unread_count === 0) return -1;
    if (a.unread_count === 0 && b.unread_count > 0) return 1;

    // 按时间排序
    const timeA = a.last_message_time
      ? new Date(a.last_message_time)
      : new Date(0);
    const timeB = b.last_message_time
      ? new Date(b.last_message_time)
      : new Date(0);
    return timeB - timeA;
  });
});


// 工具方法
const getRecentConversationsCount = () => {
  if (!messageStore.threadsList) return 0;
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  return messageStore.threadsList.filter(
    (conv) => conv.last_message_time && conv.last_message_time > oneDayAgo
  ).length;
};

const getTotalUnreadCount = () => {
  return filteredConversations.value.reduce(
    (total, conv) => total + (conv.unread_count || 0),
    0
  );
};

const formatMessageTime = (timestamp) => {
  if (!timestamp) return "";

  const messageTime = new Date(timestamp);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
  const thisWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

  if (messageTime >= today) {
    // 今天 - 显示时分
    return messageTime.toLocaleTimeString("zh-CN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  } else if (messageTime >= yesterday) {
    // 昨天
    return "昨天";
  } else if (messageTime >= thisWeek) {
    // 本周 - 显示星期
    return messageTime.toLocaleDateString("zh-CN", { weekday: "short" });
  } else {
    // 更早 - 显示月日
    return messageTime.toLocaleDateString("zh-CN", {
      month: "2-digit",
      day: "2-digit",
    });
  }
};

const getMessagePreview = (conversation) => {
  if (conversation.last_message_text) {
    // 🔥 先转换emoji，再截断文本
    const convertedText = convertWechatToEmoji(conversation.last_message_text);
    return convertedText.length > 30
      ? convertedText.substring(0, 30) + "..."
      : convertedText;
  }

  const typePreviewMap = {
    image: "[图片]",
    video: "[视频]",
    voice: "[语音]",
    file: "[文件]",
    mixed: "[图文消息]",
    system: "[系统消息]",
  };

  return typePreviewMap[conversation.last_message_type] || "暂无消息";
};

const getEmptyTitle = () => {
  if (!messageStore.selectedAccount) {
    return "请选择账号";
  }

  if (searchKeyword.value.trim()) {
    return "没有找到匹配的会话";
  }

  switch (filterType.value) {
    case "unread":
      return "暂无未读会话";
    case "recent":
      return "暂无最近会话";
    default:
      return "暂无会话";
  }
};

const getEmptyDescription = () => {
  if (!messageStore.selectedAccount) {
    return "在左侧选择一个账号来查看私信会话";
  }

  if (searchKeyword.value.trim()) {
    return "尝试使用其他关键词搜索";
  }

  switch (filterType.value) {
    case "unread":
      return "所有消息都已查看";
    case "recent":
      return "最近24小时内没有新会话";
    default:
      return "该账号还没有私信会话";
  }
};

const isConversationSelected = (conversation) => {
  return (
    messageStore.selectedThread &&
    messageStore.selectedThread.threadId === conversation.id
  );
};

// 事件处理
const handleSearch = async () => {
  const keyword = searchKeyword.value.trim();

  if (!keyword) {
    searchResults.value = [];
    isSearching.value = false;
    return;
  }

  if (!messageStore.selectedAccount) {
    return;
  }

  isSearching.value = true;

  try {
    const results = await messageStore.searchMessages(keyword);

    searchResults.value = results.map((result) => ({
      id: result.thread_id,
      user_name: result.user_name,
      avatar: result.user_avatar,
      platform: messageStore.selectedAccount.platform,
      last_message_text: result.message.text,
      last_message_type: result.message.type,
      last_message_time: result.message.timestamp,
      unread_count: 0,
      is_search_result: true,
    }));
  } catch (error) {
    console.error("搜索失败:", error);
    searchResults.value = [];
  } finally {
    isSearching.value = false;
  }
};

const setFilter = (type) => {
  filterType.value = type;
};

const handleSelectConversation = async (conversation) => {
  try {
    console.log("🔍 选中的会话对象:", conversation);

    await messageStore.selectThread(
      conversation.id,
      conversation.user_name,
      conversation.avatar
    );
  } catch (error) {
    console.error("选择会话失败:", error);
  }
};

const loadMoreConversations = async () => {
  isLoadingMore.value = true;
  try {
    await new Promise((resolve) => setTimeout(resolve, 1000));
  } finally {
    isLoadingMore.value = false;
  }
};

const handleAvatarError = (e) => {
  e.target.src = "/default-avatar.png";
};

// 监听选中账号变化，清空搜索
watch(
  () => messageStore.selectedAccount,
  () => {
    searchKeyword.value = "";
    searchResults.value = [];
    filterType.value = "all";
  }
);
</script>

<style lang="scss" scoped>
$primary: #6366f1;
$primary-light: #a5b4fc;
$success: #10b981;
$warning: #f59e0b;
$danger: #ef4444;
$info: #6b7280;

$bg-primary: #ffffff;
$bg-secondary: #f8fafc;
$bg-tertiary: #f1f5f9;
$bg-accent: rgba(99, 102, 241, 0.05);
$bg-hover: rgba(99, 102, 241, 0.08);

$text-primary: #1e293b;
$text-secondary: #64748b;
$text-muted: #94a3b8;
$text-white: #ffffff;

$border-light: #e2e8f0;
$border-lighter: #f1f5f9;

$shadow-xs: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
$shadow-sm: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06);
$shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1),
  0 2px 4px -1px rgba(0, 0, 0, 0.06);

$radius-sm: 6px;
$radius-md: 8px;
$radius-lg: 12px;
$radius-xl: 16px;
$radius-full: 9999px;

$space-xs: 4px;
$space-sm: 8px;
$space-md: 12px;
$space-lg: 16px;
$space-xl: 20px;

.conversation-list {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: $bg-secondary;
}

// 顶部工具栏
.toolbar {
  padding: $space-lg;
  background: $bg-primary;
  border-bottom: 1px solid $border-lighter;
  flex-shrink: 0;

  .search-container {
    margin-bottom: $space-lg;

    .search-input {
      :deep(.el-input__wrapper) {
        border-radius: $radius-xl;
        border: 1px solid $border-light;
        box-shadow: $shadow-xs;
        transition: all 0.3s ease;

        &:hover {
          border-color: $primary-light;
        }

        &.is-focus {
          border-color: $primary;
          box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
        }
      }

      .search-icon {
        color: $text-muted;
      }
    }
  }

  .filter-tabs {
    display: flex;
    gap: $space-xs;

    .filter-tab {
      display: flex;
      align-items: center;
      gap: $space-xs;
      padding: $space-sm $space-md;
      background: $bg-tertiary;
      border: 1px solid $border-light;
      border-radius: $radius-lg;
      cursor: pointer;
      transition: all 0.3s ease;
      font-size: 13px;

      &:hover {
        background: $bg-hover;
        border-color: $primary-light;
      }

      &.active {
        background: $primary;
        border-color: $primary;
        color: $text-white;

        .filter-count {
          background: rgba(255, 255, 255, 0.2);
          color: $text-white;
        }
      }

      .filter-label {
        font-weight: 500;
      }

      .filter-count {
        background: $bg-primary;
        color: $primary;
        font-size: 11px;
        font-weight: 600;
        padding: 2px 6px;
        border-radius: $radius-sm;
        min-width: 16px;
        text-align: center;
      }
    }
  }
}

// 会话列表容器
.conversations-container {
  flex: 1;
  overflow-y: auto;
  background: $bg-secondary;

  .loading-state {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 200px;

    .loading-content {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: $space-md;
      color: $text-secondary;

      .loading-spinner {
        font-size: 24px;
        animation: rotate 1s linear infinite;
      }

      .loading-text {
        font-size: 14px;
        font-weight: 500;
      }
    }
  }

  .conversations-list {
    .conversation-item {
      display: flex;
      align-items: center;
      gap: $space-md;
      padding: $space-lg;
      background: $bg-primary;
      border-bottom: 1px solid $border-lighter;
      cursor: pointer;
      transition: all 0.3s ease;
      position: relative;

      &::before {
        content: "";
        position: absolute;
        left: 0;
        top: 0;
        bottom: 0;
        width: 3px;
        background: transparent;
        transition: all 0.3s ease;
      }

      &:hover {
        background: $bg-hover;
        transform: translateX(2px);

        &::before {
          background: $primary-light;
        }
      }

      &.active {
        background: $bg-accent;
        border-color: $primary;

        &::before {
          background: $primary;
        }
      }

      &.unread {
        background: rgba(239, 68, 68, 0.02);

        .user-name {
          font-weight: 600;
        }

        .message-content {
          font-weight: 500;
          color: $text-primary;
        }
      }

      &.pinned {
        &::after {
          content: "";
          position: absolute;
          top: $space-sm;
          right: $space-sm;
          width: 6px;
          height: 6px;
          background: $warning;
          border-radius: $radius-full;
        }
      }

      .avatar-section {
        flex-shrink: 0;

        .user-avatar-container {
          position: relative;

          .user-avatar {
            border: 2px solid $bg-tertiary;
            box-shadow: $shadow-xs;
            transition: all 0.3s ease;
          }

          .online-indicator {
            position: absolute;
            bottom: 2px;
            right: 2px;
            width: 10px;
            height: 10px;
            background: $success;
            border: 2px solid $bg-primary;
            border-radius: $radius-full;
            box-shadow: $shadow-xs;
          }

          .platform-indicator {
            position: absolute;
            bottom: -2px;
            right: -2px;
            width: 18px;
            height: 18px;
            background: $bg-primary;
            border-radius: $radius-full;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: $shadow-sm;
            border: 2px solid $bg-primary;

            .platform-logo {
              width: 12px;
              height: 12px;
              border-radius: $radius-full;
              object-fit: cover;
            }
          }
        }
      }

      .content-section {
        flex: 1;
        min-width: 0;

        .header-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 6px;

          .user-info {
            display: flex;
            align-items: center;
            gap: $space-xs;
            flex: 1;
            min-width: 0;

            .user-name {
              font-size: 15px;
              font-weight: 500;
              color: $text-primary;
              overflow: hidden;
              text-overflow: ellipsis;
              white-space: nowrap;
            }

            .verified-badge {
              color: $primary;
              font-size: 12px;
              flex-shrink: 0;
            }
          }

          .meta-info {
            display: flex;
            align-items: center;
            gap: $space-sm;
            flex-shrink: 0;

            .message-time {
              font-size: 12px;
              color: $text-muted;
              font-weight: 500;
            }

            .unread-count {
              min-width: 18px;
              height: 18px;
              background: $danger;
              color: $text-white;
              font-size: 11px;
              font-weight: 600;
              border-radius: $radius-full;
              display: flex;
              align-items: center;
              justify-content: center;
              padding: 0 6px;
              box-shadow: $shadow-xs;
            }
          }
        }

        .message-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: $space-sm;

          .message-preview {
            flex: 1;
            min-width: 0;

            .message-content {
              font-size: 13px;
              color: $text-secondary;
              line-height: 1.4;
              overflow: hidden;
              text-overflow: ellipsis;
              white-space: nowrap;
              display: block;
            }
          }

          .message-status {
            display: flex;
            align-items: center;
            gap: $space-xs;
            flex-shrink: 0;

            .pin-icon,
            .mute-icon {
              font-size: 12px;
              color: $text-muted;
            }

            .pin-icon {
              color: $warning;
            }

            .mute-icon {
              color: $info;
            }
          }
        }
      }
    }
  }

  .empty-state {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
    padding: $space-xl;
    background: $bg-primary;

    .empty-content {
      text-align: center;
      max-width: 280px;

      .empty-illustration {
        width: 80px;
        height: 80px;
        margin: 0 auto $space-xl;
        background: linear-gradient(
          135deg,
          $bg-tertiary 0%,
          $border-light 100%
        );
        border-radius: $radius-full;
        display: flex;
        align-items: center;
        justify-content: center;

        .empty-icon {
          font-size: 32px;
          color: $text-muted;
        }
      }

      .empty-title {
        font-size: 18px;
        font-weight: 600;
        color: $text-primary;
        margin: 0 0 $space-sm 0;
      }

      .empty-description {
        font-size: 14px;
        color: $text-secondary;
        line-height: 1.5;
        margin: 0 0 $space-xl 0;
      }

      .empty-actions {
        .select-account-btn {
          border-radius: $radius-lg;
          padding: $space-md $space-xl;
          font-weight: 500;

          .el-icon {
            margin-right: $space-xs;
          }
        }
      }
    }
  }

  // 滚动条样式
  &::-webkit-scrollbar {
    width: 4px;
  }

  &::-webkit-scrollbar-track {
    background: transparent;
  }

  &::-webkit-scrollbar-thumb {
    background: rgba(0, 0, 0, 0.1);
    border-radius: 2px;

    &:hover {
      background: rgba(0, 0, 0, 0.2);
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
  .toolbar {
    padding: $space-md;

    .search-container {
      margin-bottom: $space-md;
    }

    .filter-tabs {
      gap: $space-xs;

      .filter-tab {
        padding: $space-xs $space-sm;
        font-size: 12px;
      }
    }
  }

  .conversations-list {
    .conversation-item {
      padding: $space-md;

      .avatar-section {
        .user-avatar-container {
          .user-avatar {
            width: 36px !important;
            height: 36px !important;
          }
        }
      }

      .content-section {
        .header-row {
          .user-info {
            .user-name {
              font-size: 14px;
            }
          }

          .meta-info {
            .message-time {
              font-size: 11px;
            }

            .unread-count {
              min-width: 16px;
              height: 16px;
              font-size: 10px;
            }
          }
        }

        .message-row {
          .message-preview {
            .message-content {
              font-size: 12px;
            }
          }
        }
      }
    }
  }

  .status-bar {
    padding: $space-sm $space-md;

    .status-info {
      gap: $space-sm;
      font-size: 11px;
    }
  }
}
</style>
