<template>
  <div id="app">
    <div class="app-layout">
      <!-- 侧边栏 -->
      <div :class="['sidebar', { collapsed: isCollapsed }]">
        <!-- 用户信息区域 -->
        <div class="sidebar-header">
          <div class="user-info">
            <div class="user-avatar">
              <el-avatar :size="40" src="/vite.svg" />
              <div class="online-status"></div>
            </div>
            <transition name="fade">
              <div v-show="!isCollapsed" class="user-details">
                <div class="user-name">endian</div>
                <div class="user-role">管理员</div>
              </div>
            </transition>
          </div>
        </div>

        <!-- 导航菜单 -->
        <div class="sidebar-menu">
          <nav class="nav-menu">
            <router-link
              v-for="item in menuItems"
              :key="item.path"
              :to="item.path"
              :class="['nav-item', { active: isActiveRoute(item.path) }]"
            >
              <div class="nav-icon">
                <component :is="item.icon" />
              </div>
              <transition name="fade">
                <span v-show="!isCollapsed" class="nav-text">{{
                  item.name
                }}</span>
              </transition>
              <div v-show="!isCollapsed && item.badge" class="nav-badge">
                {{ item.badge }}
              </div>
            </router-link>
          </nav>
        </div>

        <!-- 拖拽调整区域 -->
        <div
          class="resize-handle"
          @mouseenter="showResizeHandle = true"
          @mouseleave="showResizeHandle = false"
          @mousedown="startResize"
          :class="{ 'show-handle': showResizeHandle || isDragging }"
        >
          <div class="resize-indicator">
            <div class="resize-dots">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
        </div>
      </div>

      <!-- 主内容区 -->
      <div
        class="main-content"
        :style="mainContentStyle"
        :class="{ 'private-message-layout': isPrivateMessagePage }"
      >
        <!-- 页面内容 -->
        <main class="page-content">
          <router-view />
        </main>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted,watch } from "vue";
import { useRoute } from "vue-router";
import { useAccountStore } from "@/stores/account";
import {
  VideoCamera,
  HomeFilled,
  Upload,
  User,
  Monitor,
  DataAnalysis,
  Fold,
  Expand,
  Bell,
  Setting,
} from "@element-plus/icons-vue";
import { pathService } from "@/utils/pathService";
const route = useRoute();
const accountStore = useAccountStore();
const isCollapsed = ref(false);
const showResizeHandle = ref(false);
const isDragging = ref(false);
const dragStartX = ref(0);

// 固定宽度值
const EXPANDED_WIDTH = 240;
const COLLAPSED_WIDTH = 64;

// 计算当前宽度
const sidebarWidth = computed(() => {
  return isCollapsed.value ? COLLAPSED_WIDTH : EXPANDED_WIDTH;
});

// 菜单项配置
const menuItems = [
  { path: "/", name: "首页", icon: "HomeFilled" },
  { path: "/publish-records", name: "发布", icon: "Upload" },
  { path: "/account-management", name: "账号", icon: "User" },
  { path: "/data", name: "数据", icon: "DataAnalysis" },
  { path: "/team", name: "团队", icon: "User" },
  { path: "/material-management", name: "素材", icon: "VideoCamera" },
  { path: "/website", name: "网站", icon: "Monitor" },
  {
    path: "/private-message",
    name: "私信",
    icon: "DataAnalysis",
    badge: "NEW",
  },
];

// 判断路由是否激活
const isActiveRoute = (path) => {
  return route.path === path;
};

// 拖拽触发折叠/展开
const startResize = (e) => {
  isDragging.value = true;
  dragStartX.value = e.clientX;
  document.addEventListener("mousemove", handleDrag);
  document.addEventListener("mouseup", stopDrag);
  document.body.style.cursor = "col-resize";
  document.body.style.userSelect = "none";
};

const handleDrag = (e) => {
  if (!isDragging.value) return;

  const deltaX = e.clientX - dragStartX.value;
  const threshold = 30; // 拖拽阈值，超过30px才触发状态切换

  // 向右拖拽且当前是折叠状态 -> 展开
  if (deltaX > threshold && isCollapsed.value) {
    isCollapsed.value = false;
    stopDrag();
  }
  // 向左拖拽且当前是展开状态 -> 折叠
  else if (deltaX < -threshold && !isCollapsed.value) {
    isCollapsed.value = true;
    stopDrag();
  }
};

