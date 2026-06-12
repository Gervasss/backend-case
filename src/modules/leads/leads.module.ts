import { Module } from '@nestjs/common';
import { ImoveisModule } from '../imoveis/imoveis.module';
import { StatusesModule } from '../statuses/statuses.module';
import { LeadsController } from './leads.controller';
import { LeadsService } from './leads.service';

@Module({
  imports: [StatusesModule, ImoveisModule],
  controllers: [LeadsController],
  providers: [LeadsService],
})
export class LeadsModule {}
