<template>
  <div class="account-management">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-content">
        <div class="header-left">
          <h1 class="page-title">账号管理</h1>
          <p class="page-subtitle">管理所有平台的账号信息</p>
        </div>
        <div class="header-actions">
          <el-button
            v-if="activeTab === 'accounts'"
            type="primary"
            @click="handleAddAccount"
            class="add-btn"
          >
            <el-icon><Plus /></el-icon>
            添加账号
          </el-button>
          <el-button
            v-if="activeTab === 'groups'"
            type="primary"
            @click="handleAddGroup"
            class="add-btn"
          >
            <el-icon><Plus /></el-icon>
            创建分组
          </el-button>
        </div>
      </div>
    </div>

    <!-- 标签页切换 -->
    <div class="tabs-container">
      <!-- 自定义标签页按钮 -->
      <div class="simple-tabs">
        <div class="tabs-header">
          <div
            :class="['tab-item', { active: activeTab === 'accounts' }]"
            @click="activeTab = 'accounts'"
          >
            账号管理
          </div>
          <div
            :class="['tab-item', { active: activeTab === 'groups' }]"
            @click="activeTab = 'groups'"
          >
            分组管理
          </div>
        </div>
      </div>

      <!-- 内容区域 -->
      <div class="tab-content">
        <!-- 账号管理内容 -->
        <div v-show="activeTab === 'accounts'" class="accounts-content">
          <!-- 筛选工具栏 -->
          <div class="filter-toolbar">
            <div class="filter-left">
              <div class="filter-group">
                <el-select
                  v-model="filterStatus"
                  placeholder="账号状态"
                  clearable
                  class="filter-select"
                >
                  <el-option label="全部状态" value="" />
                  <el-option label="正常" value="正常" />
                  <el-option label="异常" value="异常" />
                </el-select>

                <el-select
                  v-model="filterPlatform"
                  placeholder="选择平台"
                  clearable
                  class="filter-select"
                >
                  <el-option label="全部平台" value="" />
                  <el-option label="抖音" value="抖音" />
                  <el-option label="快手" value="快手" />
                  <el-option label="视频号" value="视频号" />
                  <el-option label="小红书" value="小红书" />
                </el-select>

                <!-- 分组筛选 -->
                <el-select
                  v-model="filterGroup"
                  placeholder="选择分组"
                  clearable
                  class="filter-select"
                >
                  <el-option label="全部分组" value="" />
                  <el-option label="未分组" value="ungrouped" />
                  <el-option
                    v-for="group in accountStore.groups"
                    :key="group.id"
                    :label="group.name"
                    :value="group.id"
                  />
                </el-select>
              </div>

              <div class="search-box">
                <el-input
                  v-model="searchKeyword"
                  placeholder="搜索账号名称..."
                  clearable
                  @input="handleSearch"
                  class="search-input"
                >
                  <template #prefix>
                    <el-icon><Search /></el-icon>
                  </template>
                </el-input>
              </div>
            </div>

            <div class="filter-right">
              <el-dropdown>
                <el-button class="more-btn">
                  <el-icon><More /></el-icon>
                </el-button>
                <template #dropdown>
                  <el-dropdown-menu>
                    <el-dropdown-item>批量操作</el-dropdown-item>
                    <el-dropdown-item>导出数据</el-dropdown-item>
                  </el-dropdown-menu>
                </template>
              </el-dropdown>
            </div>
          </div>

          <!-- 账号列表 -->
          <div class="accounts-section">
            <div v-if="filteredAccounts.length > 0" class="accounts-grid">
              <div
                v-for="account in filteredAccounts"
                :key="account.id"
                class="account-card"
                :class="{ 'clickable': account.status === '正常' }"
                @click="handleAccountCardClick(account)"
              >
                <!-- 账号信息 -->
                <div class="account-info">
                  <div class="avatar-container">
                    <div class="account-avatar">
                      <el-avatar :size="56" :src="getAvatarUrl(account)" />
                    </div>
                    <div class="platform-logo">
                      <img
                        :src="getPlatformLogo(account.platform)"
                        :alt="account.platform"
                      />
                    </div>
                    <div
                      :class="[
                        'status-dot',
                        account.status === '正常' ? 'online' : 'offline',
                      ]"
                    ></div>
                  </div>

                  <div class="account-details">
                    <h3 class="account-name">{{ account.userName }}</h3>
                    <div class="account-meta">
                      <span class="platform-text">{{ account.platform }}</span>
                      <!-- 分组信息 -->
                      <el-tag
                        v-if="account.group_name"
                        :color="account.group_color"
                        size="small"
                        effect="light"
                        class="group-tag"
                      >
                        {{ account.group_name }}
                      </el-tag>
                      <el-tag
                        :type="account.status === '正常' ? 'success' : 'danger'"
                        size="small"
                        effect="light"
                      >
                        {{ account.status }}
                      </el-tag>
                    </div>
                  </div>
                </div>

                <!-- 操作按钮 -->
                <div class="account-actions">
                  <!-- 三点菜单 -->
                  <el-dropdown @command="handleActionCommand" trigger="click">
                    <el-button size="small" class="action-btn">
                      <el-icon><More /></el-icon>
                    </el-button>
                    <template #dropdown>
                      <el-dropdown-menu>
                        <el-dropdown-item :command="`group-${account.id}`">
                          <el-icon><Collection /></el-icon>
                          分组
                        </el-dropdown-item>
                        <el-dropdown-item
                          :command="`delete-${account.id}`"
                          class="danger-item"
                        >
                          <el-icon><Delete /></el-icon>
                          删除
                        </el-dropdown-item>
                      </el-dropdown-menu>
                    </template>
                  </el-dropdown>

                  <!-- 恢复按钮 - 仅异常账号显示 -->
                  <el-button
                    v-if="account.status === '异常'"
                    size="small"
                    type="primary"
                    @click="handleRecover(account)"
                    class="recover-btn"
                  >
                    恢复
                  </el-button>
                </div>
              </div>
            </div>

            <!-- 空状态 -->
            <div v-else class="empty-state">
              <div class="empty-content">
                <div class="empty-icon">
                  <el-icon><UserFilled /></el-icon>
                </div>
                <h3 class="empty-title">暂无账号数据</h3>
                <p class="empty-description">
                  {{
                    searchKeyword || filterStatus || filterPlatform
                      ? "没有找到符合条件的账号"
                      : "还没有添加任何账号，点击上方按钮开始添加"
                  }}
                </p>
                <el-button
                  v-if="!searchKeyword && !filterStatus && !filterPlatform"
                  type="primary"
                  @click="handleAddAccount"
                >
                  <el-icon><Plus /></el-icon>
                  添加第一个账号
                </el-button>
              </div>
            </div>
          </div>
        </div>

        <!-- 分组管理内容 -->
        <div v-show="activeTab === 'groups'" class="groups-content">
          <!-- 自定义分组展示 -->
          <div class="custom-groups-section">
            <!-- 🔥 添加这个 groups-list 容器 -->
            <div class="groups-list">
              <!-- 未分组账号 -->
              <div class="group-card ungrouped">
                <div class="group-header">
                  <div class="group-info">
                    <div class="group-icon">
                      <el-icon><User /></el-icon>
                    </div>
                    <div class="group-details">
                      <h3 class="group-name">未分组账号</h3>
                      <p class="group-description">
                        {{ ungroupedAccounts.length }} 个账号
                      </p>
                    </div>
                  </div>
                </div>

                <div class="group-accounts" v-if="ungroupedAccounts.length > 0">
                  <div
                    v-for="account in ungroupedAccounts"
                    :key="account.id"
                    class="group-account-item"
                    draggable="true"
                    @dragstart="handleDragStart(account, $event)"
                    @dragend="handleDragEnd"
                  >
                    <div class="account-avatar-container">
                      <el-avatar
                        :size="32"
                        :src="getAvatarUrl(account)"
                      />
                      <div class="platform-logo">
                        <img
                          :src="getPlatformLogo(account.platform)"
                          :alt="account.platform"
                        />
                      </div>
                      <div
                        :class="[
                          'status-dot',
                          account.status === '正常' ? 'online' : 'offline',
                        ]"
                      ></div>
                    </div>
                    <div class="account-info">
                      <span class="account-name">{{ account.userName }}</span>
                      <span class="account-platform">{{
                        account.platform
                      }}</span>
                    </div>
                  </div>
                </div>
              </div>

              <!-- 自定义分组 -->
              <div
                v-for="group in customGroups"
                :key="group.id"
                class="group-card custom-group"
                @dragover="handleDragOver"
                @dragleave="handleDragLeave"
                @drop="handleDrop(group.id, $event)"
              >
                <div class="group-header">
                  <div class="group-info">
                    <div
                      class="group-icon"
                      :style="{ backgroundColor: group.color }"
                    >
                      <el-icon
                        ><component :is="getGroupIcon(group.icon)"
                      /></el-icon>
                    </div>
                    <div class="group-details">
                      <h3 class="group-name">{{ group.name }}</h3>
                      <p class="group-description">
                        {{
                          group.description ||
                          `${getAccountsByGroup(group.id).length} 个账号`
                        }}
                      </p>
                    </div>
                  </div>

                  <div class="group-actions">
                    <el-button
                      size="small"
                      text
                      @click="handleEditGroup(group)"
                    >
                      <el-icon><Edit /></el-icon>
                    </el-button>
                    <el-button
                      size="small"
                      text
                      type="danger"
                      @click="handleDeleteGroup(group)"
                    >
                      <el-icon><Delete /></el-icon>
                    </el-button>
                  </div>
                </div>

                <div
                  class="group-accounts"
                  v-if="getAccountsByGroup(group.id).length > 0"
                >
                  <div
                    v-for="account in getAccountsByGroup(group.id)"
                    :key="account.id"
                    class="group-account-item"
                    draggable="true"
                    @dragstart="handleDragStart(account, $event)"
                    @dragend="handleDragEnd"
                  >
                    <div class="account-avatar-container">
                      <el-avatar
                        :size="32"
                        :src="getAvatarUrl(account)"
                      />
                      <div class="platform-logo">
                        <img
                          :src="getPlatformLogo(account.platform)"
                          :alt="account.platform"
                        />
                      </div>
                      <div
                        :class="[
                          'status-dot',
                          account.status === '正常' ? 'online' : 'offline',
                        ]"
                      ></div>
                    </div>
                    <div class="account-info">
                      <span class="account-name">{{ account.userName }}</span>
                      <span class="account-platform">{{
                        account.platform
                      }}</span>
                    </div>
                    <el-button
                      size="small"
                      text
                      @click="moveAccountToGroup(account.id, null)"
                      title="移出分组"
                      class="remove-btn"
                    >
                      <el-icon><Close /></el-icon>
                    </el-button>
                  </div>
                </div>

                <div v-else class="group-empty">
                  <span>拖拽账号到此分组</span>
                </div>
              </div>
            </div>
            <!-- 🔥 关闭 groups-list 容器 -->
          </div>
        </div>
      </div>
    </div>

    <!-- 添加/编辑账号对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="dialogStep === 1 ? '选择平台' : '扫码登录'"
      width="600px"
      class="account-dialog"
      :close-on-click-modal="false"
      @close="handleDialogClose"
    >
      <div class="dialog-content">
        <!-- 第一步：平台选择 -->
        <div v-if="dialogStep === 1" class="platform-selection">
          <div class="platform-grid">
            <div
              v-for="platform in supportedPlatforms"
              :key="platform.name"
              :class="['platform-item', platform.class]"
              @click="handlePlatformSelect(platform.name)"
            >
              <div class="platform-logo">
                <img :src="platform.logo" :alt="platform.name" />
              </div>
              <div class="platform-name">{{ platform.name }}</div>
            </div>
          </div>
          <div class="platform-tip">
            <p>选择要添加的平台账号</p>
          </div>
        </div>

        <!-- 第二步：二维码扫描 -->
        <div v-if="dialogStep === 2" class="qrcode-step">
          <div class="step-header">
            <el-button
              text
              @click="handleBackToPlatformSelect"
              class="back-btn"
              :disabled="sseConnecting"
            >
              <el-icon><ArrowLeft /></el-icon>
              返回选择平台
            </el-button>
          </div>

          <div class="selected-platform">
            <img
              :src="getPlatformLogo(accountForm.platform)"
              :alt="accountForm.platform"
            />
            <span>{{ accountForm.platform }}</span>
          </div>

          <!-- 🔥 修改二维码显示容器 -->
          <div class="qrcode-container">
            <div class="qrcode-header">
              <el-icon><Iphone /></el-icon>
              <span>请使用{{ accountForm.platform }}APP扫描二维码登录</span>
            </div>
            <p class="qrcode-tip">
              扫码后请稍等，请勿关闭此窗口
            </p>

            <!-- 🔥 二维码展示框 - 固定大小的容器 -->
            <div class="qrcode-frame">
              <!-- 加载中状态 -->
              <!-- 🔥 根据是否有二维码动态添加 has-qrcode 类 -->
              <div
                :class="[
                  'qrcode-frame',
                  { 'has-qrcode': qrCodeData && !loginStatus },
                ]"
              >
                <!-- 加载中状态 -->
                <div
                  v-if="sseConnecting && !qrCodeData && !loginStatus"
                  class="qrcode-loading"
                >
                  <el-icon class="loading-spinner"><Loading /></el-icon>
                  <span class="loading-text">正在生成二维码...</span>
                </div>

                <!-- 显示二维码 -->
                <img
                  v-else-if="qrCodeData && !loginStatus"
                  :src="qrCodeData"
                  alt="登录二维码"
                  class="qrcode-image"
                />

                <!-- 登录成功 -->
                <div v-else-if="loginStatus === '200'" class="qrcode-success">
                  <el-icon class="success-icon"><CircleCheckFilled /></el-icon>
                  <span class="success-text">登录成功</span>
                </div>

                <!-- 登录失败 -->
                <div v-else-if="loginStatus === '500'" class="qrcode-error">
                  <el-icon class="error-icon"><CircleCloseFilled /></el-icon>
                  <span class="error-text">登录失败，请重试</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div v-if="dialogType === 'edit'" class="edit-form">
          <el-form :model="accountForm" label-width="80px" ref="accountFormRef">
            <el-form-item label="账号名称">
              <el-input v-model="accountForm.userName" />
            </el-form-item>

            <el-form-item label="状态">
              <el-select v-model="accountForm.status">
                <el-option label="正常" value="正常" />
                <el-option label="异常" value="异常" />
              </el-select>
            </el-form-item>
          </el-form>
        </div>
      </div>

      <template #footer>
        <div class="dialog-footer">
          <el-button @click="dialogVisible = false" :disabled="sseConnecting">
            取消
          </el-button>
          <!-- 重新生成二维码按钮 -->
          <el-button
            v-if="
              dialogStep === 2 &&
              (loginStatus === '500' || (!qrCodeData && !sseConnecting))
            "
            type="primary"
            @click="handleRetryLogin"
          >
            重新生成二维码
          </el-button>

          <el-button
            v-if="dialogType === 'edit'"
            type="primary"
            @click="submitEdit"
          >
            保存
          </el-button>
        </div>
      </template>
    </el-dialog>

    <!-- 分组管理对话框 -->
    <el-dialog
      v-model="groupDialogVisible"
      :title="groupDialogType === 'add' ? '创建分组' : '编辑分组'"
      width="480px"
      class="group-dialog"
    >
      <el-form
        :model="groupForm"
        label-width="80px"
        :rules="groupRules"
        ref="groupFormRef"
      >
        <el-form-item label="分组名称" prop="name">
          <el-input v-model="groupForm.name" placeholder="请输入分组名称" />
        </el-form-item>

        <el-form-item label="描述">
          <el-input
            v-model="groupForm.description"
            type="textarea"
            :rows="2"
            placeholder="请输入分组描述（可选）"
          />
        </el-form-item>

        <el-form-item label="颜色">
          <el-color-picker v-model="groupForm.color" />
        </el-form-item>

        <el-form-item label="图标">
          <el-select v-model="groupForm.icon" placeholder="选择图标">
            <el-option
              v-for="icon in groupIcons"
              :key="icon"
              :label="icon"
              :value="icon"
            >
              <div style="display: flex; align-items: center; gap: 8px">
                <el-icon><component :is="getGroupIcon(icon)" /></el-icon>
                <span>{{ icon }}</span>
              </div>
            </el-option>
          </el-select>
        </el-form-item>
      </el-form>

      <template #footer>
        <div class="dialog-footer">
          <el-button @click="groupDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="submitGroupForm">
            {{ groupDialogType === "add" ? "创建" : "更新" }}
          </el-button>
        </div>
      </template>
    </el-dialog>
    <!-- 分组设置对话框 -->
    <el-dialog
      v-model="groupSetDialogVisible"
      title="设置分组"
      width="400px"
      class="group-set-dialog"
    >
      <div class="group-set-content">
        <p class="account-info">账号：{{ currentAccount?.userName }}</p>
        <el-form :model="groupSetForm" label-width="80px">
          <el-form-item label="选择分组">
            <el-select
              v-model="groupSetForm.groupId"
              placeholder="请选择分组"
              clearable
              style="width: 100%"
            >
              <el-option label="不分组" :value="null" />
              <el-option
                v-for="group in accountStore.groups"
                :key="group.id"
                :label="group.name"
                :value="group.id"
              />
            </el-select>
          </el-form-item>
        </el-form>
      </div>

      <template #footer>
        <div class="dialog-footer">
          <el-button @click="groupSetDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="submitGroupSet">确定</el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onBeforeUnmount } from "vue";
