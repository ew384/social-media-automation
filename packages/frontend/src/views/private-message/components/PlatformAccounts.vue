<template>
  <div class="platform-accounts">
    <!-- 顶部统计区域 -->
    <div class="stats-section" v-show="!isCollapsed"></div>

    <!-- 折叠状态下的简化统计 -->
    <div class="collapsed-stats" v-show="isCollapsed">
      <div
        class="expand-btn"
        @click="$emit('toggle-collapse')"
      >
        <el-icon><Expand /></el-icon>
      </div>
    </div>

    <!-- 账号列表区域 -->
    <div class="accounts-section">
      <!-- 展开状态 - 卡片式布局 -->
      <div v-if="!isCollapsed" class="accounts-expanded">
        <!-- 🔥 新的工具栏设计 -->
        <div class="toolbar-header">
          <div class="toolbar-left">
            <!-- 折叠按钮 -->
            <el-button
              circle
              size="small"
              class="collapse-btn"
              @click="$emit('toggle-collapse')"
              title="折叠账号栏"
            >
              <el-icon><Fold /></el-icon>
            </el-button>
            
            <!-- 搜索框 -->
            <div class="search-container">
              <el-input
                v-model="searchKeyword"
                placeholder="按账号搜索"
                clearable
                @input="handleSearch"
                class="search-input"
                size="small"
              >
                <template #prefix>
                  <el-icon class="search-icon"><Search /></el-icon>
                </template>
              </el-input>
            </div>
          </div>
          
          <div class="toolbar-right">
            <!-- 筛选按钮 -->
            <el-dropdown 
              @command="handleFilterCommand" 
              trigger="click"
              class="filter-dropdown"
            >
              <el-button circle size="small" class="filter-btn" title="筛选">
                <el-icon><Filter /></el-icon>
              </el-button>
              <template #dropdown>
                <el-dropdown-menu class="filter-dropdown-menu">
                  <!-- 平台筛选 -->
                  <div class="filter-section">
                    <div class="filter-section-title">平台</div>
                    <el-dropdown-item 
                      :command="`platform-`"
                      :class="{ active: filterPlatform === '' }"
                    >
                      全部平台
                    </el-dropdown-item>
                    <el-dropdown-item 
                      v-for="platform in availablePlatforms" 
                      :key="platform"
                      :command="`platform-${platform}`"
                      :class="{ active: filterPlatform === platform }"
                    >
                      {{ platform }}
                    </el-dropdown-item>
                  </div>
                  
                  <el-divider style="margin: 8px 0;" />
                  
                  <!-- 分组筛选 -->
                  <div class="filter-section">
                    <div class="filter-section-title">分组</div>
                    <el-dropdown-item 
                      :command="`group-`"
                      :class="{ active: filterGroup === '' }"
                    >
                      全部分组
                    </el-dropdown-item>
                    <el-dropdown-item 
                      :command="`group-ungrouped`"
                      :class="{ active: filterGroup === 'ungrouped' }"
                    >
                      未分组
                    </el-dropdown-item>
                    <el-dropdown-item 
                      v-for="group in availableGroups" 
                      :key="group.id"
                      :command="`group-${group.id}`"
                      :class="{ active: filterGroup === group.id }"
                    >
                      {{ group.name }}
                    </el-dropdown-item>
                  </div>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </div>
        </div>

        <!-- 账号数量显示 -->
        <div class="accounts-count-info">
          <span class="count-text">{{ filteredAccountsCount }} 个账号</span>
        </div>

        <div class="accounts-grid">
          <div
            v-for="account in filteredAccounts"
            :key="`${account.platform}_${account.id}`"
            :class="[
              'account-card',
              {
                active: isAccountSelected(
                  account.platform,
                  account.id,
                  account.userName
                ),
                monitoring: isAccountMonitoring(account.platform, account.id),
                'has-unread':
                  getAccountUnreadCount(account.platform, account.id) > 0,
              },
            ]"
            @click="handleSelectAccount(account)"
          >
            <!-- 账号头像区域 -->
            <div class="account-avatar-section">
              <div class="avatar-container">
                <el-avatar
                  :size="48"
                  :src="getAvatarUrl(account)"
                  @error="handleAvatarError"
                  class="account-avatar"
                />

                <!-- 平台Logo -->
                <div class="platform-badge">
                  <img
                    :src="getPlatformLogo(account.platform)"
                    :alt="account.platform"
                    @error="handleLogoError"
                  />
                </div>

                <!-- 状态指示器 -->
                <div
                  :class="['status-indicator', getAccountStatus(account)]"
                ></div>

                <!-- 未读消息红点 -->
                <div
                  v-if="getAccountUnreadCount(account.platform, account.id) > 0"
                  class="unread-badge"
                >
                  {{
                    getAccountUnreadCount(account.platform, account.id) > 99
                      ? "99+"
                      : getAccountUnreadCount(account.platform, account.id)
                  }}
                </div>
              </div>
            </div>

            <!-- 账号信息区域 -->
            <div class="account-info-section">
              <div class="account-name">{{ account.userName }}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- 折叠状态 - 圆形头像列表 -->
      <div v-else class="accounts-collapsed">
        <div
          v-for="account in filteredAccounts"
          :key="`${account.platform}_${account.id}`"
          :class="[
            'account-circle',
            {
              active: isAccountSelected(
                account.platform,
                account.id,
                account.userName
              ),
              monitoring: isAccountMonitoring(account.platform, account.id),
              'has-unread':
                getAccountUnreadCount(account.platform, account.id) > 0,
            },
          ]"
          @click="handleSelectAccount(account)"
          :title="`${account.userName} (${account.platform})`"
        >
          <div class="circle-avatar-container">
            <el-avatar
              :size="40"
              :src="getAvatarUrl(account)"
              @error="handleAvatarError"
              class="circle-avatar"
            />

            <!-- 平台Logo小标识 -->
            <div class="mini-platform-badge">
              <img
                :src="getPlatformLogo(account.platform)"
                :alt="account.platform"
                @error="handleLogoError"
              />
            </div>

            <!-- 状态点 -->
            <div :class="['mini-status-dot', getAccountStatus(account)]"></div>

            <!-- 未读红点 -->
            <div
              v-if="getAccountUnreadCount(account.platform, account.id) > 0"
              class="mini-unread-dot"
            >
              {{
                getAccountUnreadCount(account.platform, account.id) > 9
                  ? "9+"
                  : getAccountUnreadCount(account.platform, account.id)
              }}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick } from "vue";
