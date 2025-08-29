import { http } from '@/utils/request'

// 账号管理相关API
export const accountApi = {
  getValidAccounts(forceCheck = false) {
    return this.getAccountsWithGroups(forceCheck);
  },

  getAccountsWithGroups(forceCheck = false) {
    const params = forceCheck ? '?force=true' : '';
    return http.get(`/getAccountsWithGroups${params}`)
  },

  getGroups() {
    return http.get('/getGroups')
  },

  createGroup(data) {
    return http.post('/createGroup', data)
  },

  updateGroup(data) {
    return http.post('/updateGroup', data)
  },

  deleteGroup(id) {
    return http.get(`/deleteGroup?id=${id}`)
  },

  updateAccountGroup(data) {
    return http.post('/updateAccountGroup', data)
  },
  validateAccount(data) {
    return http.post('/validateAccount', data)
  },
  addAccount(data) {
    return http.post('/account', data)
  },

  updateAccount(data) {
    return http.post('/updateUserinfo', data)
  },

  deleteAccount(id) {
    return http.get(`/deleteAccount?id=${id}`)
  }
}