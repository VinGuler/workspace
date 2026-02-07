import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import { app, prisma } from '../server/index';

// Clean up the database before each test for isolation
beforeEach(async () => {
  await prisma.todo.deleteMany();
});

// Disconnect from the database after all tests
afterAll(async () => {
  await prisma.$disconnect();
});

describe('Todo API', () => {
  describe('GET /api/health', () => {
    it('should return healthy status', async () => {
      const response = await request(app).get('/api/health');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.status).toBe('ok');
    });
  });

  describe('GET /api/todos', () => {
    it('should return empty list when no todos exist', async () => {
      const response = await request(app).get('/api/todos');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual([]);
    });

    it('should return list of todos', async () => {
      await prisma.todo.create({ data: { text: 'Seeded todo' } });

      const response = await request(app).get('/api/todos');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].text).toBe('Seeded todo');
    });

    it('should return JSON content type', async () => {
      const response = await request(app).get('/api/todos');

      expect(response.headers['content-type']).toMatch(/application\/json/);
    });

    it('should return todos ordered by creation time', async () => {
      await prisma.todo.create({ data: { text: 'First' } });
      await prisma.todo.create({ data: { text: 'Second' } });

      const response = await request(app).get('/api/todos');

      expect(response.body.data[0].text).toBe('First');
      expect(response.body.data[1].text).toBe('Second');
    });
  });

  describe('POST /api/todos', () => {
    it('should create a new todo', async () => {
      const newTodo = { text: 'Test todo' };
      const response = await request(app).post('/api/todos').send(newTodo);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data.text).toBe('Test todo');
      expect(response.body.data.completed).toBe(false);
    });

    it('should persist the todo in the database', async () => {
      await request(app).post('/api/todos').send({ text: 'Persistent todo' });

      const count = await prisma.todo.count();
      expect(count).toBe(1);
    });

    it('should return error when text is missing', async () => {
      const response = await request(app).post('/api/todos').send({});

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Text is required');
    });

    it('should return createdAt and updatedAt timestamps', async () => {
      const response = await request(app).post('/api/todos').send({ text: 'Timestamped' });

      expect(response.body.data).toHaveProperty('createdAt');
      expect(response.body.data).toHaveProperty('updatedAt');
    });
  });

  describe('PUT /api/todos/:id', () => {
    it('should update todo completion status', async () => {
      const todo = await prisma.todo.create({ data: { text: 'Toggle me' } });

      const response = await request(app).put(`/api/todos/${todo.id}`).send({ completed: true });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.completed).toBe(true);
    });

    it('should persist the update in the database', async () => {
      const todo = await prisma.todo.create({ data: { text: 'Check persistence' } });

      await request(app).put(`/api/todos/${todo.id}`).send({ completed: true });

      const updated = await prisma.todo.findUnique({ where: { id: todo.id } });
      expect(updated?.completed).toBe(true);
    });

    it('should return error for non-existent todo', async () => {
      const response = await request(app).put('/api/todos/99999').send({ completed: true });

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Todo not found');
    });
  });

  describe('DELETE /api/todos/:id', () => {
    it('should delete a todo', async () => {
      const todo = await prisma.todo.create({ data: { text: 'Delete me' } });

      const response = await request(app).delete(`/api/todos/${todo.id}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should remove the todo from the database', async () => {
      const todo = await prisma.todo.create({ data: { text: 'Gone forever' } });

      await request(app).delete(`/api/todos/${todo.id}`);

      const count = await prisma.todo.count();
      expect(count).toBe(0);
    });

    it('should return error for non-existent todo', async () => {
      const response = await request(app).delete('/api/todos/99999');

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Todo not found');
    });
  });
});