import { Bell, Connection,Search, Filter, Expand, Fold   } from "@element-plus/icons-vue";
import { ElMessage } from "element-plus";
import { useAccountStore } from "@/stores/account";
import { useMessageStore } from "@/stores/message";
import {
  getPlatformKey,
  getAccountKey,
  getPlatformLogo,
} from "@/utils/platform";

// Props
const props = defineProps({
  isCollapsed: {
    type: Boolean,
    default: false,
  },
});

// 状态管理
const accountStore = useAccountStore();
const messageStore = useMessageStore();

// 计算属性
const totalAccountsCount = computed(() => {
  return accountStore.accounts.length;
});
// 🔥 新增筛选和搜索相关状态
const searchKeyword = ref("");
const filterPlatform = ref("");
const filterGroup = ref("");

// 🔥 添加 emits 声明
const emit = defineEmits(['toggle-collapse']);

// 🔥 计算可用平台列表
const availablePlatforms = computed(() => {
  const platforms = [...new Set(accountStore.accounts.map(acc => acc.platform))];
  return platforms.filter(p => p); // 过滤空值
});

// 🔥 计算可用分组列表 - 过滤掉平台名称分组
const availableGroups = computed(() => {
  // 定义平台相关的分组名称（需要过滤掉的）
  const platformGroupNames = ['微信视频号', '视频号', '抖音', '快手', '小红书'];
  
  // 只保留非平台分组
  return (accountStore.groups || []).filter(group => 
    !platformGroupNames.includes(group.name)
  );
});

