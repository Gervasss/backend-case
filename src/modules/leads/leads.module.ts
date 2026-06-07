import { Module } from '@nestjs/common';
import { StatusesModule } from '../statuses/statuses.module';
import { LeadsController } from './leads.controller';
import { LeadsService } from './leads.service';

@Module({
  imports: [StatusesModule],
  controllers: [LeadsController],
  providers: [LeadsService],
})
export class LeadsModule {}
