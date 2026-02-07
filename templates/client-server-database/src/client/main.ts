import { createApp } from 'vue';
import { createPinia } from 'pinia';
import { log } from '@workspace/utils';

import App from './App.vue';

const app = createApp(App);

app.use(createPinia());

app.mount('#app');

log('info', 'client-server-database', 'App mounted');
