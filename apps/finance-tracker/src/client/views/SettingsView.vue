<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { api } from '@/composables/useApi';

const { t } = useI18n();

const maskedEmail = ref<string | null>(null);
const emailLoading = ref(false);

const showEmailForm = ref(false);
const newEmail = ref('');
const currentPassword = ref('');
const emailError = ref<string | null>(null);
const emailSuccess = ref(false);

async function loadEmail() {
  emailLoading.value = true;
  const result = await api<{ maskedEmail: string }>('/api/user/me/email');
  if (result.success && result.data) {
    maskedEmail.value = result.data.maskedEmail;
  }
  emailLoading.value = false;
}

async function handleEmailUpdate() {
  emailError.value = null;
  emailSuccess.value = false;

  const result = await api<{ maskedEmail: string }>('/api/user/email', {
    method: 'PUT',
    body: JSON.stringify({ currentPassword: currentPassword.value, newEmail: newEmail.value }),
  });

  if (result.success && result.data) {
    maskedEmail.value = result.data.maskedEmail;
    emailSuccess.value = true;
    showEmailForm.value = false;
    newEmail.value = '';
    currentPassword.value = '';
  } else {
    emailError.value = result.error || t('settings.updateError');
  }
}

onMounted(() => {
  loadEmail();
});
</script>

<template>
  <div class="max-w-lg mx-auto px-4 py-8">
    <h1 class="text-2xl font-bold text-slate-100 mb-8">{{ t('settings.title') }}</h1>

    <!-- Email Section -->
    <div class="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
      <h2 class="text-lg font-semibold text-slate-200">{{ t('settings.emailSection') }}</h2>

      <div class="flex items-center justify-between">
        <div>
          <p class="text-xs text-slate-500 mb-1">{{ t('settings.maskedEmail') }}</p>
          <p class="text-slate-300 font-mono text-sm">
            {{ emailLoading ? t('settings.loadingEmail') : (maskedEmail ?? '—') }}
          </p>
        </div>
        <button
          class="text-sm font-medium text-violet-400 hover:text-violet-300 transition-colors"
          @click="showEmailForm = !showEmailForm"
        >
          {{ t('settings.updateEmail') }}
        </button>
      </div>

      <div
        v-if="emailSuccess"
        class="p-3 bg-emerald-900/30 border border-emerald-700/50 rounded-lg"
      >
        <p class="text-emerald-400 text-sm">{{ t('settings.emailUpdated') }}</p>
      </div>

      <form
        v-if="showEmailForm"
        class="space-y-3 pt-2 border-t border-slate-800"
        @submit.prevent="handleEmailUpdate"
      >
        <div>
          <label for="newEmail" class="block text-sm font-medium text-slate-300 mb-1">{{
            t('settings.newEmail')
          }}</label>
          <input
            id="newEmail"
            v-model="newEmail"
            type="email"
            required
            autocomplete="email"
            class="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 transition-colors text-sm"
            :placeholder="t('settings.newEmailPlaceholder')"
          />
        </div>

        <div>
          <label for="currentPassword" class="block text-sm font-medium text-slate-300 mb-1">{{
            t('settings.currentPassword')
          }}</label>
          <input
            id="currentPassword"
            v-model="currentPassword"
            type="password"
            required
            autocomplete="current-password"
            class="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 transition-colors text-sm"
            :placeholder="t('settings.currentPasswordPlaceholder')"
          />
        </div>

        <p v-if="emailError" class="text-sm text-rose-400">{{ emailError }}</p>

        <div class="flex gap-2">
          <button
            type="submit"
            class="px-4 py-2 bg-violet-600 text-white text-sm font-medium rounded-lg hover:bg-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:ring-offset-2 focus:ring-offset-slate-900 transition-colors"
          >
            {{ t('settings.saveEmail') }}
          </button>
          <button
            type="button"
            class="px-4 py-2 text-sm font-medium text-slate-400 hover:text-slate-200 transition-colors"
            @click="
              showEmailForm = false;
              emailError = null;
            "
          >
            {{ t('common.cancel') }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>
