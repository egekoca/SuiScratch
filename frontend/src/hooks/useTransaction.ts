import { useState, useCallback } from 'react';

export interface TransactionState {
  loading: boolean;
  error: string | null;
  success: boolean;
  txHash: string | null;
}

export const useTransaction = () => {
  const [state, setState] = useState<TransactionState>({
    loading: false,
    error: null,
    success: false,
    txHash: null,
  });

  const execute = useCallback(async (
    transactionFn: () => Promise<string>
  ): Promise<string | null> => {
    setState({
      loading: true,
      error: null,
      success: false,
      txHash: null,
    });

    try {
      const txHash = await transactionFn();
      setState({
        loading: false,
        error: null,
        success: true,
        txHash,
      });
      return txHash;
    } catch (error: any) {
      const errorMessage = error?.message || 'Transaction failed';
      setState({
        loading: false,
        error: errorMessage,
        success: false,
        txHash: null,
      });
      return null;
    }
  }, []);

  const reset = useCallback(() => {
    setState({
      loading: false,
      error: null,
      success: false,
      txHash: null,
    });
  }, []);

  return {
    ...state,
    execute,
    reset,
  };
};

