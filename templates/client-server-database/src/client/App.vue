<script setup lang="ts">
import logo from './assets/logo.png';
</script>

<template>
  <div class="app">
    <header class="app-header">
      <img :src="logo" alt="Logo" class="logo" />
      <h1>Client-Server-Database</h1>
      <p class="description">Full-stack app with Vue 3 client, Express API server, and database</p>
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
