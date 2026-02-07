<script setup lang="ts">
import logo from './assets/logo.png';
</script>

<template>
  <div class="app">
    <header class="app-header">
      <img :src="logo" alt="Logo" class="logo" />
      <h1>Landing Page</h1>
      <p class="description">Static site built with Vue 3 and Vue Router</p>
    </header>
  </div>
</template>

<style scoped>
.app {
  max-width: 480px;
  margin: 2rem auto;
  font-family: system-ui, sans-serif;
}

.app-header {
  text-align: center;
}

.logo {
  width: 64px;
  height: 64px;
}

h1 {
  margin: 0.5rem 0 0.25rem;
}

.description {
  color: #666;
  font-size: 0.9rem;
  margin: 0;
}
</style>