const stopDrag = () => {
  isDragging.value = false;
  document.removeEventListener("mousemove", handleDrag);
  document.removeEventListener("mouseup", stopDrag);
  document.body.style.cursor = "";
  document.body.style.userSelect = "";
};
// 添加计算属性：判断是否在私信页面
const isPrivateMessagePage = computed(() => {
  return route.path === '/private-message';
});

// 添加计算属性：私信页面的主内容样式
const mainContentStyle = computed(() => {
  if (isPrivateMessagePage.value) {
    return {
      marginLeft: '0px' // 私信页面不需要margin-left
    };
  }
  return {
    marginLeft: (isCollapsed.value ? 64 : 240) + 'px'
  };
});

watch([isPrivateMessagePage, isCollapsed], ([isPrivateMessage, collapsed]) => {
  // 清理所有相关class
  document.body.classList.remove('private-message-layout', 'sidebar-collapsed');
  
  // 根据当前状态添加class和CSS变量
  if (isPrivateMessage) {
    document.body.classList.add('private-message-layout');
    // 设置CSS变量
    document.documentElement.style.setProperty('--sidebar-width', collapsed ? '64px' : '240px');
    
    if (collapsed) {
      document.body.classList.add('sidebar-collapsed');
    }
  } else {
    // 非私信页面时清除CSS变量
    document.documentElement.style.removeProperty('--sidebar-width');
  }
}, { immediate: true });

onMounted(async () => {
  try {
    console.log("🚀 应用启动，初始化服务...");

    // 🔥 1. 先初始化路径服务
    await pathService.initialize();

    // 🔥 2. 再加载账号数据
    await accountStore.loadAccounts();

    console.log("✅ 应用初始化完成");
  } catch (error) {
    console.warn("启动时初始化失败:", error);
  }
});

// 清理事件监听器
onUnmounted(() => {
  if (isDragging.value) {
    stopDrag();
  }
  
  // 清理 body class 和 CSS 变量
  document.body.classList.remove('private-message-layout', 'sidebar-collapsed');
  document.documentElement.style.removeProperty('--sidebar-width');
});
</script>

<style lang="scss" scoped>
$primary: #6366f1;
$bg-dark: #1f2937;
$bg-light: #f8fafc;
$bg-white: #ffffff;
$text-primary: #0f172a;
$text-secondary: #475569;
$text-muted: #94a3b8;
$text-white: #ffffff;
$border-light: #e2e8f0;
$shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1),
  0 2px 4px -1px rgba(0, 0, 0, 0.06);
$shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1),
  0 4px 6px -2px rgba(0, 0, 0, 0.05);
$shadow-hover: 0 8px 25px -8px rgba(99, 102, 241, 0.25);
$radius-md: 8px;
$radius-lg: 12px;
$space-sm: 8px;
$space-md: 16px;
$space-lg: 24px;

#app {
  min-height: 100vh;
  background-color: $bg-white;
}

.app-layout {
  min-height: 100vh;
  background-color: $bg-light;
}

