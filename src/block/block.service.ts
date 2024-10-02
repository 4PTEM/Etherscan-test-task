import { Injectable, Logger, HttpException, HttpStatus, OnModuleInit } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { BigNumber, ethers } from 'ethers';
import { lastValueFrom } from 'rxjs';
import axiosRetry from 'axios-retry';
import { ApiException } from '../common/exceptions/api.exception';
import { EtherscanResponse, BlockData } from '../etherscan/etherscan.interfaces';
import { AddressBlockChangeDto } from './dto/address-balance-change.dto';
import { getRecentBlockNumbers } from '../common/utils/block-number.util';

@Injectable()
export class BlockService implements OnModuleInit {
  private readonly logger = new Logger(BlockService.name);
  private readonly etherscanApiUrl: string;
  private readonly apiKey: string;
  private readonly numberOfBlocks: number;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.etherscanApiUrl = this.configService.get<string>('ETHERSCAN_API_URL');
    this.apiKey = this.configService.get<string>('ETHERSCAN_API_KEY');
    this.numberOfBlocks = this.configService.get<number>('NUMBER_OF_BLOCKS', 100);
  }

  onModuleInit() {
    axiosRetry(this.httpService.axiosRef, {
      retries: 3,
      retryDelay: axiosRetry.exponentialDelay,
      retryCondition: (error) => {
        return axiosRetry.isNetworkError(error) || axiosRetry.isRetryableError(error);
      },
    });
  }

  async getLargestRecentBalanceChange(): Promise<AddressBlockChangeDto> {
    this.logger.log('Searching largest balance change');

    try {
      const latestBlockNumber = await this.getLatestBlockNumber();
      this.logger.debug(`Latest block id: ${latestBlockNumber}`);

      const blockNumbers = getRecentBlockNumbers(latestBlockNumber, this.numberOfBlocks);
      this.logger.debug(
        `Handling blocks from ${blockNumbers[blockNumbers.length - 1]} to ${blockNumbers[0]}`,
      );

      const blocks = await this.getBlocksByNumbers(blockNumbers);

      let maxChangeFrom = '';
      let maxChangeTo = '';
      let maxChangeValue = BigNumber.from(0);

      // Ищем транзакцию с наибольшим изменением баланса
      for (const blockData of blocks) {
        const transactions = blockData.transactions ?? [];

        for (const tx of transactions) {
          const value = BigNumber.from(tx.value);
          const absChange = value.abs();
          if (absChange.gt(maxChangeValue)) {
            maxChangeFrom = tx.from;
            maxChangeTo = tx.to;
            maxChangeValue = absChange;
          }
        }
      }

      const balanceChange = ethers.utils.formatEther(maxChangeValue);

      this.logger.log(
        `Largest balance change: ${balanceChange} ETH. Sender: ${maxChangeFrom}, reciever: ${maxChangeTo}`,
      );

      return {
        sender: maxChangeFrom,
        reciever: maxChangeTo,
        balanceChange,
      };
    } catch (error) {
      this.logger.error(
        `Error: ${error.message}`,
        error.stack,
      );
      throw new HttpException(
        'Error',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  private async getLatestBlockNumber(): Promise<number> {
    try {
      const response$ = this.httpService.get<EtherscanResponse<string>>(this.etherscanApiUrl, {
        params: {
          module: 'proxy',
          action: 'eth_blockNumber',
          apiKey: this.apiKey,
        },
      });

      const response = await lastValueFrom(response$);
      const blockNumberHex = response.data.result;
      const blockNumber = parseInt(blockNumberHex, 16);

      if (isNaN(blockNumber)) {
        throw new ApiException('Got incorrect block id from Etherscan API');
      }

      this.logger.debug(`Got latest block number: ${blockNumber}`);
      return blockNumber;
    } catch (error) {
      this.logger.error(`Error on getLatestBlockNumber: ${error.message}`, error.stack);
      throw error;
    }
  }

  private async getBlocksByNumbers(blockNumbers: number[]): Promise<BlockData[]> {
    const blockPromises = blockNumbers.map((blockNumber) => this.getBlockByNumber(blockNumber));
    const results = await Promise.allSettled(blockPromises);

    const blocks: BlockData[] = [];

    results.forEach((result, index) => {
      const blockNumber = blockNumbers[index];
      if (result.status === 'fulfilled' && result.value) {
        blocks.push(result.value);
      } else {
        this.logger.error(
          `Error on block ${blockNumber}: ${
            result.status === 'rejected' ? result.reason : 'Unknown error'
          }`,
        );
      }
    });

    return blocks;
  }

  private async getBlockByNumber(blockNumber: number): Promise<BlockData> {
    try {
      const hexBlockNumber = '0x' + blockNumber.toString(16);

      const response$ = this.httpService.get<EtherscanResponse<BlockData>>(this.etherscanApiUrl, {
        params: {
          module: 'proxy',
          action: 'eth_getBlockByNumber',
          tag: hexBlockNumber,
          boolean: 'true',
          apiKey: this.apiKey,
        },
      });

      const response = await lastValueFrom(response$);

      if (!response.data.result) {
        throw new ApiException(`API error on block ${blockNumber}`);
      }

      this.logger.debug(`Block data: ${blockNumber}`);
      return response.data.result;
    } catch (error) {
      this.logger.error(`Error on getBlockByNumber: ${blockNumber}: ${error.message}`, error.stack);
      throw error;
    }
  }
}
