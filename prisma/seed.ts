import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});
const prisma = new PrismaClient({ adapter });

async function main() {
  // Create platforms
  const vk = await prisma.platform.upsert({
    where: { slug: "vk-ads" },
    update: {},
    create: { slug: "vk-ads", name: "VK Ads" },
  });

  const unity = await prisma.platform.upsert({
    where: { slug: "unity-ads" },
    update: {},
    create: { slug: "unity-ads", name: "Unity Ads" },
  });

  const mintegral = await prisma.platform.upsert({
    where: { slug: "mintegral" },
    update: {},
    create: { slug: "mintegral", name: "Mintegral" },
  });

  // Create default settings
  await prisma.settings.upsert({
    where: { id: "default" },
    update: {},
    create: {
      id: "default",
      criticalThreshold: 1,
      warningThreshold: 2,
      cautionThreshold: 5,
      fetchIntervalMin: 10,
    },
  });

  console.log("Seeded platforms:", vk.name, unity.name, mintegral.name);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
