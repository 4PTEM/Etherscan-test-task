import { Module } from '@nestjs/common';
import { BlockModule } from './block/block.module';
import { ConfigModule } from '@nestjs/config';
import configuration from './config/configuration';

@Module({
  imports: [
    ConfigModule.forRoot({
      load: [configuration],
      isGlobal: true,
    }),
    BlockModule,
  ],
})
export class AppModule {}