import {
  Plus,
  Search,
  Refresh,
  More,
  User,
  Edit,
  Delete,
  CircleCheckFilled,
  WarningFilled,
  Grid,
  UserFilled,
  Iphone,
  Loading,
  CircleCloseFilled,
  VideoCamera,
  VideoPlay,
  Message,
  Document,
  Collection,
} from "@element-plus/icons-vue";
import { ElMessage, ElMessageBox } from "element-plus";
import { accountApi } from "@/api/account";
import { useAccountStore } from "@/stores/account";
import { useAppStore } from "@/stores/app";

// 状态管理
const accountStore = useAccountStore();
const appStore = useAppStore();
let processingMessage = null;
// 筛选和搜索
const filterStatus = ref("");
const filterPlatform = ref("");
const searchKeyword = ref("");

// 平台配置
const platforms = [
  { name: "抖音", icon: "VideoCamera", class: "douyin" },
  { name: "快手", icon: "PlayTwo", class: "kuaishou" },
  { name: "视频号", icon: "MessageBox", class: "wechat" },
  { name: "小红书", icon: "Notebook", class: "xiaohongshu" },
];

// 对话框相关
const dialogVisible = ref(false);
const dialogType = ref("add");

const sseConnecting = ref(false);
const qrCodeData = ref("");
const loginStatus = ref("");
const dialogStep = ref(1); // 1: 平台选择, 2: 二维码扫描

