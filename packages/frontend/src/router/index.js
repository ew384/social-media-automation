import { createRouter, createWebHashHistory } from 'vue-router'
import Dashboard from '../views/Dashboard.vue'
import AccountManagement from '../views/AccountManagement.vue'
import MaterialManagement from '../views/MaterialManagement.vue'
import PublishRecords from '../views/PublishRecords.vue'  // 👈 新增导入
import About from '../views/About.vue'
import PrivateMessage from '@/views/private-message/PrivateMessage.vue'
const routes = [
  {
    path: '/',
    name: 'Dashboard',
    component: Dashboard
  },
  {
    path: '/account-management',
    name: 'AccountManagement',
    component: AccountManagement
  },
  {
    path: '/material-management',
    name: 'MaterialManagement',
    component: MaterialManagement
  },

  {
    path: '/publish-records',  // 👈 新增路由
    name: 'PublishRecords',
    component: PublishRecords
  },
  {
    path: '/about',
    name: 'About',
    component: About
  },
  {
    path: '/private-message',
    name: 'PrivateMessage',
    component: PrivateMessage,
    meta: {
      title: '私信管理',
      requiresAuth: true
    }
  }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

export default router