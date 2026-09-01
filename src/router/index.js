import { createRouter, createWebHashHistory } from 'vue-router'
import Login from '../views/Login.vue'
// Dashboard 为默认首页，静态引入：首屏即加载，避免恢复前台时懒加载依赖网络
import Dashboard from '../views/Dashboard.vue'

const routes = [
  {
    path: '/login',
    name: 'login',
    component: Login,
    meta: { title: '登录' }
  },
  {
    path: '/',
    name: 'dashboard',
    component: Dashboard,
    meta: { title: '信息预览', icon: 'home' }
  },
  {
    path: '/research',
    name: 'research',
    component: () => import('../views/Research.vue'),
    meta: { title: '科研中心', icon: 'flask' }
  },
  {
    path: '/simulation',
    name: 'simulation',
    component: () => import('../views/Simulation.vue'),
    meta: { title: '仿真中心', icon: 'cpu' }
  },
  {
    path: '/papers',
    name: 'papers',
    component: () => import('../views/PaperCenter.vue'),
    meta: { title: '论文中心', icon: 'book-open' }
  },
  {
    path: '/plan',
    name: 'plan',
    component: () => import('../views/Plan.vue'),
    meta: { title: '计划中心', icon: 'calendar-check' }
  },
  {
    path: '/navigation',
    name: 'navigation',
    component: () => import('../views/Navigation.vue'),
    meta: { title: '科研导航', icon: 'compass' }
  },
  {
    path: '/points',
    name: 'points',
    component: () => import('../views/PointsCenter.vue'),
    meta: { title: '积分激励', icon: 'trophy' }
  },
  {
    path: '/profile',
    name: 'profile',
    component: () => import('../views/Profile.vue'),
    meta: { title: '个人信息', icon: 'user' }
  },
  {
    path: '/finance',
    name: 'finance',
    component: () => import('../views/Finance.vue'),
    meta: { title: '财务中心', icon: 'wallet' }
  },
  {
    path: '/settings',
    name: 'settings',
    component: () => import('../views/Settings.vue'),
    meta: { title: '平台设置', icon: 'settings' }
  }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

export default router
