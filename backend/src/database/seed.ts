import { prisma } from './prisma.client';
import { RbacSeederService } from '../modules/rbac/services/rbac-seeder.service';
import { SubscriptionSeederService } from '../modules/subscriptions/services/subscription-seeder.service';
import { logger } from '../common/logging/logger';

async function main() {
  logger.info('Starting RBAC & Subscription seeding...');

  // Phase 04 RBAC Seeding
  const rbacSeeder = new RbacSeederService(prisma);
  const rbacResult = await rbacSeeder.seedAll();
  logger.info('RBAC seeding completed successfully:', rbacResult);

  // Phase 05 Subscriptions & Entitlements Seeding
  const subSeeder = new SubscriptionSeederService(prisma);
  const subResult = await subSeeder.seedAll();
  logger.info('Subscription & Entitlement seeding completed successfully:', subResult);
}

main()
  .catch((e) => {
    logger.error('Database seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