// 🔥 过滤后的账号列表
const filteredAccounts = computed(() => {
  let accounts = accountStore.accounts;

  // 🔥 按搜索关键词筛选
  if (searchKeyword.value.trim()) {
    accounts = accounts.filter(acc => 
      acc.userName.toLowerCase().includes(searchKeyword.value.toLowerCase())
    );
  }

  // 🔥 按平台筛选
  if (filterPlatform.value) {
    accounts = accounts.filter(acc => acc.platform === filterPlatform.value);
  }

  // 🔥 按分组筛选
  if (filterGroup.value) {
    if (filterGroup.value === 'ungrouped') {
      accounts = accounts.filter(acc => !acc.group_id);
    } else {
      accounts = accounts.filter(acc => acc.group_id === filterGroup.value);
    }
  }

  return accounts;
});

// 🔥 过滤后账号数量
const filteredAccountsCount = computed(() => {
  return filteredAccounts.value.length;
});

// 🔥 搜索处理
const handleSearch = () => {
  // 搜索逻辑已通过计算属性实现
  console.log('搜索关键词:', searchKeyword.value);
};

// 🔥 筛选命令处理
const handleFilterCommand = (command) => {
  const [type, value] = command.split('-');
  
  if (type === 'platform') {
    filterPlatform.value = value || '';
    console.log('平台筛选:', filterPlatform.value);
  } else if (type === 'group') {
    filterGroup.value = value || '';
    console.log('分组筛选:', filterGroup.value);
  }
};
// 获取头像URL
const getAvatarUrl = (account) => {
  if (account.local_avatar && account.local_avatar !== "/default-avatar.png") {
    return account.local_avatar.startsWith("assets/avatar/")
      ? `http://localhost:3409/${account.local_avatar}`
      : account.local_avatar;
  }

  if (account.avatar_url && account.avatar_url !== "/default-avatar.png") {
    return account.avatar_url;
  }

  if (account.avatar && account.avatar !== "/default-avatar.png") {
    return account.avatar.startsWith("assets/avatar/")
      ? `http://localhost:3409/${account.avatar}`
      : account.avatar;
  }

  if (account.userName && account.platform) {
    const platformKey = getPlatformKey(account.platform);
    if (platformKey !== account.platform.toLowerCase()) {
      return `http://localhost:3409/assets/avatar/${platformKey}/${account.userName}/avatar.jpg`;
    }
  }

  return "/default-avatar.png";
};

// 账号状态相关方法
const getAccountStatus = (account) => {
  const accountKey = getAccountKey(account.platform, account.userName);
  const isMonitoring = messageStore.monitoringStatus[accountKey];

  if (account.status === "异常") return "error";
  if (isMonitoring) return "monitoring";
  return "normal";
};

const isAccountMonitoring = (platform, accountId) => {
  const accountKey = getAccountKey(platform, accountId);
  return messageStore.monitoringStatus[accountKey] || false;
};

const isAccountSelected = (platform, accountId, userName) => {
  const platformKey = getPlatformKey(platform);
  return (
    messageStore.selectedAccount &&
    messageStore.selectedAccount.platform === platformKey &&
    messageStore.selectedAccount.accountId === userName
  );
};

const getAccountUnreadCount = (platform, accountId) => {
  const accountKey = getAccountKey(platform, accountId);
  return messageStore.unreadCounts[accountKey] || 0;
};

// 事件处理
const handleSelectAccount = async (account) => {
  try {
    console.log("🔄 选择账号:", account.userName);
    const platformKey = getPlatformKey(account.platform);
    const accountId = account.userName; // 或 account.id，取决于实际数据结构

    console.log("📋 传递参数:", {
      platformKey,
      accountId,
      userName: account.userName,
    });
    await messageStore.selectAccount(platformKey, accountId, account.userName);

    await messageStore.refreshUnreadCount(platformKey, account.userName);
  } catch (error) {
    console.error("选择账号失败:", error);
    ElMessage.error("加载账号会话失败");
  }
};

const handleAvatarError = (e) => {
  e.target.src = "/default-avatar.png";
};

const handleLogoError = (e) => {
  console.error("❌ 平台logo加载失败:", e.target.src);
};

