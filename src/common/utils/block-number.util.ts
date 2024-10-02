import { range } from 'lodash';

export function getRecentBlockNumbers(latestBlockNumber: number, n: number): number[] {
  return range(latestBlockNumber, Math.max(latestBlockNumber - n, 0), -1);
}
