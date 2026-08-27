import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth.js'

import LoginView from '@/views/LoginView.vue'
import ResetPasswordView from '@/views/ResetPasswordView.vue'
import DashboardView from '@/views/DashboardView.vue'
import MembresView from '@/views/MembresView.vue'
import CotisationsView from '@/views/CotisationsView.vue'
import HistoriqueView from '@/views/HistoriqueView.vue'
import ConfigurationView from '@/views/ConfigurationView.vue'
import NotFoundView from '@/views/NotFoundView.vue' // 1. Import de la vue 404

const routes = [
  {
    path: '/login',
    name: 'login',
    component: LoginView,
    meta: { public: true }
  },
  {
    path: '/reset-password',
    name: 'reset-password',
    component: ResetPasswordView,
    meta: { public: true }
  },
  {
    path: '/',
    redirect: '/dashboard'
  },
  {
    path: '/dashboard',
    name: 'dashboard',
    component: DashboardView,
    meta: { requiresAuth: true }
  },
  {
    path: '/membres',
    name: 'membres',
    component: MembresView,
    meta: { requiresAuth: true, roles: ['ADMIN', 'SECRETAIRE', 'RESPONSABLE'] }
  },
  {
    path: '/saisie-cotisation',
    name: 'saisie-cotisation',
    component: CotisationsView,
    meta: { requiresAuth: true, roles: ['ADMIN', 'RESPONSABLE'] }
  },
  {
    path: '/historique',
    name: 'historique',
    component: HistoriqueView,
    meta: { requiresAuth: true }
  },
  {
    path: '/configuration',
    name: 'configuration',
    component: ConfigurationView,
    meta: { requiresAuth: true, roles: ['ADMIN'] }
  },
  // 2. MODIFICATION : Remplacement du redirect par le composant NotFoundView
  {
    path: '/:pathMatch(.*)*',
    name: 'not-found',
    component: NotFoundView,
    meta: { public: true } // Permet d'afficher la 404 même aux utilisateurs non connectés
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach((to, from, next) => {
  const auth = useAuthStore()

  // Restaurer la session si nécessaire
  if (!auth.isAuthenticated) {
    auth.restoreSession()
  }

  // Route publique : on laisse passer
  if (to.meta.public) {
    // Si l'utilisateur est déjà connecté et veut aller sur /login, on redirige vers dashboard
    if (auth.isAuthenticated && to.name === 'login') {
      return next('/dashboard')
    }
    return next()
  }

  // Route privée : vérifier l'authentification
  if (to.meta.requiresAuth && !auth.isAuthenticated) {
    return next('/login')
  }

  // Vérifier les rôles
  if (to.meta.roles && !to.meta.roles.includes(auth.role)) {
    return next('/dashboard')
  }

  next()
})

export default router