// 支持的平台配置（带logo）
const supportedPlatforms = [
  { name: "抖音", logo: "/logos/douyin.png", class: "douyin" },
  { name: "快手", logo: "/logos/kuaishou.png", class: "kuaishou" },
  { name: "视频号", logo: "/logos/wechat_shipinghao.png", class: "wechat" },
  { name: "小红书", logo: "/logos/xiaohongshu.jpg", class: "xiaohongshu" },
];

// 表单数据
const accountForm = reactive({
  id: null,
  platform: "",
  status: "正常",
});

// 计算属性
const activeTab = ref("accounts");

// 新增：分组筛选
const filterGroup = ref("");

// 修改筛选逻辑
const filteredAccounts = computed(() => {
  let accounts = accountStore.accounts;

  if (filterStatus.value) {
    accounts = accounts.filter((acc) => acc.status === filterStatus.value);
  }

  if (filterPlatform.value) {
    accounts = accounts.filter((acc) => acc.platform === filterPlatform.value);
  }

  // 新增：分组筛选
  if (filterGroup.value) {
    if (filterGroup.value === "ungrouped") {
      accounts = accounts.filter((acc) => !acc.group_id);
    } else {
      accounts = accounts.filter((acc) => acc.group_id === filterGroup.value);
    }
  }

  if (searchKeyword.value) {
    accounts = accounts.filter((acc) =>
      acc.name.toLowerCase().includes(searchKeyword.value.toLowerCase())
    );
  }

  return accounts;
});

const totalCount = computed(() => accountStore.accounts.length);
const normalCount = computed(
  () => accountStore.accounts.filter((acc) => acc.status === "正常").length
);
const abnormalCount = computed(
  () => accountStore.accounts.filter((acc) => acc.status === "异常").length
);
const platformCount = computed(() => {
  const platforms = new Set(accountStore.accounts.map((acc) => acc.platform));
  return platforms.size;
});
// 在现有计算属性后面添加
const platformGroups = computed(() => {
  const platforms = [
    ...new Set(accountStore.accounts.map((acc) => acc.platform)),
  ];

  return platforms.map((platform) => ({
    id: `platform_${platform}`,
    name: platform,
    type: "platform",
    accounts: accountStore.accounts.filter((acc) => acc.platform === platform),
    color: getPlatformColor(platform),
    logo: getPlatformLogo(platform),
  }));
});

const customGroups = computed(() => {
  // 平台分组名称列表
  const platformNames = ["微信视频号", "抖音", "快手", "小红书", "视频号"];

  // 只保留非平台分组
  const filtered = accountStore.groups.filter(
    (group) => !platformNames.includes(group.name)
  );

  //console.log("🔍 原始分组数据:", accountStore.groups);
  //console.log("✅ 过滤后的自定义分组:", filtered);

  return filtered;
});
const getAccountsByGroup = (groupId) => {
  return accountStore.accounts.filter((acc) => acc.group_id === groupId);
};
const ungroupedAccounts = computed(() =>
  accountStore.accounts.filter((acc) => !acc.group_id)
);

// 添加平台颜色映射方法
const getPlatformColor = (platform) => {
  const colorMap = {
    抖音: "#fe2c55",
    快手: "#ff6600",
    视频号: "#07c160",
    小红书: "#ff2442",
  };
  return colorMap[platform] || "#6b7280";
};

// 🔥 简化的头像URL获取逻辑
const getAvatarUrl = (account) => {
  // 1. 优先使用数据库中的头像字段
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

  // 🔥 2. 当头像字段为空，构造可能的本地路径
  if (account.userName && account.platform) {
    const platformMap = {
      抖音: "douyin",
      快手: "kuaishou",
      视频号: "wechat",
      微信视频号: "wechat",
      小红书: "xiaohongshu",
    };

    const platformKey = platformMap[account.platform];
    if (platformKey) {
      return `http://localhost:3409/assets/avatar/${platformKey}/${account.userName}/avatar.jpg`;
    }
  }

  // 3. 默认头像
  return "/default-avatar.png";
};
const fetchAccounts = async (forceCheck = false) => {
  if (appStore.isAccountRefreshing) return;

  appStore.setAccountRefreshing(true);

  try {
    console.log("🔍 开始获取账号数据，forceCheck:", forceCheck);

    const res = await accountApi.getAccountsWithGroups(forceCheck);
    console.log("✅ 账号API响应:", res);

    if (res && res.code === 200 && res.data) {
      accountStore.setAccounts(res.data);

      // 同时获取分组信息
      try {
        const groupsRes = await accountApi.getGroups();
        console.log("✅ 分组API响应:", groupsRes);
        if (groupsRes && groupsRes.code === 200 && groupsRes.data) {
          accountStore.setGroups(groupsRes.data);
        }
      } catch (error) {
        console.warn("获取分组信息失败:", error);
      }
      if (appStore.isFirstTimeAccountManagement) {
        appStore.setAccountManagementVisited();
      }
    } else {
      console.error("❌ 账号API响应格式错误:", res);
      ElMessage.error("获取账号数据失败");
    }
  } catch (error) {
    console.error("获取账号数据失败:", error);
    ElMessage.error(`获取账号数据失败: ${error.message || "网络错误"}`);
  } finally {
    appStore.setAccountRefreshing(false);
  }
};
// 分组设置相关
const groupSetDialogVisible = ref(false);
const currentAccount = ref(null);
const groupSetForm = reactive({
  groupId: null,
});
const getPlatformLogo = (platform) => {
  const logoMap = {
    抖音: "/logos/douyin.png",
    快手: "/logos/kuaishou.png",
    视频号: "/logos/wechat_shipinghao.png",
    微信视频号: "/logos/wechat_shipinghao.png",
    小红书: "/logos/xiaohongshu.jpg",
  };
  return logoMap[platform] || "";
};
const handleSearch = () => {
  // 搜索逻辑已通过计算属性实现
};
// 在现有的方法后添加
const handleAccountCardClick = async (account) => {
  // 只有正常状态的账号才能点击
  if (account.status !== '正常') {
    return;
  }

  try {
    console.log('🔍 手动验证账号:', account.userName);
    
    // 显示加载提示
    const loadingMessage = ElMessage({
      type: 'info',
      message: `正在打开 ${account.userName} 的页面...`,
      duration: 2000
    });

    // 调用验证API，设置为可见且不自动关闭
    const response = await accountApi.validateAccount({
      accountId: Number(account.id),
      headless: false,  // 可见
      tabClose: false   // 不自动关闭
    });

    if (response.code === 200) {
      // 如果验证结果发生变化，刷新账号列表
      if ((response.data.isValid && account.status === '异常') || 
          (!response.data.isValid && account.status === '正常')) {
        await accountStore.smartRefresh();
      }
    } else {
      console.log(response.msg);
    }
  } catch (error) {
    console.error('验证账号失败:', error);
    //ElMessage.error('验证账号失败');
  }
};
const handleAddAccount = () => {
  dialogType.value = "add";
  dialogStep.value = 1; // 重置到第一步
  Object.assign(accountForm, {
    id: null,
    name: "", // 保留但不再显示输入框
    platform: "",
    status: "正常",
  });
  sseConnecting.value = false;
  qrCodeData.value = "";
  loginStatus.value = "";
  dialogVisible.value = true;
};
const handlePlatformSelect = async (platform) => {
  accountForm.platform = platform;
  dialogStep.value = 2; // 进入第二步

  // 🔥 确保初始状态正确
  sseConnecting.value = true; // 显示加载状态
  qrCodeData.value = ""; // 清空二维码数据
  loginStatus.value = ""; // 清空登录状态

  // 立即开始登录流程
  const tempUserName = `用户_${Date.now()}`;
  await connectSSE(platform, tempUserName);
};
const waitingForBackendProcessing = ref(false);
// 新增：处理对话框关闭
const handleDialogClose = () => {
    console.log("🔄 handleDialogClose 被调用");
    console.log("🔍 waitingForBackendProcessing:", waitingForBackendProcessing.value);
    console.log("🔍 当前 processingMessage:", processingMessage);
    dialogStep.value = 1;
    sseConnecting.value = false;
    qrCodeData.value = "";
    loginStatus.value = "";
    // 🔥 只有在不等待后台处理时才关闭SSE连接
    if (!waitingForBackendProcessing.value) {
        console.log("🔄 不在等待后台处理，关闭SSE连接");
        closeSSEConnection();
    } else {
        console.log("✅ 正在等待后台处理，保持SSE连接");
    }
    
    // 🔥 检查是否意外关闭了处理消息
    if (processingMessage) {
        //console.log("⚠️ handleDialogClose 中发现 processingMessage，是否应该关闭？");
        //console.log("🔍 waitingForBackendProcessing:", waitingForBackendProcessing.value);
        
        // 只有在不等待后台处理时才关闭处理消息
        if (!waitingForBackendProcessing.value) {
            //console.log("🔄 关闭处理中消息 (在 handleDialogClose 中)");
            processingMessage.close();
            processingMessage = null;
        }
    }
};

