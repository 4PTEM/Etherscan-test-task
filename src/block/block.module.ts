import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { BlockController } from './block.controller';
import { BlockService } from './block.service';

@Module({
  imports: [HttpModule],
  controllers: [BlockController],
  providers: [BlockService],
  
})
export class BlockModule {}
