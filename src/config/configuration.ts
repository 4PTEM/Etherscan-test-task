export default () => ({
  HTTP_PORT: parseInt(process.env.HTTP_PORT, 10) || 3000,
  ETHERSCAN_API_URL: process.env.ETHERSCAN_API_URL || 'https://api.etherscan.io/api',
  ETHERSCAN_API_KEY: process.env.ETHERSCAN_API_KEY,
  NUMBER_OF_BLOCKS: parseInt(process.env.NUMBER_OF_BLOCKS, 10) || 100,
  MAX_CONCURRENCY: parseInt(process.env.MAX_CONCURRENCY, 10) || 5,
});
