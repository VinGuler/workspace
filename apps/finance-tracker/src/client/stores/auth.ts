import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import router from '@/router';
import { api } from '@/composables/useApi';
import type { User } from '@/types';

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null);
  const isChecked = ref(false);
  const loading = ref(false);
  const error = ref<string | null>(null);

  const isAuthenticated = computed(() => !!user.value);

  async function checkSession() {
    if (isChecked.value) return;
    loading.value = true;
    error.value = null;

    const result = await api<User>('/api/auth/me');

    if (result.success && result.data) {
      user.value = result.data;
    } else {
      user.value = null;
    }

    isChecked.value = true;
    loading.value = false;
  }

  async function login(username: string, password: string) {
    loading.value = true;
    error.value = null;

    const result = await api<User>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });

    if (result.success && result.data) {
      user.value = result.data;
      await router.push('/');
    } else {
      error.value = result.error || 'Login failed';
    }

    loading.value = false;
  }

  async function register(username: string, displayName: string, password: string) {
    loading.value = true;
    error.value = null;

    const result = await api<User>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username, displayName, password }),
    });

    if (result.success && result.data) {
      user.value = result.data;
      await router.push('/');
    } else {
      error.value = result.error || 'Registration failed';
    }

    loading.value = false;
  }

  async function logout() {
    loading.value = true;
    error.value = null;

    await api('/api/auth/logout', { method: 'POST' });

    user.value = null;
    loading.value = false;
    await router.push('/login');
  }

  async function resetPassword(username: string, newPassword: string): Promise<boolean> {
    loading.value = true;
    error.value = null;

    const result = await api('/api/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ username, newPassword }),
    });

    if (!result.success) {
      error.value = result.error || 'Password reset failed';
      loading.value = false;
      return false;
    }

    loading.value = false;
    return true;
  }

  return {
    user,
    isChecked,
    loading,
    error,
    isAuthenticated,
    checkSession,
    login,
    register,
    logout,
    resetPassword,
  };
});
