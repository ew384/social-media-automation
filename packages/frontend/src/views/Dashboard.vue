<template>
  <div class="dashboard">

    <!-- 数据概览 -->
    <div class="overview-section">
      <h2 class="section-title">数据概览</h2>
      <div class="stats-grid">
        <div class="stat-card primary">
          <div class="stat-header">
            <div class="stat-icon">
              <el-icon><User /></el-icon>
            </div>
            <div class="stat-trend up">
              <el-icon><Top /></el-icon>
              <span>+12%</span>
            </div>
          </div>
          <div class="stat-content">
            <div class="stat-number">{{ accountStats.total }}</div>
            <div class="stat-label">账号总数</div>
          </div>
          <div class="stat-footer">
            <div class="stat-detail">
              <span class="detail-item success">正常 {{ accountStats.normal }}</span>
              <span class="detail-item danger">异常 {{ accountStats.abnormal }}</span>
            </div>
          </div>
        </div>

        <div class="stat-card success">
          <div class="stat-header">
            <div class="stat-icon">
              <el-icon><VideoPlay /></el-icon>
            </div>
            <div class="stat-trend up">
              <el-icon><Top /></el-icon>
              <span>+8%</span>
            </div>
          </div>
          <div class="stat-content">
            <div class="stat-number">{{ publishStats.today }}</div>
            <div class="stat-label">今日发布</div>
          </div>
          <div class="stat-footer">
            <div class="stat-detail">
              <span class="detail-item">本周 {{ publishStats.week }}</span>
              <span class="detail-item">本月 {{ publishStats.month }}</span>
            </div>
          </div>
        </div>

        <div class="stat-card warning">
          <div class="stat-header">
            <div class="stat-icon">
              <el-icon><View /></el-icon>
            </div>
            <div class="stat-trend up">
              <el-icon><Top /></el-icon>
              <span>+24%</span>
            </div>
          </div>
          <div class="stat-content">
            <div class="stat-number">{{ viewStats.total }}</div>
            <div class="stat-label">总播放量</div>
          </div>
          <div class="stat-footer">
            <div class="stat-detail">
              <span class="detail-item">今日 {{ viewStats.today }}</span>
              <span class="detail-item">昨日 {{ viewStats.yesterday }}</span>
            </div>
          </div>
        </div>

        <div class="stat-card info">
          <div class="stat-header">
            <div class="stat-icon">
              <el-icon><FolderOpened /></el-icon>
            </div>
            <div class="stat-trend down">
              <el-icon><Bottom /></el-icon>
              <span>-2%</span>
            </div>
          </div>
          <div class="stat-content">
            <div class="stat-number">{{ materialStats.total }}</div>
            <div class="stat-label">素材总数</div>
          </div>
          <div class="stat-footer">
            <div class="stat-detail">
              <span class="detail-item">视频 {{ materialStats.videos }}</span>
              <span class="detail-item">图片 {{ materialStats.images }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>


    <!-- 最近活动 -->
    <div class="recent-activities-section">
      <div class="section-header">
        <h2 class="section-title">最近活动</h2>
        <el-button text @click="viewAllActivities">查看全部</el-button>
      </div>
      
      <div class="activities-container">
        <div class="activity-timeline">
          <div 
            v-for="(activity, index) in recentActivities" 
            :key="index"
            class="activity-item"
          >
            <div :class="['activity-dot', activity.type]"></div>
            <div class="activity-content">
              <div class="activity-header">
                <span class="activity-title">{{ activity.title }}</span>
                <span class="activity-time">{{ activity.time }}</span>
              </div>
              <div class="activity-description">{{ activity.description }}</div>
              <div v-if="activity.platforms" class="activity-platforms">
                <el-tag
                  v-for="platform in activity.platforms"
                  :key="platform"
                  size="small"
                  :type="getPlatformTagType(platform)"
                  effect="light"
                >
                  {{ platform }}
                </el-tag>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>


  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { 
  Upload, Folder, VideoCamera, User, VideoPlay, View, 
  FolderOpened, UserFilled, Picture, DataAnalysis,
  Top, Bottom, ArrowRight
} from '@element-plus/icons-vue'

const router = useRouter()

// 统计数据
const accountStats = reactive({
  total: 12,
  normal: 10,
  abnormal: 2
})

const publishStats = reactive({
  today: 8,
  week: 42,
  month: 186
})

const viewStats = reactive({
  total: '2.4万',
  today: '1.2k',
  yesterday: '980'
})

const materialStats = reactive({
  total: 156,
  videos: 89,
  images: 67
})

// 最近活动
const recentActivities = ref([
  {
    type: 'success',
    title: '视频发布成功',
    description: '《春日美食制作教程》已成功发布到 3 个平台',
    platforms: ['抖音', '快手', '小红书'],
    time: '2 分钟前'
  },
  {
    type: 'primary',
    title: '新增账号',
    description: '成功添加抖音账号"美食小达人"',
    time: '1 小时前'
  },
  {
    type: 'warning',
    title: '上传素材',
    description: '批量上传了 5 个视频素材到素材库',
    time: '3 小时前'
  },
  {
    type: 'info',
    title: '数据同步',
    description: '完成了账号数据的自动同步',
    time: '6 小时前'
  },
  {
    type: 'success',
    title: '定时发布',
    description: '《健康生活小贴士》已按计划发布',
    platforms: ['视频号'],
    time: '昨天 18:00'
  }
])

// 平台状态
const platformStatus = ref([
  {
    name: '抖音',
    icon: 'VideoCamera',
    class: 'douyin',
    status: 'online',
    statusText: '正常',
    accounts: 4,
    todayPosts: 3
  },
  {
    name: '快手',
    icon: 'PlayTwo', 
    class: 'kuaishou',
    status: 'online',
    statusText: '正常',
    accounts: 3,
    todayPosts: 2
  },
  {
    name: '视频号',
    icon: 'MessageBox',
    class: 'wechat', 
    status: 'warning',
    statusText: '部分异常',
    accounts: 2,
    todayPosts: 1
  },
  {
    name: '小红书',
    icon: 'Notebook',
    class: 'xiaohongshu',
    status: 'online',
    statusText: '正常', 
    accounts: 3,
    todayPosts: 2
  }
])

// 方法
const navigateTo = (path) => {
  router.push(path)
}

const viewAllActivities = () => {
  // 查看所有活动
}

const managePlatform = (platform) => {
  router.push('/account-management')
}

const getPlatformTagType = (platform) => {
  const typeMap = {
    '抖音': 'danger',
    '快手': 'warning', 
    '视频号': 'success',
    '小红书': 'primary'
  }
  return typeMap[platform] || 'info'
}
</script>

<style lang="scss" scoped>
// 变量定义
$primary: #5B73DE;
$success: #10B981;
$warning: #F59E0B;
$danger: #EF4444;
$info: #6B7280;

$platform-douyin: #FE2C55;
$platform-kuaishou: #FF6600;
$platform-xiaohongshu: #FF2442;
$platform-wechat: #07C160;

$bg-light: #F8FAFC;
$bg-white: #FFFFFF;
$bg-gray: #F1F5F9;

$text-primary: #1E293B;
$text-secondary: #64748B;
$text-muted: #94A3B8;

$border-light: #E2E8F0;
$shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
$shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
$shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);