// 生命周期
onMounted(async () => {
  console.log("🚀 平台账号组件已挂载");

  if (accountStore.accounts.length === 0) {
    try {
      await accountStore.loadAccounts();
    } catch (error) {
      console.error("加载账号数据失败:", error);
    }
  }
  console.log('=== 数据调试 ===');
  console.log('账号数据示例:', accountStore.accounts[0]);
  console.log('所有平台:', [...new Set(accountStore.accounts.map(acc => acc.platform))]);
  console.log('分组数据:', accountStore.groups);
  console.log('可用平台列表:', availablePlatforms.value);
  console.log('可用分组列表:', availableGroups.value);
  await messageStore.refreshMonitoringStatus();
  await messageStore.refreshUnreadCounts();
});
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
$shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1),
  0 4px 6px -2px rgba(0, 0, 0, 0.05);

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
$space-2xl: 24px;

$bg-primary: #ffffff;
$bg-secondary: #f8fafc;
$bg-tertiary: #f1f5f9;
$bg-accent: rgba(99, 102, 241, 0.05);
$bg-hover: rgba(99, 102, 241, 0.08);
.toolbar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: $space-md;
  padding-bottom: $space-sm;

  .toolbar-left {
    display: flex;
    align-items: center;
    gap: $space-sm;
    flex: 1;

    .collapse-btn {
      width: 28px;
      height: 28px;
      background: $bg-tertiary;
      border: 1px solid $border-light;
      color: $text-secondary;
      transition: all 0.3s ease;

      &:hover {
        background: $primary;
        border-color: $primary;
        color: $text-white;
        transform: scale(1.05);
      }

      .el-icon {
        font-size: 12px;
      }
    }

    .search-container {
      flex: 1;
      max-width: 140px;

      .search-input {
        :deep(.el-input__wrapper) {
          border-radius: $radius-lg;
          border: 1px solid $border-light;
          transition: all 0.3s ease;

          &:hover {
            border-color: $primary-light;
          }

          &.is-focus {
            border-color: $primary;
            box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.1);
          }
        }

        .search-icon {
          color: $text-muted;
          font-size: 12px;
        }
      }
    }
  }

  .toolbar-right {
    .filter-btn {
      width: 28px;
      height: 28px;
      background: $bg-tertiary;
      border: 1px solid $border-light;
      color: $text-secondary;
      transition: all 0.3s ease;

      &:hover {
        background: $primary;
        border-color: $primary;
        color: $text-white;
        transform: scale(1.05);
      }

      .el-icon {
        font-size: 12px;
      }
    }
  }
}
.platform-accounts {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: $bg-primary;
  padding: $space-lg;
  overflow: hidden;
}

// 🔥 账号数量信息
.accounts-count-info {
  margin-bottom: $space-md;

  .count-text {
    font-size: 12px;
    color: $text-muted;
    font-weight: 500;
  }
}

