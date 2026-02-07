import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  await prisma.todo.deleteMany();

  await prisma.todo.createMany({
    data: [
      { text: 'Learn TypeScript', completed: true },
      { text: 'Build a full-stack app', completed: false },
    ],
  });

  const count = await prisma.todo.count();
  console.log(`Seeded ${count} todos`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