// 侧边栏样式
.sidebar {
  width: 240px;
  background: $bg-white;
  color: $text-primary;
  transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: fixed;
  left: 0;
  top: 0;
  height: 100vh;
  z-index: 1000;
  border-right: 1px solid $border-light;
  display: flex;
  flex-direction: column;
  min-width: 64px;
  max-width: 300px;

  &.collapsed {
    width: 64px;
  }

  .sidebar-header {
    padding: $space-lg;
    border-bottom: 1px solid $border-light;
    flex-shrink: 0;

    .user-info {
      display: flex;
      align-items: center;
      gap: $space-md;

      .user-avatar {
        position: relative;
        flex-shrink: 0;

        .online-status {
          position: absolute;
          bottom: 2px;
          right: 2px;
          width: 12px;
          height: 12px;
          background: #10b981;
          border: 2px solid $bg-white;
          border-radius: 50%;
        }
      }

      .user-details {
        min-width: 0;
        flex: 1;

        .user-name {
          font-size: 16px;
          font-weight: 600;
          color: $text-primary;
          line-height: 1.2;
          margin-bottom: 2px;
        }

        .user-role {
          font-size: 12px;
          color: $text-muted;
          background: #f1f5f9;
          padding: 2px 8px;
          border-radius: 12px;
          display: inline-block;
        }
      }
    }
  }

  .sidebar-menu {
    flex: 1;
    padding: $space-md 0;
    overflow-y: auto;

    .nav-menu {
      display: flex;
      flex-direction: column;
      gap: 4px;
      padding: 0 $space-md;

      .nav-item {
        display: flex;
        align-items: center;
        padding: 12px $space-md;
        color: $text-secondary;
        text-decoration: none;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        position: relative;
        border-radius: $radius-md;

        &:hover {
          background-color: rgba(99, 102, 241, 0.08);
          color: $primary;
          transform: translateX(2px);
        }

        &.active {
          background: linear-gradient(135deg, $primary 0%, #8b9ee8 100%);
          color: white;
          box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);

          &::before {
            content: "";
            position: absolute;
            left: -16px;
            top: 50%;
            transform: translateY(-50%);
            width: 4px;
            height: 20px;
            background-color: $primary;
            border-radius: 2px;
          }
        }

        .nav-icon {
          width: 20px;
          height: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;

          .el-icon {
            font-size: 18px;
          }
        }

        .nav-text {
          margin-left: $space-md;
          font-size: 14px;
          font-weight: 500;
          white-space: nowrap;
        }

        .nav-badge {
          margin-left: auto;
          background: linear-gradient(135deg, #ef4444 0%, #f87171 100%);
          color: white;
          font-size: 10px;
          font-weight: 600;
          padding: 2px 6px;
          border-radius: 10px;
          min-width: 18px;
          text-align: center;
          box-shadow: 0 2px 4px rgba(239, 68, 68, 0.2);
        }
      }
    }
  }

  // 折叠状态下的特殊样式
  &.collapsed {
    .sidebar-menu {
      .nav-menu {
        padding: 0 $space-sm;

        .nav-item {
          padding: 12px 0;
          justify-content: center;

          .nav-icon {
            margin: 0;
          }

          .nav-text,
          .nav-badge {
            display: none;
          }

          &:hover {
            transform: translateX(0);
          }

          &.active::before {
            left: -8px;
          }
        }
      }
    }

    .sidebar-header {
      .user-info {
        justify-content: center;

        .user-avatar {
          margin: 0;
        }
      }
    }
  }

  // 拖拽调整区域
  .resize-handle {
    position: absolute;
    top: 0;
    right: -4px;
    width: 8px;
    height: 100%;
    cursor: col-resize;
    z-index: 10;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.3s ease;

    &:hover,
    &.show-handle {
      .resize-indicator {
        opacity: 1;
        transform: translateX(0);
      }
    }

    .resize-indicator {
      width: 4px;
      height: 60px;
      background: rgba(99, 102, 241, 0.1);
      border-radius: 2px;
      position: relative;
      opacity: 0;
      transform: translateX(4px);
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      border: 1px solid rgba(99, 102, 241, 0.2);

      &:hover {
        background: rgba(99, 102, 241, 0.2);
        border-color: rgba(99, 102, 241, 0.3);
        box-shadow: 0 2px 8px rgba(99, 102, 241, 0.15);
      }

      .resize-dots {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        display: flex;
        flex-direction: column;
        gap: 2px;

        span {
          width: 2px;
          height: 2px;
          background: rgba(99, 102, 241, 0.6);
          border-radius: 50%;
          display: block;
        }
      }
    }

    &:active .resize-indicator {
      background: rgba(99, 102, 241, 0.3);
      border-color: rgba(99, 102, 241, 0.4);
    }
  }
}

// 主内容区样式
.main-content {
  min-height: 100vh;
  transition: margin-left 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  &.private-message-layout {
    margin-left: 0 !important;
  }
}

.page-content {
  padding: $space-lg;
  background-color: $bg-light;
  min-height: 100vh;
  &.private-message-content {
    padding: 0;
    background-color: transparent;
  }
}

// 动画效果
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

// 响应式设计
@media (max-width: 768px) {
  .sidebar {
    &.collapsed {
      transform: translateX(-100%);
    }
  }

  .main-content {
    margin-left: 0 !important;
  }

  .page-content {
    padding: $space-md;
  }
}
</style>