// 🔥 筛选下拉菜单样式
.filter-dropdown-menu {
  min-width: 160px;

  .filter-section {
    .filter-section-title {
      font-size: 11px;
      font-weight: 600;
      color: $text-muted;
      padding: 6px 12px 4px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
  }

  .el-dropdown-menu__item {
    font-size: 12px;
    padding: 6px 12px;
    
    &.active {
      background: $bg-accent;
      color: $primary;
      font-weight: 500;
    }

    &:hover {
      background: $bg-hover;
      color: $primary;
    }
  }
}
// 顶部统计区域
.stats-section {
  margin-bottom: $space-xl;
  display: flex;
  flex-direction: column;
  gap: $space-md;

  .stat-card {
    background: linear-gradient(135deg, $bg-secondary 0%, $bg-tertiary 100%);
    border-radius: $radius-lg;
    padding: $space-lg;
    display: flex;
    align-items: center;
    gap: $space-md;
    border: 1px solid $border-lighter;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);

    &:hover {
      transform: translateY(-1px);
      box-shadow: $shadow-md;
    }

    .stat-icon {
      width: 36px;
      height: 36px;
      border-radius: $radius-md;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;

      .el-icon {
        font-size: 18px;
        color: $text-white;
      }
    }

    &.unread .stat-icon {
      background: linear-gradient(135deg, $danger 0%, #f87171 100%);
    }

    &.monitoring .stat-icon {
      background: linear-gradient(135deg, $success 0%, #34d399 100%);
    }

    .stat-content {
      .stat-number {
        font-size: 20px;
        font-weight: 700;
        color: $text-primary;
        line-height: 1.2;
        margin-bottom: 2px;
      }

      .stat-label {
        font-size: 12px;
        color: $text-secondary;
        line-height: 1.2;
        font-weight: 500;
      }
    }
  }
}

// 折叠状态统计
.collapsed-stats {
  margin-bottom: $space-xl;
  display: flex;
  justify-content: center;

  .mini-stat {
    position: relative;
    width: 40px;
    height: 40px;
    border-radius: $radius-full;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.3s ease;

    &:hover {
      transform: scale(1.1);
      box-shadow: $shadow-lg;
    }

    .el-icon {
      font-size: 16px;
      color: $text-white;
    }

    .mini-count {
      position: absolute;
      top: -6px;
      right: -6px;
      min-width: 18px;
      height: 18px;
      background: $text-white;
      color: $danger;
      font-size: 10px;
      font-weight: 700;
      border-radius: $radius-full;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0 4px;
      box-shadow: $shadow-sm;
      border: 2px solid $danger;
    }
  }
  // 展开按钮样式 - 无背景圆圈
  .expand-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.3s ease;
    padding: $space-sm;
    
    .el-icon {
      font-size: 20px;
      color: $text-muted;
      transition: all 0.3s ease;
    }
    
    &:hover {
      .el-icon {
        color: $primary;
        transform: scale(1.1);
      }
    }
  }
}

// 账号列表区域
.accounts-section {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

// 展开状态
.accounts-expanded {
  height: 100%;
  display: flex;
  flex-direction: column;

  .section-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: $space-lg;
    padding-bottom: $space-md;
    border-bottom: 1px solid $border-light;

    .section-title {
      font-size: 16px;
      font-weight: 600;
      color: $text-primary;
      margin: 0;
    }

    .accounts-count {
      background: $bg-accent;
      color: $primary;
      font-size: 12px;
      font-weight: 600;
      padding: 4px 8px;
      border-radius: $radius-sm;
    }
  }

  .accounts-grid {
    flex: 1;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 0; // 从 $space-sm 改为 0，移除卡片间距

    .account-card {
      display: flex;
      align-items: center;
      gap: 8px;
      background: $bg-secondary;
      border: 1px solid $border-light;
      border-radius: 0; // 移除圆角，让卡片完全贴合
      padding: 8px 12px;
      cursor: pointer;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      position: relative;
      overflow: hidden;
      border-top: none; // 移除顶部边框避免重复

      // 第一个卡片保留顶部边框
      &:first-child {
        border-top: 1px solid $border-light;
        border-radius: $radius-md $radius-md 0 0; // 只在顶部加圆角
      }

      // 最后一个卡片在底部加圆角
      &:last-child {
        border-radius: 0 0 $radius-md $radius-md; // 只在底部加圆角
      }

      // 如果只有一个卡片，保持完整圆角
      &:first-child:last-child {
        border-radius: $radius-md;
      }

      &:hover {
        transform: translateY(0); // 移除Y轴移动，避免影响紧贴效果
        box-shadow: $shadow-lg;
        border-color: $primary-light;
        z-index: 1; // 确保hover状态在最上层

      }

      &.active {
        background: $bg-accent;
        border-color: $primary;
        box-shadow: $shadow-md;
        z-index: 2; // 确保选中状态在hover之上
      }

      &.monitoring {
        border-left: 3px solid $success;
      }

      &.has-unread {
        background: rgba(239, 68, 68, 0.02);
        border-color: rgba(239, 68, 68, 0.2);
      }

      .account-avatar-section {
        display: flex;
        margin-bottom: 0;

        .avatar-container {
          position: relative;

          .account-avatar {
            width: 32px !important; // 从 40px 改为 32px
            height: 32px !important; // 从 40px 改为 32px
            border: 2px solid $text-white;
            box-shadow: $shadow-sm;
          }

          .platform-badge {
            position: absolute;
            bottom: -2px;
            right: -2px;
            width: 16px; // 从 20px 改为 16px
            height: 16px; // 从 20px 改为 16px
            background: $text-white;
            border-radius: $radius-full;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: $shadow-sm;
            border: 2px solid $text-white;

            img {
              width: 12px; // 从 14px 改为 12px
              height: 12px; // 从 14px 改为 12px
              border-radius: $radius-full;
              object-fit: cover;
            }
          }

          .status-indicator {
            position: absolute;
            top: 1px; // 从 2px 改为 1px
            right: 1px; // 从 2px 改为 1px
            width: 10px; // 从 12px 改为 10px
            height: 10px; // 从 12px 改为 10px
            border-radius: $radius-full;
            border: 2px solid $text-white;
            box-shadow: $shadow-xs;

            &.monitoring {
              background: $success;
            }

            &.normal {
              background: $info;
            }

            &.error {
              background: $danger;
            }
          }

          .unread-badge {
            position: absolute;
            top: -4px; // 从 -6px 改为 -4px
            right: -4px; // 从 -6px 改为 -4px
            min-width: 16px; // 从 20px 改为 16px
            height: 16px; // 从 20px 改为 16px
            background: $danger;
            color: $text-white;
            font-size: 9px; // 从 10px 改为 9px
            font-weight: 700;
            border-radius: $radius-full;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 0 4px; // 从 0 6px 改为 0 4px
            box-shadow: $shadow-sm;
            border: 2px solid $text-white;
          }
        }
      }

      .account-info-section {
        text-align: center;

        .account-name {
          font-size: 12px; // 从 14px 改为 12px
          font-weight: 600;
          color: $text-primary;
          margin-bottom: 2px; // 从 4px 改为 2px
          line-height: 1.2; // 从 1.3 改为 1.2
        }

        .account-status-text {
          font-size: 10px;
          font-weight: 500;

          &:has(.monitoring) {
            color: $success;
          }

          &:has(.normal) {
            color: $text-muted;
          }

          &:has(.error) {
            color: $danger;
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
}

// 折叠状态
.accounts-collapsed {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: $space-lg;
  padding-top: $space-md;

  .account-circle {
    cursor: pointer;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    position: relative;

    &:hover {
      transform: scale(1.1);
    }

    &.active {
      .circle-avatar-container .circle-avatar {
        border-color: $primary;
        box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.2);
      }
    }

    &.monitoring {
      &::before {
        content: "";
        position: absolute;
        top: -4px;
        left: -4px;
        right: -4px;
        bottom: -4px;
        border: 2px solid $success;
        border-radius: $radius-full;
        opacity: 0.6;
      }
    }

    &.has-unread {
      .circle-avatar-container .circle-avatar {
        border-color: $danger;
      }
    }

    .circle-avatar-container {
      position: relative;

      .circle-avatar {
        border: 2px solid $border-light;
        box-shadow: $shadow-sm;
        transition: all 0.3s ease;
      }

      .mini-platform-badge {
        position: absolute;
        bottom: -1px;
        right: -1px;
        width: 14px;
        height: 14px;
        background: $text-white;
        border-radius: $radius-full;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: $shadow-xs;
        border: 1px solid $border-light;

        img {
          width: 10px;
          height: 10px;
          border-radius: $radius-full;
          object-fit: cover;
        }
      }

      .mini-status-dot {
        position: absolute;
        top: 2px;
        right: 2px;
        width: 8px;
        height: 8px;
        border-radius: $radius-full;
        border: 1px solid $text-white;

        &.monitoring {
          background: $success;
        }

        &.normal {
          background: $info;
        }

        &.error {
          background: $danger;
        }
      }

      .mini-unread-dot {
        position: absolute;
        top: -4px;
        right: -4px;
        min-width: 16px;
        height: 16px;
        background: $danger;
        color: $text-white;
        font-size: 9px;
        font-weight: 700;
        border-radius: $radius-full;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 0 4px;
        box-shadow: $shadow-sm;
        border: 2px solid $text-white;
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
</style>
