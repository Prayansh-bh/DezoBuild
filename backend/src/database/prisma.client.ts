import { DatabaseService } from './database.service';

export const prisma = DatabaseService.getInstance().getClient();