$radius-sm: 4px;
$radius-md: 8px;
$radius-lg: 12px;
$radius-xl: 16px;
$radius-2xl: 24px;

$space-xs: 4px;
$space-sm: 8px;
$space-md: 16px;
$space-lg: 24px;
$space-xl: 32px;
$space-2xl: 48px;

.dashboard {
  max-width: 1200px;
  margin: 0 auto;
  padding-bottom: $space-2xl;
}

// 通用样式
.section-title {
  font-size: 24px;
  font-weight: 700;
  color: $text-primary;
  margin: 0 0 $space-lg 0;
}

// 数据概览
.overview-section {
  margin-bottom: $space-2xl;

  .stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
    gap: $space-lg;

    .stat-card {
      background: $bg-white;
      border-radius: $radius-xl;
      padding: $space-lg;
      box-shadow: $shadow-sm;
      transition: all 0.3s ease;
      position: relative;
      overflow: hidden;

      &::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        height: 4px;
        border-radius: $radius-xl $radius-xl 0 0;
      }

      &.primary::before {
        background: linear-gradient(90deg, $primary 0%, #8B9EE8 100%);
      }

      &.success::before {
        background: linear-gradient(90deg, $success 0%, #4e34d3 100%);
      }

      &.warning::before {
        background: linear-gradient(90deg, $warning 0%, #2724fb 100%);
      }

      &.info::before {
        background: linear-gradient(90deg, $info 0%, #26147c 100%);
      }

      &:hover {
        transform: translateY(-4px);
        box-shadow: $shadow-lg;
      }

      .stat-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: $space-md;

        .stat-icon {
          width: 28px;
          height: 28px;
          border-radius: $radius-lg;
          display: flex;
          align-items: center;
          justify-content: center;

          .el-icon {
            font-size: 24px;
            color: white;
          }
        }

        .stat-trend {
          display: flex;
          align-items: center;
          gap: $space-xs;
          font-size: 12px;
          font-weight: 600;
          padding: $space-xs $space-sm;
          border-radius: $radius-md;

          &.up {
            color: $success;
            background: rgba(16, 185, 129, 0.1);
          }

          &.down {
            color: $danger;
            background: rgba(239, 68, 68, 0.1);
          }

          .el-icon {
            font-size: 14px;
          }
        }
      }

      &.primary .stat-header .stat-icon {
        background: linear-gradient(135deg, $primary 0%, #8B9EE8 100%);
      }

      &.success .stat-header .stat-icon {
        background: linear-gradient(135deg, $success 0%, #34D399 100%);
      }

      &.warning .stat-header .stat-icon {
        background: linear-gradient(135deg, $warning 0%, #FBBF24 100%);
      }

      &.info .stat-header .stat-icon {
        background: linear-gradient(135deg, $info 0%, #9CA3AF 100%);
      }

      .stat-content {
        margin-bottom: $space-md;

        .stat-number {
          font-size: 28px;
          font-weight: 800;
          color: $text-primary;
          line-height: 1.2;
        }

        .stat-label {
          font-size: 14px;
          color: $text-secondary;
          margin-top: $space-xs;
        }
      }

      .stat-footer {
        .stat-detail {
          display: flex;
          justify-content: space-between;
          color: $text-secondary;
          font-size: 12px;

          .detail-item {
            &.success {
              color: $success;
            }

            &.danger {
              color: $danger;
            }
          }
        }
      }
    }
  }
}


// 最近活动
.recent-activities-section {
  margin-bottom: $space-2xl;

  .section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: $space-lg;
  }

  .activities-container {
    background: $bg-white;
    border-radius: $radius-xl;
    padding: $space-lg;
    box-shadow: $shadow-sm;

    .activity-timeline {
      position: relative;

      &::before {
        content: '';
        position: absolute;
        left: 12px;
        top: 12px;
        bottom: 12px;
        width: 2px;
        background: $border-light;
      }

      .activity-item {
        display: flex;
        align-items: flex-start;
        gap: $space-md;
        padding-bottom: $space-lg;
        position: relative;

        &:last-child {
          padding-bottom: 0;
        }

        .activity-dot {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          border: 3px solid $bg-white;
          z-index: 2;
          position: relative;

          &.success {
            background: $success;
          }

          &.primary {
            background: $primary;
          }

          &.warning {
            background: $warning;
          }

          &.info {
            background: $info;
          }
        }

        .activity-content {
          flex: 1;
          padding-top: 2px;

          .activity-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: $space-xs;

            .activity-title {
              font-weight: 600;
              color: $text-primary;
            }

            .activity-time {
              font-size: 12px;
              color: $text-muted;
            }
          }

          .activity-description {
            color: $text-secondary;
            font-size: 14px;
            line-height: 1.5;
            margin-bottom: $space-sm;
          }

          .activity-platforms {
            display: flex;
            gap: $space-xs;
            flex-wrap: wrap;
          }
        }
      }
    }
  }
}

// 平台状态
.platform-status-section {
  .platform-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: $space-lg;

    .platform-card {
      background: $bg-white;
      border-radius: $radius-xl;
      padding: $space-lg;
      box-shadow: $shadow-sm;
      transition: all 0.3s ease;
      border-left: 4px solid transparent;

      &:hover {
        transform: translateY(-2px);
        box-shadow: $shadow-md;
      }

      &.online {
        border-left-color: $success;
      }

      &.warning {
        border-left-color: $warning;
      }

      &.offline {
        border-left-color: $danger;
      }

      .platform-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: $space-md;

        .platform-icon {
          width: 40px;
          height: 40px;
          border-radius: $radius-lg;
          display: flex;
          align-items: center;
          justify-content: center;

          .el-icon {
            font-size: 20px;
            color: white;
          }

          &.douyin {
            background: linear-gradient(135deg, $platform-douyin 0%, #FF6B8A 100%);
          }

          &.kuaishou {
            background: linear-gradient(135deg, $platform-kuaishou 0%, #FF8533 100%);
          }

          &.wechat {
            background: linear-gradient(135deg, $platform-wechat 0%, #3DD68C 100%);
          }

          &.xiaohongshu {
            background: linear-gradient(135deg, $platform-xiaohongshu 0%, #FF5B75 100%);
          }
        }

        .platform-status {
          display: flex;
          align-items: center;
          gap: $space-xs;
          font-size: 12px;
          font-weight: 500;

          .status-dot {
            width: 8px;
            height: 8px;
            border-radius: 50%;
          }

          &.online {
            color: $success;

            .status-dot {
              background: $success;
            }
          }

          &.warning {
            color: $warning;

            .status-dot {
              background: $warning;
            }
          }

          &.offline {
            color: $danger;

            .status-dot {
              background: $danger;
            }
          }
        }
      }

      .platform-content {
        margin-bottom: $space-lg;

        .platform-name {
          font-size: 18px;
          font-weight: 600;
          color: $text-primary;
          margin: 0 0 $space-md 0;
        }

        .platform-stats {
          display: flex;
          justify-content: space-between;

          .stat-item {
            text-align: center;

            .stat-label {
              display: block;
              font-size: 12px;
              color: $text-secondary;
              margin-bottom: $space-xs;
            }

            .stat-value {
              display: block;
              font-size: 18px;
              font-weight: 700;
              color: $text-primary;
            }
          }
        }
      }

      .platform-actions {
        text-align: center;
      }
    }
  }
}

// 响应式设计
@media (max-width: 768px) {
  .welcome-section {
    flex-direction: column;
    text-align: center;
    gap: $space-lg;
    padding: $space-lg;

    .welcome-content .welcome-actions {
      flex-direction: column;
    }

    .welcome-illustration {
      order: -1;

      .illustration-bg {
        width: 80px;
        height: 80px;

        .illustration-icon {
          font-size: 32px;
        }
      }
    }
  }

  .stats-grid {
    grid-template-columns: 1fr !important;
  }

  .actions-grid {
    grid-template-columns: 1fr !important;
  }

  .platform-grid {
    grid-template-columns: 1fr !important;
  }

  .activities-container {
    padding: $space-md;

    .activity-timeline {
      &::before {
        left: 8px;
      }

      .activity-item {
        .activity-dot {
          width: 16px;
          height: 16px;
          border-width: 2px;
        }

        .activity-content {
          .activity-header {
            flex-direction: column;
            align-items: flex-start;
            gap: $space-xs;
          }
        }
      }
    }
  }
}
</style>