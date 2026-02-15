<script setup lang="ts">
defineProps<{ visible: boolean }>();
</script>

<template>
  <Transition
    enter-active-class="transition-opacity duration-200"
    enter-from-class="opacity-0"
    enter-to-class="opacity-100"
    leave-active-class="transition-opacity duration-300"
    leave-from-class="opacity-100"
    leave-to-class="opacity-0"
  >
    <div v-if="visible" class="fixed top-0 left-0 right-0 z-50 h-1 overflow-hidden">
      <div class="updating-bar h-full w-full" />
    </div>
  </Transition>
</template>

<style scoped>
.updating-bar {
  background: linear-gradient(
    90deg,
    transparent 0%,
    rgb(139 92 246) 40%,
    rgb(167 139 250) 50%,
    rgb(139 92 246) 60%,
    transparent 100%
  );
  background-size: 200% 100%;
  animation: shimmer 1.2s ease-in-out infinite;
}

@keyframes shimmer {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}
</style>
