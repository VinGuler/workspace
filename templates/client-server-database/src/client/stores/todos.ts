import { ref } from 'vue';
import { defineStore } from 'pinia';

export interface Todo {
  id: number;
  text: string;
  completed: boolean;
  createdAt: string;
  updatedAt: string;
}

export const useTodoStore = defineStore('todos', () => {
  const todos = ref<Todo[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);

  async function fetchTodos() {
    loading.value = true;
    error.value = null;
    try {
      const res = await fetch('/api/todos');
      const json = await res.json();
      if (json.success) {
        todos.value = json.data;
      } else {
        error.value = json.error ?? 'Failed to fetch todos';
      }
    } catch {
      error.value = 'Failed to fetch todos';
    } finally {
      loading.value = false;
    }
  }

  async function addTodo(text: string) {
    error.value = null;
    try {
      const res = await fetch('/api/todos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      const json = await res.json();
      if (json.success) {
        todos.value.push(json.data);
      } else {
        error.value = json.error ?? 'Failed to add todo';
      }
    } catch {
      error.value = 'Failed to add todo';
    }
  }

  async function toggleTodo(id: number) {
    const todo = todos.value.find((t) => t.id === id);
    if (!todo) return;
    error.value = null;
    try {
      const res = await fetch(`/api/todos/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed: !todo.completed }),
      });
      const json = await res.json();
      if (json.success) {
        todo.completed = json.data.completed;
      } else {
        error.value = json.error ?? 'Failed to update todo';
      }
    } catch {
      error.value = 'Failed to update todo';
    }
  }

  async function deleteTodo(id: number) {
    error.value = null;
    try {
      const res = await fetch(`/api/todos/${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) {
        todos.value = todos.value.filter((t) => t.id !== id);
      } else {
        error.value = json.error ?? 'Failed to delete todo';
      }
    } catch {
      error.value = 'Failed to delete todo';
    }
  }

  return { todos, loading, error, fetchTodos, addTodo, toggleTodo, deleteTodo };
});
