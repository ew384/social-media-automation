import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useAccountStore = defineStore('account', () => {
  // 存储所有账号信息
  const accounts = ref([])

  // 新增：存储所有分组信息
  const groups = ref([])
  // 🔥 新增：防重复刷新控制
  const isRefreshing = ref(false)
  const lastRefreshTime = ref(0)
  // 平台类型映射
  const platformTypes = {
    1: '小红书',
    2: '视频号',
    3: '抖音',
    4: '快手'
  }

  // 设置账号列表
  const setAccounts = (accountsData) => {
    // 转换后端返回的数据格式为前端使用的格式
    accounts.value = accountsData.map(item => {
      return {
        ...item,
        avatar: item.avatar || '/vite.svg' // 确保有默认头像
      }
    })
  }

  // 新增：设置分组列表
  const setGroups = (groupsData) => {
    groups.value = groupsData || []
  }

  // 添加账号
  const addAccount = (account) => {
    accounts.value.push(account)
  }

  // 新增：添加分组
  const addGroup = (group) => {
    groups.value.push(group)
  }

  // 更新账号
  const updateAccount = (id, updatedAccount) => {
    const index = accounts.value.findIndex(acc => acc.id === id)
    if (index !== -1) {
      accounts.value[index] = { ...accounts.value[index], ...updatedAccount }
    }
  }

  // 新增：更新分组
  const updateGroup = (id, updatedGroup) => {
    const index = groups.value.findIndex(group => group.id === id)
    if (index !== -1) {
      groups.value[index] = { ...groups.value[index], ...updatedGroup }
    }
  }

  // 删除账号
  const deleteAccount = (id) => {
    accounts.value = accounts.value.filter(acc => acc.id !== id)
  }

  // 新增：删除分组
  const deleteGroup = (id) => {
    groups.value = groups.value.filter(group => group.id !== id)
    // 同时清除账号中对应的分组信息
    accounts.value.forEach(account => {
      if (account.group_id === id) {
        account.group_id = null
        account.group_name = null
        account.group_color = null
        account.group_icon = null
      }
    })
  }

  // 根据平台获取账号
  const getAccountsByPlatform = (platform) => {
    return accounts.value.filter(acc => acc.platform === platform)
  }

  // 新增：根据分组获取账号
  const getAccountsByGroup = (groupId) => {
    if (groupId === null || groupId === undefined) {
      // 返回未分组的账号
      return accounts.value.filter(acc => !acc.group_id)
    }
    return accounts.value.filter(acc => acc.group_id === groupId)
  }

  // 新增：获取分组信息
  const getGroupById = (groupId) => {
    return groups.value.find(group => group.id === groupId)
  }

  // 新增：更新账号分组
  const updateAccountGroup = (accountId, groupId, groupInfo = null) => {
    const account = accounts.value.find(acc => acc.id === accountId)
    if (account) {
      account.group_id = groupId
      if (groupInfo) {
        account.group_name = groupInfo.name
        account.group_color = groupInfo.color
        account.group_icon = groupInfo.icon
      } else if (groupId === null) {
        account.group_name = null
        account.group_color = null
        account.group_icon = null
      }
    }
  }
// 新增：加载账号数据的方法
const loadAccounts = async () => {
  try {
    // 动态导入避免循环依赖
    const { accountApi } = await import('@/api/account')
    
    // 获取账号数据（带分组信息）
    const res = await accountApi.getAccountsWithGroups()
    if (res && res.code === 200 && res.data) {
      setAccounts(res.data)
    }
    
    // 获取分组数据
    const groupsRes = await accountApi.getGroups()
    if (groupsRes && groupsRes.code === 200 && groupsRes.data) {
      setGroups(groupsRes.data)
    }
    
    console.log('✅ 账号数据加载成功')
  } catch (error) {
    console.error('加载账号数据失败:', error)
    // 如果带分组信息的API失败，降级使用普通API
    try {
      const { accountApi } = await import('@/api/account')
      const fallbackRes = await accountApi.getValidAccounts()
      if (fallbackRes && fallbackRes.code === 200 && fallbackRes.data) {
        setAccounts(fallbackRes.data)
        console.log('✅ 账号数据降级加载成功')
      }
    } catch (fallbackError) {
      console.error('降级加载也失败:', fallbackError)
      throw fallbackError
    }
  }
}
const smartRefresh = async (forceCheck = false) => {
  const now = Date.now();
  const minInterval = 2000; // 最小刷新间隔2秒
  
  // 防止频繁刷新
  if (isRefreshing.value || (now - lastRefreshTime.value < minInterval && !forceCheck)) {
    console.log('⏭️ 跳过重复刷新');
    return;
  }
  
  isRefreshing.value = true;
  lastRefreshTime.value = now;
  
  try {
    await loadAccounts(); // 使用现有的 loadAccounts 方法
  } finally {
    isRefreshing.value = false;
  }
};



return {
  accounts,
  setAccounts,
  addAccount,
  updateAccount,
  deleteAccount,
  getAccountsByPlatform,

  // 分组相关
  groups,
  setGroups,
  addGroup,
  updateGroup,
  deleteGroup,
  getAccountsByGroup,
  getGroupById,
  updateAccountGroup,
  
  // 加载方法
  loadAccounts,
  isRefreshing,
  smartRefresh
}
})