const handleEdit = (account) => {
  dialogType.value = "edit";

  // 🔥 填充编辑表单数据
  Object.assign(accountForm, {
    id: account.id,
    userName: account.userName,
    platform: account.platform,
    status: account.status,
    // 可以添加更多可编辑字段
  });

  dialogVisible.value = true;
  dialogStep.value = 2; // 直接跳到编辑表单，不需要平台选择
};

const handleDelete = (account) => {
  ElMessageBox.confirm(`确定要删除账号 ${account.userName} 吗？`, "删除确认", {
    confirmButtonText: "确定删除",
    cancelButtonText: "取消",
    type: "warning",
  })
    .then(async () => {
      try {
        const response = await accountApi.deleteAccount(account.id);

        if (response.code === 200) {
          accountStore.deleteAccount(account.id);
          console.log("✅ 删除成功");
        } else {
          ElMessage.error(response.msg || "删除失败");
        }
      } catch (error) {
        console.error("删除账号失败:", error);
        ElMessage.error("删除账号失败");
      }
    })
    .catch(() => {});
};
// 处理下拉菜单命令
const handleActionCommand = (command) => {
  const [action, accountId] = command.split("-");
  const account = accountStore.accounts.find((acc) => acc.id == accountId);

  if (!account) return;

  switch (action) {
    case "group":
      handleSetGroup(account);
      break;
    case "delete":
      handleDelete(account);
      break;
  }
};

// 设置分组
const handleSetGroup = (account) => {
  currentAccount.value = account;
  groupSetForm.groupId = account.group_id || null;
  groupSetDialogVisible.value = true;
};

// 提交分组设置
const submitGroupSet = async () => {
  if (!currentAccount.value) return;

  try {
    await moveAccountToGroup(currentAccount.value.id, groupSetForm.groupId);
    groupSetDialogVisible.value = false;
    currentAccount.value = null;
  } catch (error) {
    console.error("设置分组失败:", error);
  }
};

// 恢复账号
const handleRecover = (account) => {
  // 复用现有的添加账号流程
  console.log("🔄 开始恢复账号:", account);
  dialogType.value = "recover";
  accountForm.platform = account.platform;
  accountForm.userName = account.userName;
  accountForm.id = account.id;

  // 直接跳到二维码步骤
  dialogStep.value = 2;
  dialogVisible.value = true;
  console.log("🔄 调用 connectSSE:", {
    platform: account.platform,
    userName: account.userName,
    isRecover: true,
    accountId: account.id,
  }); // 调试日志
  // 开始 SSE 连接
  connectSSE(account.platform, account.userName, true, account.id);
};

const handleRetryLogin = () => {
  console.log("🔄 重新生成二维码");

  // 重置状态
  sseConnecting.value = true;
  qrCodeData.value = "";
  loginStatus.value = "";

  // 重新调用connectSSE
  if (dialogType.value === "recover" && accountForm.id) {
    // 恢复账号模式
    connectSSE(
      accountForm.platform,
      accountForm.userName,
      true,
      accountForm.id
    );
  } else {
    // 新增账号模式
    const tempUserName = `用户_${Date.now()}`;
    connectSSE(accountForm.platform, tempUserName);
  }
};
// SSE连接相关
let eventSource = null;

const closeSSEConnection = () => {
    if (eventSource) {
        console.log("🔌 正在关闭SSE连接...");
        eventSource.close();
        eventSource = null;
        console.log("✅ SSE连接已关闭");
    }
    
    // 🔥 关闭连接时也要清理处理中的消息
    if (processingMessage) {
        processingMessage.close();
        processingMessage = null;
    }
};

const connectSSE = (platform, name, isRecover = false, accountId = null) => {
  closeSSEConnection();

  sseConnecting.value = true;
  qrCodeData.value = "";
  loginStatus.value = "";

  const platformTypeMap = {
    小红书: "1",
    视频号: "2",
    抖音: "3",
    快手: "4",
  };

  const type = platformTypeMap[platform] || "1";
  const baseUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:3409";
  let url;
  if (isRecover && accountId) {
    url = `${baseUrl}/login?type=${type}&id=${encodeURIComponent(
      name
    )}&mode=recover&accountId=${accountId}`;
  } else {
    url = `${baseUrl}/login?type=${type}&id=${encodeURIComponent(name)}`;
  }
  eventSource = new EventSource(url);

  eventSource.onmessage = (event) => {
    const data = event.data;
    //console.log("🔍 SSE消息:", data);
    //console.log("🔍 消息长度:", data.length);
    //console.log("🔍 消息类型:", typeof data);

    if (!qrCodeData.value && data.length > 100) {
        // 处理二维码数据（保持原有逻辑）
        try {
            if (data.startsWith("data:image")) {
                qrCodeData.value = data;
                console.log("✅ 直接设置 data:image 格式二维码");
            } else if (data.startsWith("http")) {
                qrCodeData.value = data;
                console.log("✅ 设置 HTTP URL 格式二维码");
            } else {
                qrCodeData.value = `data:image/png;base64,${data}`;
                console.log("✅ 转换为 base64 格式二维码");
            }
        } catch (error) {
            console.error("❌ 处理二维码数据出错:", error);
        }
    } 
    // 🔥 URL跳转成功 - 显示登录成功状态后再关闭对话框
    else if (data === "url_changed") {
        console.log("📡 收到URL跳转状态，显示登录成功");
        
        // 🔥 设置等待后台处理状态
        waitingForBackendProcessing.value = true;
        
        // 🔥 第一步：显示登录成功状态
        loginStatus.value = "200";
        sseConnecting.value = false;
        qrCodeData.value = "";
        
        // 🔥 第二步：让用户看到登录成功状态（延迟1.5秒）
        setTimeout(() => {
            console.log("✅ 登录成功状态显示完毕，关闭对话框");
            
            // 关闭对话框
            dialogVisible.value = false;
            loginStatus.value = "";
            console.log("🔄 正在显示处理中消息...");
            // 显示处理中消息
            try {
                processingMessage = ElMessage({
                    type: 'info',
                    message: '扫码成功！正在处理账号信息...',
                    duration: 0,
                    showClose: false
                });
                console.log("✅ 处理中消息已显示:", processingMessage);
            } catch (error) {
                console.error("❌ 显示处理中消息失败:", error);
            }
        }, 1500);
        
        console.log("✅ 保持SSE连接，等待后台处理完成");
    }
    // 🔥 后台处理完成状态
    else if (data === "200") {
        console.log("📡 收到后台处理完成状态");
        console.log("🔍 当前 processingMessage:", processingMessage);
        
        waitingForBackendProcessing.value = false;
        closeSSEConnection();
        
        // 🔥 添加调试信息
        if (processingMessage) {
            console.log("🔄 正在关闭处理中消息...");
            try {
                processingMessage.close();
                processingMessage = null;
                console.log("✅ 处理中消息已关闭");
            } catch (error) {
                console.error("❌ 关闭处理中消息失败:", error);
            }
        } else {
            console.warn("⚠️ processingMessage 为空，可能没有正确显示");
        }
        
        console.log("🔄 显示成功消息...");
        ElMessage.success("账号添加成功！");
        
        setTimeout(async () => {
            await accountStore.smartRefresh(true);
        }, 500);
    }
    // 🔥 处理失败状态
    else if (data === "500") {
        console.log("📡 收到失败状态");
        
        // 🔥 清除等待状态
        waitingForBackendProcessing.value = false;
        
        closeSSEConnection();
        
        // 关闭处理中消息
        if (processingMessage) {
            processingMessage.close();
            processingMessage = null;
        }
        
        ElMessage.error("登录处理失败，请重试");
        
        // 重置状态，允许用户重新尝试
        sseConnecting.value = false;
        qrCodeData.value = "";
        loginStatus.value = "";
    }
  };

  eventSource.onerror = (error) => {
      console.error("SSE连接错误:", error);
      waitingForBackendProcessing.value = false;
      // 🔥 如果有处理中的消息，先关闭
      if (processingMessage) {
          processingMessage.close();
          processingMessage = null;
      }
      
      // 🔥 如果二维码框还在显示，说明是连接问题
      if (dialogVisible.value && qrCodeData.value) {
          ElMessage.error("连接服务器失败，请稍后再试");
          closeSSEConnection();
          sseConnecting.value = false;
      }
      // 🔥 如果二维码框已关闭，说明在处理中断开
      else if (!dialogVisible.value) {
          ElMessage.warning("连接中断，正在尝试刷新账号列表...");
          
          // 🔥 连接中断时也尝试刷新账号列表
          setTimeout(async () => {
              try {
                  await accountStore.smartRefresh(true);
                  console.log("✅ 异常情况下账号列表刷新完成");
              } catch (refreshError) {
                  console.error("❌ 刷新账号列表失败:", refreshError);
                  ElMessage.error("请手动刷新页面查看最新账号");
              }
          }, 2000);
      }
      
      closeSSEConnection();
  };
};

