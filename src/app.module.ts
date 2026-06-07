import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AiModule } from './modules/ai/ai.module';
import { AuthModule } from './modules/auth/auth.module';
import { LeadsModule } from './modules/leads/leads.module';
import { PrismaModule } from './modules/prisma/prisma.module';
import { StatusesModule } from './modules/statuses/statuses.module';
import { UsersModule } from './modules/users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    UsersModule,
    AuthModule,
    StatusesModule,
    LeadsModule,
    AiModule,
  ],
})
export class AppModule {}
