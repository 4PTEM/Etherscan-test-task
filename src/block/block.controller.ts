import { Controller, Get } from '@nestjs/common';
import { BlockService } from './block.service';
import { AddressBlockChangeDto } from './dto/address-balance-change.dto';


@Controller('block')
export class BlockController {
  constructor(private readonly balanceService: BlockService) {}

  @Get('largest-balance-change')
  async getLargestRecentBalanceChange(): Promise<AddressBlockChangeDto> {
    return this.balanceService.getLargestRecentBalanceChange();
  }
}