// 新增：分组管理相关方法和数据
const groupDialogVisible = ref(false);
const groupDialogType = ref("add");
const groupFormRef = ref(null);
const draggedAccount = ref(null);

const groupForm = reactive({
  id: null,
  name: "",
  description: "",
  color: "#5B73DE",
  icon: "Users",
});

const groupRules = {
  name: [{ required: true, message: "请输入分组名称", trigger: "blur" }],
};

// 可选的图标列表
const groupIcons = [
  "Users",
  "User",
  "Briefcase",
  "Star",
  "Heart",
  "Flag",
  "Trophy",
  "Gift",
  "Crown",
  "Diamond",
  "Fire",
  "Lightning",
];

// 获取分组图标组件
const getGroupIcon = (iconName) => {
  // Element Plus 图标映射
  const iconMap = {
    Users: "User",
    User: "User",
    Briefcase: "Briefcase",
    Star: "Star",
    Heart: "Heart",
    Flag: "Flag",
    Trophy: "Trophy",
    Gift: "Gift",
    Crown: "Crown",
    Diamond: "Diamond",
    Fire: "Fire",
    Lightning: "Lightning",
  };
  return iconMap[iconName] || "User";
};

// 拖拽开始 - 添加详细调试
const handleDragStart = (account, event) => {
  console.log("=== 拖拽开始 ===");
  console.log("账号数据:", account);
  console.log("账号ID:", account?.id);
  console.log("账号名称:", account?.name);

  // 确保账号数据完整
  if (!account || !account.id) {
    console.error("❌ 账号数据不完整:", account);
    event.preventDefault();
    return;
  }

  draggedAccount.value = account;
  console.log("✅ 设置拖拽账号:", draggedAccount.value);

  event.dataTransfer.effectAllowed = "move";
  event.dataTransfer.setData("text/plain", account.id.toString());

  // 添加拖拽样式
  event.target.style.opacity = "0.5";
};

// 拖拽悬停 - 添加调试
const handleDragOver = (event) => {
  event.preventDefault();
  event.dataTransfer.dropEffect = "move";

  console.log("=== 拖拽悬停 ===");
  console.log("当前拖拽账号:", draggedAccount.value);

  // 添加悬停样式
  const groupCard = event.currentTarget;
  groupCard.classList.add("drag-over");

  // 如果 draggedAccount 丢失，尝试恢复
  if (!draggedAccount.value) {
    console.warn("⚠️ 拖拽账号数据丢失，尝试恢复...");
    const accountId = event.dataTransfer.getData("text/plain");
    console.log("从 dataTransfer 获取账号ID:", accountId);

    if (accountId) {
      const account = accountStore.accounts.find((acc) => acc.id == accountId);
      console.log("找到的账号:", account);
      if (account) {
        draggedAccount.value = account;
        console.log("✅ 恢复拖拽账号数据:", account.userName);
      }
    }
  }
};

// 拖拽放置 - 添加详细调试
const handleDrop = async (groupId, event) => {
  event.preventDefault();

  console.log("=== 拖拽放置 ===");
  console.log("目标分组ID:", groupId);
  console.log("拖拽账号数据:", draggedAccount.value);
  console.log("拖拽账号是否存在:", !!draggedAccount.value);
  console.log("拖拽账号ID:", draggedAccount.value?.id);

  // 移除悬停样式
  const groupCard = event.currentTarget;
  groupCard.classList.remove("drag-over");

  // 尝试从 dataTransfer 恢复数据
  if (!draggedAccount.value) {
    console.warn("⚠️ 拖拽账号为空，尝试从 dataTransfer 恢复...");
    const accountId = event.dataTransfer.getData("text/plain");
    console.log("从 dataTransfer 获取账号ID:", accountId);

    if (accountId) {
      const account = accountStore.accounts.find((acc) => acc.id == accountId);
      console.log("找到的账号:", account);
      if (account) {
        draggedAccount.value = account;
        console.log("✅ 恢复成功:", account.userName);
      }
    }
  }

  // 最终检查
  if (!draggedAccount.value || !draggedAccount.value.id) {
    console.error("❌ 拖拽账号数据无效，无法继续操作");
    console.log("draggedAccount.value:", draggedAccount.value);
    draggedAccount.value = null;
    return;
  }

  // 检查是否拖拽到同一个分组
  if (draggedAccount.value.group_id === groupId) {
    console.log("ℹ️ 账号已在此分组中，无需移动");
    draggedAccount.value = null;
    return;
  }

  console.log("🚀 开始调用API更新分组...");

  try {
    const res = await accountApi.updateAccountGroup({
      account_id: draggedAccount.value.id,
      group_id: groupId,
    });

    console.log("API响应:", res);

    if (res.code === 200) {
      const group = accountStore.getGroupById(groupId);
      accountStore.updateAccountGroup(draggedAccount.value.id, groupId, group);
      console.log("✅ 分组更新成功");
    } else {
      ElMessage.error(res.msg || "分组更新失败");
      console.error("❌ API返回错误:", res);
    }
  } catch (error) {
    console.error("❌ 更新账号分组失败:", error);
  } finally {
    draggedAccount.value = null;
    console.log("🧹 清理拖拽状态");
  }
};

// 拖拽结束 - 添加调试
const handleDragEnd = (event) => {
  console.log("=== 拖拽结束 ===");
  console.log("恢复透明度");

  // 恢复透明度
  event.target.style.opacity = "1";

  // 延迟清理，确保 drop 事件先执行
  setTimeout(() => {
    if (draggedAccount.value) {
      console.log("延迟清理拖拽数据:", draggedAccount.value.name);
      draggedAccount.value = null;
    }
  }, 200);
};
const handleDragLeave = (event) => {
  console.log("=== 拖拽离开 ===");

  // 检查是否真的离开了分组区域（而不是进入子元素）
  const groupCard = event.currentTarget;
  const relatedTarget = event.relatedTarget;

  // 如果鼠标移动到了子元素，不移除样式
  if (relatedTarget && groupCard.contains(relatedTarget)) {
    console.log("移动到子元素，保持悬停样式");
    return;
  }

  console.log("真正离开分组区域，移除悬停样式");
  groupCard.classList.remove("drag-over");
};
// 移动账号到指定分组 - 修改版
const moveAccountToGroup = async (accountId, groupId) => {
  console.log("移出分组操作:", { accountId, groupId }); // 添加调试

  try {
    const res = await accountApi.updateAccountGroup({
      account_id: accountId,
      group_id: groupId,
    });

    console.log("API响应:", res); // 添加调试

    if (res.code === 200) {
      const group = groupId ? accountStore.getGroupById(groupId) : null;
      accountStore.updateAccountGroup(accountId, groupId, group);
      console.log("✅", groupId ? "账号已移入分组" : "账号已移出分组");

      // 重要：重新获取最新数据，确保数据同步
      await fetchAccounts(false);
    } else {
      ElMessage.error(res.msg || "操作失败");
    }
  } catch (error) {
    console.error("移动账号失败:", error);
  }
};
// 添加分组
const handleAddGroup = () => {
  groupDialogType.value = "add";
  Object.assign(groupForm, {
    id: null,
    name: "",
    description: "",
    color: "#5B73DE",
    icon: "Users",
  });
  groupDialogVisible.value = true;
};

// 编辑分组
const handleEditGroup = (group) => {
  groupDialogType.value = "edit";
  Object.assign(groupForm, { ...group });
  groupDialogVisible.value = true;
};

