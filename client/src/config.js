/**
 * 系统全局配置文件
 * 在此修改系统名称、标语等，可以统一更新整个系统的配置
 */

export const APP_CONFIG = {
  // 系统名称 - 主要在登录页、页面标题等处使用
  systemName: '上海煌祁流转系统',

  // 系统英文名称
  systemEnglishName: 'Shanghai HuangQi Ledger',

  // 系统简写
  systemAbbr: 'HQ Ledger',

  // 系统描述/标语
  systemDescription: '业务流转与结算中枢',

  // API 基础路径
  apiBaseUrl: '/api',

  // 前端监听端口
  devPort: 5173,

  // 后端服务端口
  serverPort: 3000,

  // 后端服务地址
  serverUrl: 'http://localhost:3000',

  // 登录页面配置
  login: {
    title: '上海煌祁流转系统',
    description: 'HQ Ledger - 业务流转与结算中枢'
  },

  // 页面标题后缀
  pageTitleSuffix: '上海煌祁流转系统',

  // 应用版本
  version: '1.0.0',

  // 开发者信息
  developer: 'Xuwu Team',

  // 公司信息
  company: {
    name: '上海煌祁',
    fullName: '上海煌祁有限公司',
    website: 'https://example.com'
  }
}

// 快速访问常用配置
export const APP_NAME = APP_CONFIG.systemName
export const APP_DESCRIPTION = APP_CONFIG.systemDescription
export const API_BASE_URL = APP_CONFIG.apiBaseUrl
export const SERVER_URL = APP_CONFIG.serverUrl

export default APP_CONFIG
