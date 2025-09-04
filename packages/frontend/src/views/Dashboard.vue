<template>
  <div class="dashboard">
    <!-- 数据概览 -->
    <div class="overview-section">
      <h2 class="section-title">数据概览</h2>
      <div class="stats-grid">
        <!-- 账号统计卡片 -->
        <div class="stat-card primary">
          <div class="stat-header">
            <div class="stat-content">
              <div class="stat-label">账号总数</div>
              <div class="stat-number">{{ accountStats.total }}</div>
            </div>
          </div>
          <div class="stat-footer">
            <div class="stat-detail">
              <span class="detail-item success">正常 {{ accountStats.normal }}</span>
              <span class="detail-item danger">异常 {{ accountStats.abnormal }}</span>
            </div>
          </div>
        </div>

        <!-- 发布统计卡片 -->
        <div class="stat-card success">
          <div class="stat-header">
            <div class="stat-content">
              <div class="stat-label">今日发布</div>
              <div class="stat-number">{{ publishStats.today }}</div>
            </div>
          </div>
          <div class="stat-footer">
            <div class="stat-detail">
              <span class="detail-item">本周 {{ publishStats.week }}</span>
              <span class="detail-item">本月 {{ publishStats.month }}</span>
            </div>
          </div>
        </div>

        <!-- 素材统计卡片 -->
        <div class="stat-card info">
          <div class="stat-header">
            <div class="stat-content">
              <div class="stat-label">素材总数</div>
              <div class="stat-number">{{ materialStats.total }}</div>
            </div>
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
import { ref, reactive,onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { accountApi } from '@/api/account'
import { 
  Upload, Folder, VideoCamera, User, VideoPlay, View, 
  FolderOpened, UserFilled, Picture, DataAnalysis,
  Top, Bottom, ArrowRight
} from '@element-plus/icons-vue'
onMounted(() => {
  fetchDashboardStats()
})
const router = useRouter()

const accountStats = reactive({
  total: 0,
  normal: 0,
  abnormal: 0
})

const publishStats = reactive({
  today: 0,
  week: 0,
  month: 0
})

const materialStats = reactive({
  total: 0,
  videos: 0,
  images: 0
})

const recentActivities = ref([])
const loading = ref(false)


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
const fetchDashboardStats = async () => {
  try {
    loading.value = true
    const response = await accountApi.getDashboardStats()
    
    if (response.code === 200) {
      const data = response.data
      
      // 更新账号统计
      Object.assign(accountStats, data.accounts)
      
      // 更新发布统计
      Object.assign(publishStats, data.publish)
      
      // 更新素材统计
      Object.assign(materialStats, data.materials)
      
      // 更新最近活动
      recentActivities.value = data.recentActivities || []
    }
  } catch (error) {
    console.error('获取仪表板数据失败:', error)
  } finally {
    loading.value = false
  }
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
  padding-bottom: $space-lg;
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: $space-lg;
  align-items: start;
}

// 通用样式
.section-title {
  font-size: 20px;
  font-weight: 700;
  color: $text-primary;
  margin: 0 0 $space-md 0;
}

// 数据概览
.overview-section {
  margin-bottom: 0;

  .stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: $space-md;

    .stat-card {
      background: $bg-white;
      border-radius: $radius-xl;
      padding: $space-md;
      box-shadow: $shadow-sm;
      transition: all 0.3s ease;
      position: relative;
      overflow: hidden;
      display: flex;
      flex-direction: column;

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
        transform: translateY(-2px);
        box-shadow: $shadow-lg;
      }

      .stat-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: $space-sm;

        .stat-icon {
          width: 20px;
          height: 20px;
          border-radius: $radius-lg;
          display: flex;
          align-items: center;
          justify-content: center;

          .el-icon {
            font-size: 16px;
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
        margin-bottom: $space-sm;

        .stat-number {
          font-size: 20px;
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
  margin-bottom: 0;

  .section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: $space-md;
  }

  .activities-container {
    background: $bg-white;
    border-radius: $radius-xl;
    padding: $space-md;
    box-shadow: $shadow-sm;

    .activity-timeline {
      position: relative;

      &::before {
        content: '';
        position: absolute;
        left: 8px;
        top: 8px;
        bottom: 8px;
        width: 2px;
        background: $border-light;
      }

      .activity-item {
        display: flex;
        align-items: flex-start;
        gap: $space-sm;
        padding-bottom: $space-md;
        position: relative;

        &:last-child {
          padding-bottom: 0;
        }

        .activity-dot {
          width: 16px;
          height: 16px;
          border-radius: 50%;
          border: 2px solid $bg-white;
          z-index: 2;
          position: relative;
          flex-shrink: 0;

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
          padding-top: 0;

          .activity-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: $space-xs;

            .activity-title {
              font-weight: 600;
              color: $text-primary;
              font-size: 14px;
            }

            .activity-time {
              font-size: 12px;
              color: $text-muted;
              flex-shrink: 0;
              margin-left: $space-sm;
            }
          }

          .activity-description {
            color: $text-secondary;
            font-size: 13px;
            line-height: 1.4;
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
  .dashboard {
    grid-template-columns: 1fr;
    padding-bottom: $space-xl;
  }

  .overview-section {
    margin-bottom: $space-lg;
  }

  .stats-grid {
    grid-template-columns: repeat(2, 1fr) !important;
    gap: $space-sm;
  }

  .stat-card {
    padding: $space-sm;
    
    .stat-content .stat-number {
      font-size: 18px;
    }
    
    .stat-header .stat-icon {
      width: 16px;
      height: 16px;
      
      .el-icon {
        font-size: 14px;
      }
    }
  }

  .section-title {
    font-size: 18px;
  }

  .activities-container {
    padding: $space-sm;

    .activity-timeline {
      &::before {
        left: 6px;
      }

      .activity-item {
        gap: $space-xs;
        padding-bottom: $space-sm;

        .activity-dot {
          width: 12px;
          height: 12px;
        }

        .activity-content {
          .activity-header {
            flex-direction: column;
            align-items: flex-start;
            gap: $space-xs;
            
            .activity-time {
              margin-left: 0;
            }
          }
          
          .activity-title {
            font-size: 13px;
          }
          
          .activity-description {
            font-size: 12px;
          }
        }
      }
    }
  }

  .platform-grid {
    grid-template-columns: 1fr !important;
  }
}

@media (min-width: 769px) and (max-width: 1024px) {
  .dashboard {
    grid-template-columns: 1fr;
  }
  
  .overview-section {
    margin-bottom: $space-lg;
  }
}
</style>