// 删除分组
const handleDeleteGroup = (group) => {
  ElMessageBox.confirm(
    `确定要删除分组 "${group.name}" 吗？分组内的账号将变为未分组状态。`,
    "删除确认",
    {
      confirmButtonText: "确定删除",
      cancelButtonText: "取消",
      type: "warning",
    }
  )
    .then(async () => {
      try {
        const res = await accountApi.deleteGroup(group.id);
        if (res.code === 200) {
          accountStore.deleteGroup(group.id);
          console.log("✅ 分组删除成功");

          // 重要：重新获取账号和分组数据
          await fetchAccounts(false);
          const groupsRes = await accountApi.getGroups();
          if (groupsRes.code === 200) {
            accountStore.setGroups(groupsRes.data);
          }
        } else {
          ElMessage.error(res.msg || "删除失败");
        }
      } catch (error) {
        console.error("删除分组失败:", error);
        console.error("❌删除失败");
      }
    })
    .catch(() => {});
};

// 提交分组表单
const submitGroupForm = () => {
  groupFormRef.value.validate(async (valid) => {
    if (valid) {
      try {
        let res;
        if (groupDialogType.value === "add") {
          res = await accountApi.createGroup(groupForm);
          if (res.code === 200) {
            console.log("✅ 分组创建成功");
            // 重新获取分组列表
            const groupsRes = await accountApi.getGroups();
            if (groupsRes.code === 200) {
              accountStore.setGroups(groupsRes.data);
            }
          }
        } else {
          res = await accountApi.updateGroup(groupForm);
          if (res.code === 200) {
            // 不只是更新 Store，也要重新获取最新数据
            console.log("✅ 分组更新成功");
            const groupsRes = await accountApi.getGroups();
            if (groupsRes.code === 200) {
              accountStore.setGroups(groupsRes.data);
            }
            // 也重新获取账号数据，因为分组信息可能影响账号显示
            await fetchAccounts(false);
          }
        }

        if (res.code === 200) {
          groupDialogVisible.value = false;
        } else {
          ElMessage.error(res.msg || "操作失败");
        }
      } catch (error) {
        console.error("分组操作失败:", error);
        console.error("❌操作失败");
      }
    }
  });
};
const submitEdit = async () => {
  try {
    const res = await accountApi.updateUserinfo({
      id: accountForm.id,
      userName: accountForm.userName,
      status: accountForm.status === "正常" ? 1 : 0,
    });

    if (res.code === 200) {
      console.log("✅ 更新成功");
      dialogVisible.value = false;
      fetchAccounts(); // 刷新列表
    } else {
      console.error("❌ 更新失败:", res.msg || "未知错误");
    }
  } catch (error) {
    console.error("❌更新失败");
  }
};
// 生命周期
onMounted(() => {
  //if (appStore.isFirstTimeAccountManagement) {
  fetchAccounts(true);
});

onBeforeUnmount(() => {
  closeSSEConnection();
  // 清理任何未完成的消息
  if (processingMessage) {
      processingMessage.close();
      processingMessage = null;
  }
});
</script>

<style lang="scss" scoped>
// 变量定义
$primary: #5b73de;
$success: #10b981;
$warning: #f59e0b;
$danger: #ef4444;
$info: #6b7280;

$platform-douyin: #fe2c55;
$platform-kuaishou: #ff6600;
$platform-xiaohongshu: #ff2442;
$platform-wechat: #07c160;

$bg-light: #f8fafc;
$bg-white: #ffffff;
$bg-gray: #f1f5f9;

$text-primary: #1e293b;
$text-secondary: #64748b;
$text-muted: #94a3b8;

$border-light: #e2e8f0;
$shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
$shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1),
  0 2px 4px -1px rgba(0, 0, 0, 0.06);
$shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1),
  0 4px 6px -2px rgba(0, 0, 0, 0.05);

$radius-sm: 4px;
$radius-md: 8px;
$radius-lg: 12px;
$radius-xl: 16px;

$space-xs: 4px;
$space-sm: 8px;
$space-md: 16px;
$space-lg: 24px;
$space-xl: 32px;
$space-2xl: 48px;
:deep(.el-overlay) {
  background-color: rgba(0, 0, 0, 0.8) !important;
}
.account-management {
  max-width: 1200px;
  margin: 0 auto;
}

