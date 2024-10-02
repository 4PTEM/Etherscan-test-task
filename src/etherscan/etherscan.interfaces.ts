export interface EtherscanResponse<T> {
    status: string;
    message: string;
    result: T;
  }
  
  export interface BlockData {
    transactions: TransactionData[];
  }
  
  export interface TransactionData {
    value: string;
    from: string;
    to: string | null;
  }