.qrcode-container {
  text-align: center;

  .qrcode-header {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: $space-sm;
    margin-bottom: $space-md;
    font-weight: 600;
    color: $text-primary;
  }

  .qrcode-tip {
    color: $text-secondary;
    margin-bottom: $space-lg;
    font-size: 14px;
  }

  // 🔥 固定大小的二维码框
  .qrcode-frame {
    width: 240px;
    height: 240px;
    margin: 0 auto;
    border-radius: $radius-lg;
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
    overflow: hidden;
    transition: all 0.3s ease;

    // 🔥 默认状态：浅色背景，用于显示加载文字
    background: $bg-gray;
    border: 2px dashed $border-light;

    // 🔥 当有二维码时：深灰色渐变背景
    &.has-qrcode {
      background: linear-gradient(135deg, #4a5568 0%, #2d3748 100%);
      border: 1px solid rgba(255, 255, 255, 0.1);
      box-shadow: 0 4px 20px rgba(45, 55, 72, 0.4);
    }

    .qrcode-image {
      width: 200px;
      height: 200px;
      border-radius: $radius-md;
      object-fit: contain;

      // 🔥 在深灰背景上微调对比度
      filter: contrast(1.1);
    }

    // 加载、成功、失败状态保持浅色背景和深色文字
    .qrcode-loading,
    .qrcode-success,
    .qrcode-error {
      color: $text-primary;
    }

    // 🔥 加载状态
    .qrcode-loading {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: $space-md;
      color: $text-secondary;

      .loading-spinner {
        font-size: 32px;
        animation: rotate 1s linear infinite;
      }

      .loading-text {
        font-size: 14px;
      }
    }

    // 成功状态
    .qrcode-success {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: $space-sm;

      .success-icon {
        font-size: 48px;
        color: $success;
      }

      .success-text {
        font-size: 16px;
        font-weight: 500;
        color: $success;
      }
    }

    // 失败状态
    .qrcode-error {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: $space-sm;

      .error-icon {
        font-size: 48px;
        color: $danger;
      }

      .error-text {
        font-size: 16px;
        font-weight: 500;
        color: $danger;
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
// 页面头部
.page-header {
  margin-bottom: $space-lg;

  .header-content {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;

    .header-left {
      .page-title {
        font-size: 28px;
        font-weight: 700;
        color: $text-primary;
        margin: 0 0 $space-xs 0;
      }

      .page-subtitle {
        font-size: 16px;
        color: $text-secondary;
        margin: 0;
      }
    }

    .header-actions {
      .add-btn {
        padding: 12px 24px;
        font-weight: 600;
        border-radius: $radius-lg;
        box-shadow: $shadow-md;
        transition: all 0.3s ease;

        &:hover {
          transform: translateY(-2px);
          box-shadow: $shadow-lg;
        }
      }
    }
  }
}

// 筛选工具栏
.filter-toolbar {
  background: $bg-white;
  border-radius: $radius-lg;
  padding: $space-lg;
  margin-bottom: $space-lg;
  box-shadow: $shadow-sm;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: $space-md;

  .filter-left {
    display: flex;
    align-items: center;
    gap: $space-md;
    flex: 1;

    .filter-group {
      display: flex;
      gap: $space-sm;

      .filter-select {
        width: 140px;
      }
    }

    .search-box {
      .search-input {
        width: 280px;
      }
    }
  }

  .filter-right {
    display: flex;
    gap: $space-sm;

    .refresh-btn,
    .more-btn {
      width: 40px;
      height: 40px;
      border-radius: $radius-md;
      display: flex;
      align-items: center;
      justify-content: center;

      .rotating {
        animation: rotate 1s linear infinite;
      }
    }
  }
}

// 统计卡片
.stats-section {
  margin-bottom: $space-lg;

  .stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
    gap: $space-md;

    .stat-card {
      background: $bg-white;
      border-radius: $radius-lg;
      padding: $space-lg;
      display: flex;
      align-items: center;
      gap: $space-md;
      box-shadow: $shadow-sm;
      transition: all 0.3s ease;

      &:hover {
        transform: translateY(-2px);
        box-shadow: $shadow-md;
      }

      .stat-icon {
        width: 48px;
        height: 48px;
        border-radius: $radius-lg;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;

        .el-icon {
          font-size: 24px;
          color: white;
        }

        &.total {
          background: linear-gradient(135deg, $primary 0%, #8b9ee8 100%);
        }

        &.normal {
          background: linear-gradient(135deg, $success 0%, #34d399 100%);
        }

        &.abnormal {
          background: linear-gradient(135deg, $danger 0%, #f87171 100%);
        }

        &.platforms {
          background: linear-gradient(135deg, $info 0%, #9ca3af 100%);
        }
      }

      .stat-content {
        .stat-number {
          font-size: 24px;
          font-weight: 700;
          color: $text-primary;
          line-height: 1.2;
        }

        .stat-label {
          font-size: 14px;
          color: $text-secondary;
          margin-top: $space-xs;
        }
      }
    }
  }
}

// 账号列表
.accounts-section {
  .accounts-grid {
    display: grid;
    grid-template-columns: repeat(
      auto-fill,
      minmax(200px, 1fr)
    ); // 从 240px 改为 200px
    gap: $space-sm; // 从 $space-md 改为 $space-sm
  }

  .account-card {
    background: $bg-white;
    border-radius: $radius-lg;
    padding: $space-xs $space-sm; // 从 $space-sm 改为上下 $space-xs，左右 $space-sm
    box-shadow: $shadow-sm;
    transition: all 0.3s ease;
    position: relative;
    overflow: hidden;
    min-height: 60px; // 从 80px 改为 60px，进一步减少高度

    &:hover {
      transform: translateY(-2px);
      box-shadow: $shadow-lg;
    }

    .account-info {
      display: flex;
      align-items: center;
      gap: $space-xs;
      margin-bottom: 0; // 保持为 0

      .avatar-container {
        position: relative;
        flex-shrink: 0;

        .account-avatar {
          position: relative;

          :deep(.el-avatar) {
            width: 36px !important; // 从 40px 改为 36px，进一步缩小
            height: 36px !important;
            border: 2px solid #f1f5f9;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          }
        }

        .platform-logo {
          position: absolute;
          bottom: -2px;
          right: -2px;
          width: 18px; // 从 20px 改为 18px
          height: 18px;
          border-radius: 50%;
          background: white;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 1px 4px rgba(0, 0, 0, 0.2);
          border: 1px solid white;

          img {
            width: 14px; // 从 16px 改为 14px
            height: 14px;
            border-radius: 50%;
            object-fit: cover;
          }
        }

        .status-dot {
          position: absolute;
          top: 0;
          right: 2px; // 从 4px 调整
          width: 8px;
          height: 8px;
          border-radius: 50%;
          border: 2px solid white;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);

          &.online {
            background-color: $success;
          }

          &.offline {
            background-color: $danger;
          }
        }
      }

      .account-details {
        flex: 1;
        min-width: 0;

        .account-name {
          font-size: 13px;
          font-weight: 600;
          color: $text-primary;
          margin: 0 0 1px 0; // 从 2px 改为 1px，进一步紧凑
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          line-height: 1.1; // 从 1.2 改为 1.1
        }

        .account-meta {
          display: flex;
          align-items: center;
          gap: 3px; // 从 4px 改为 3px
          flex-wrap: wrap;

          .platform-text {
            font-size: 11px;
            color: $text-secondary;
            background: $bg-gray;
            padding: 0 4px; // 从 1px 4px 改为 0 4px，减少垂直内边距
            border-radius: $radius-sm;
            font-weight: 500;
            line-height: 1.3; // 减少行高
            height: 14px; // 设置固定高度
            display: flex;
            align-items: center;
          }

          .group-tag {
            font-size: 10px;
            border: none;
            height: 14px; // 从 16px 改为 14px
            line-height: 1;

            :deep(.el-tag__content) {
              color: white;
              font-weight: 500;
              line-height: 1;
              padding: 0 4px; // 减少内边距
            }
          }

          :deep(.el-tag) {
            height: 14px; // 从 16px 改为 14px
            line-height: 12px;
            font-size: 10px;
            padding: 0 4px; // 减少内边距
          }
        }
      }
    }

    .account-actions {
      position: absolute;
      top: 4px; // 从 $space-xs 改为固定 4px
      right: 4px; // 从 $space-xs 改为固定 4px
      display: flex;
      flex-direction: column;
      gap: 2px;
      opacity: 0;
      transform: translateY(-4px);
      transition: all 0.3s ease;

      .action-btn {
        width: 22px; // 从 24px 改为 22px
        height: 22px;
        min-height: 22px;
        padding: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.9);
        backdrop-filter: blur(4px);
        border: 1px solid rgba(0, 0, 0, 0.1);

        .el-icon {
          font-size: 10px; // 从 11px 改为 10px
        }

        &:hover {
          transform: scale(1.1);
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
        }
      }

      .recover-btn {
        width: auto;
        height: 18px; // 从 20px 改为 18px
        min-height: 18px;
        padding: 0 6px; // 从 8px 改为 6px
        font-size: 9px; // 从 10px 改为 9px
        border-radius: 9px; // 从 10px 改为 9px
        font-weight: 500;
      }
    }

    &:hover .account-actions {
      opacity: 1;
      transform: translateY(0);
    }
    &.clickable {
      cursor: pointer;
      
      &:hover {
        transform: translateY(-2px);
        box-shadow: $shadow-lg;
        border: 1px solid $primary;
      }
    }
  }

  .account-status {
    display: flex;
    align-items: center;
    gap: $space-xs; // 从 $space-sm 改为 $space-xs

    .status-dot {
      width: 8px; // 从 10px 改为 8px
      height: 8px;
      border-radius: 50%;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);

      &.online {
        background-color: $success;
      }

      &.offline {
        background-color: $danger;
      }
    }

    .status-text {
      font-size: 12px; // 从 14px 改为 12px
      color: $text-secondary;
    }
  }
}

// 空状态
.empty-state {
  background: $bg-white;
  border-radius: $radius-xl;
  padding: $space-2xl;
  text-align: center;
  box-shadow: $shadow-sm;

  .empty-content {
    max-width: 400px;
    margin: 0 auto;

    .empty-icon {
      width: 80px;
      height: 80px;
      border-radius: 50%;
      background: linear-gradient(135deg, $bg-gray 0%, #e2e8f0 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto $space-lg;

      .el-icon {
        font-size: 32px;
        color: $text-muted;
      }
    }

    .empty-title {
      font-size: 20px;
      font-weight: 600;
      color: $text-primary;
      margin: 0 0 $space-sm 0;
    }

    .empty-description {
      font-size: 14px;
      color: $text-secondary;
      line-height: 1.5;
      margin: 0 0 $space-lg 0;
    }
  }
}

// 对话框样式
.account-dialog {
  .dialog-content {
    padding: $space-md 0;

    .platform-select {
      .platform-option {
        display: flex;
        align-items: center;
        gap: $space-sm;

        .platform-icon {
          font-size: 16px;

          &.douyin {
            color: $platform-douyin;
          }
          &.kuaishou {
            color: $platform-kuaishou;
          }
          &.wechat {
            color: $platform-wechat;
          }
          &.xiaohongshu {
            color: $platform-xiaohongshu;
          }
        }
      }
    }

    .qrcode-container {
      margin-top: $space-lg;
      text-align: center;

      .qrcode-wrapper {
        .qrcode-header {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: $space-sm;
          margin-bottom: $space-md;
          font-weight: 600;
          color: $text-primary;
        }

        .qrcode-tip {
          color: $text-secondary;
          margin-bottom: $space-md;
        }

        .qrcode-frame {
          background: $bg-gray;
          border-radius: $radius-lg;
          padding: $space-lg;
          display: inline-block;

          .qrcode-image {
            width: 200px;
            height: 200px;
            border-radius: $radius-md;
          }
        }
      }

      .loading-wrapper,
      .success-wrapper,
      .error-wrapper {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: $space-md;
        padding: $space-2xl;

        .loading-icon,
        .success-icon,
        .error-icon {
          font-size: 48px;
        }

        .loading-icon {
          color: $primary;
          animation: rotate 1s linear infinite;
        }

        .success-icon {
          color: $success;
        }

        .error-icon {
          color: $danger;
        }

        .loading-text,
        .success-text,
        .error-text {
          font-size: 16px;
          font-weight: 500;
        }
      }
    }
  }

  .dialog-footer {
    display: flex;
    justify-content: flex-end;
    gap: $space-sm;
    padding-top: $space-md;
  }
}

// 动画
@keyframes rotate {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
// 下拉菜单样式
:deep(.el-dropdown-menu) {
  .el-dropdown-menu__item {
    display: flex;
    align-items: center;
    gap: $space-sm;

    .el-icon {
      font-size: 14px;
    }
  }

  .danger-item {
    color: $danger;

    .el-icon {
      color: $danger;
    }

    &:hover {
      background-color: rgba(239, 68, 68, 0.1);
    }
  }
}

// 分组设置对话框样式
.group-set-dialog {
  .group-set-content {
    .account-info {
      background: $bg-gray;
      padding: $space-sm $space-md;
      border-radius: $radius-md;
      margin-bottom: $space-md;
      color: $text-secondary;
      font-size: 14px;
      margin: 0 0 $space-lg 0;
    }
  }

  .dialog-footer {
    display: flex;
    justify-content: flex-end;
    gap: $space-sm;
    padding-top: $space-md;
  }
}
// 响应式
@media (max-width: 768px) {
  .page-header .header-content {
    flex-direction: column;
    align-items: stretch;
    gap: $space-md;
  }

  .filter-toolbar {
    flex-direction: column;
    align-items: stretch;

    .filter-left {
      flex-direction: column;
      align-items: stretch;

      .filter-group {
        flex-direction: column;

        .filter-select {
          width: 100%;
        }
      }

      .search-box .search-input {
        width: 100%;
      }
    }

    .filter-right {
      justify-content: center;
    }
  }

  .stats-grid {
    grid-template-columns: 1fr !important;
  }

  .accounts-grid {
    grid-template-columns: 1fr !important;
  }
}
.platform-selection {
  .platform-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 20px;
    margin-bottom: 24px;
  }

  .platform-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 24px;
    border-radius: 12px;
    border: 2px solid transparent;
    cursor: pointer;
    transition: all 0.3s ease;
    background: #f8fafc;

    &:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
      border-color: #5b73de;
    }

    .platform-logo {
      width: 64px;
      height: 64px;
      margin-bottom: 12px;

      img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        border-radius: 8px;
      }
    }

    .platform-name {
      font-size: 16px;
      font-weight: 600;
      color: $text-primary;
    }
  }

  .platform-tip {
    text-align: center;

    p {
      color: $text-secondary;
      margin: 0;
    }
  }
}

.qrcode-step {
  .step-header {
    margin-bottom: 16px;

    .back-btn {
      display: flex;
      align-items: center;
      gap: 4px;
      color: $text-secondary;
    }
  }

  .selected-platform {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 24px;
    padding: 12px;
    background: $bg-light;
    border-radius: 8px;

    img {
      width: 32px;
      height: 32px;
      border-radius: 4px;
    }

    span {
      font-size: 16px;
      font-weight: 600;
      color: $text-primary;
    }
  }
}

// 分组管理专用样式
.groups-content {
  .groups-stats {
    margin-bottom: $space-lg;

    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: $space-md;

      .stat-card {
        background: $bg-white;
        border-radius: $radius-lg;
        padding: $space-lg;
        display: flex;
        align-items: center;
        gap: $space-md;
        box-shadow: $shadow-sm;
        transition: all 0.3s ease;

        &:hover {
          transform: translateY(-2px);
          box-shadow: $shadow-md;
        }

        .stat-icon {
          width: 48px;
          height: 48px;
          border-radius: $radius-lg;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;

          .el-icon {
            font-size: 24px;
            color: white;
          }

          &.total {
            background: linear-gradient(135deg, $primary 0%, #8b9ee8 100%);
          }

          &.normal {
            background: linear-gradient(135deg, $success 0%, #34d399 100%);
          }

          &.abnormal {
            background: linear-gradient(135deg, $info 0%, #9ca3af 100%);
          }
        }

        .stat-content {
          .stat-number {
            font-size: 24px;
            font-weight: 700;
            color: $text-primary;
            line-height: 1.2;
          }

          .stat-label {
            font-size: 14px;
            color: $text-secondary;
            margin-top: $space-xs;
          }
        }
      }
    }
  }

  // 平台分组区域
  .platform-groups-section {
    margin-bottom: $space-xl;

    .section-header {
      margin-bottom: $space-md;

      h4 {
        font-size: 16px;
        font-weight: 600;
        color: $text-primary;
        margin: 0 0 $space-xs 0;
      }

      p {
        font-size: 14px;
        color: $text-secondary;
        margin: 0;
      }
    }
  }

  // 分隔线
  .section-divider {
    text-align: center;
    margin: $space-xl 0;
    position: relative;

    &::before {
      content: "";
      position: absolute;
      top: 50%;
      left: 0;
      right: 0;
      height: 1px;
      background-color: $border-light;
    }

    span {
      background-color: $bg-light;
      padding: 0 $space-md;
      color: $text-primary;
      font-size: 14px;
      font-weight: 500;
    }
  }

  // 🔥 修正分组列表布局
  .groups-list {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
    gap: $space-lg;
    align-items: start; // 让卡片顶部对齐

    .group-card {
      background: $bg-white;
      border-radius: $radius-xl;
      padding: $space-lg;
      box-shadow: $shadow-sm;
      transition: all 0.3s ease;
      border: 2px solid transparent;
      height: auto; // 让高度自适应内容
      min-height: 200px; // 设置最小高度

      &:hover {
        transform: translateY(-2px);
        box-shadow: $shadow-md;
      }

      // 平台分组样式
      &.platform-group {
        border-left: 3px solid $primary;
      }

      // 未分组样式
      &.ungrouped {
        border: 2px dashed $border-light;
        background: $bg-gray;

        .group-icon {
          background: $text-muted !important;
        }
      }

      // 自定义分组样式
      &.custom-group {
        &.drag-over {
          border-color: $primary;
          background-color: rgba(91, 115, 222, 0.05);
        }
      }

      .group-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        margin-bottom: $space-md;

        .group-info {
          display: flex;
          align-items: center;
          gap: $space-md;
          flex: 1;

          .group-icon {
            width: 48px;
            height: 48px;
            border-radius: $radius-lg;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;

            .el-icon {
              font-size: 24px;
              color: white;
            }

            &.platform-logo-container {
              background: transparent;

              img {
                width: 48px;
                height: 48px;
                border-radius: $radius-lg;
                object-fit: cover;
              }
            }
          }

          .group-details {
            flex: 1;
            min-width: 0;

            .group-name {
              font-size: 18px;
              font-weight: 600;
              color: $text-primary;
              margin: 0 0 $space-xs 0;
              line-height: 1.2;
            }

            .group-description {
              font-size: 14px;
              color: $text-secondary;
              margin: 0;
              line-height: 1.4;
            }
          }
        }

        .group-actions {
          display: flex;
          gap: $space-xs;
          opacity: 0;
          transition: opacity 0.3s ease;

          .el-button {
            width: 32px;
            height: 32px;
            border-radius: 50%;
            padding: 0;
          }
        }
      }

      &:hover .group-actions {
        opacity: 1;
      }

      // 🔥 修正账号展示区域
      .group-accounts,
      .platform-accounts {
        max-height: 300px;
        overflow-y: auto;

        .group-account-item,
        .platform-account-item {
          display: flex;
          align-items: center;
          gap: $space-sm;
          padding: $space-sm;
          border-radius: $radius-md;
          transition: all 0.3s ease;
          margin-bottom: $space-xs;

          &:hover {
            background-color: $bg-light;
          }

          &:last-child {
            margin-bottom: 0;
          }

          .account-avatar-container {
            position: relative;
            flex-shrink: 0;

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
              border: 1px solid white;

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
          }

          .account-info {
            flex: 1;
            min-width: 0;

            .account-name {
              font-size: 14px;
              font-weight: 500;
              color: $text-primary;
              margin-bottom: 2px;
              overflow: hidden;
              text-overflow: ellipsis;
              white-space: nowrap;
              display: block;
              line-height: 1.2;
            }

            .account-platform {
              font-size: 12px;
              color: $text-secondary;
              line-height: 1.2;
            }

            .account-status {
              font-size: 12px;
              line-height: 1.2;

              &.status-normal {
                color: $success;
              }

              &.status-error {
                color: $danger;
              }
            }
          }

          .remove-btn {
            opacity: 0;
            transition: opacity 0.3s ease;
            width: 24px;
            height: 24px;
            min-height: 24px;
            padding: 0;
            border-radius: 50%;

            .el-icon {
              font-size: 12px;
            }
          }

          &:hover .remove-btn {
            opacity: 1;
          }
        }

        .group-account-item {
          cursor: grab;

          &:active {
            cursor: grabbing;
          }
        }
      }

      .group-empty {
        padding: $space-lg;
        text-align: center;
        color: $text-muted;
        font-size: 14px;
        border: 2px dashed $border-light;
        border-radius: $radius-md;
        background-color: $bg-light;
      }
    }
  }
}

// 标签页样式优化

.tabs-container {
  .simple-tabs {
    margin-bottom: $space-lg;

    .tabs-header {
      display: flex;
      align-items: center;
      background: transparent;
      padding: 0;

      .tab-item {
        padding: 12px 20px;
        margin-right: 8px;
        font-size: 14px;
        font-weight: 500;
        color: #9ca3af;
        cursor: pointer;
        transition: all 0.3s ease;
        position: relative;
        background: transparent;
        border: none;
        border-radius: 6px 6px 0 0;

        &:hover {
          color: $text-primary;
          background-color: rgba(91, 115, 222, 0.05);
        }

        &.active {
          color: $primary;
          background-color: $bg-white;
          border-bottom: 2px solid $primary;
          box-shadow: 0 -1px 0 0 $border-light, 1px 0 0 0 $border-light,
            -1px 0 0 0 $border-light;
        }
      }
    }
  }

  .tab-content {
    background: $bg-white;
    border-radius: 0 8px 8px 8px;
    padding: $space-lg;
    box-shadow: $shadow-sm;
  }
}
</style>
