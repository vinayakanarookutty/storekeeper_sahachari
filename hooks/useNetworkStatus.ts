import { useState, useEffect, useCallback } from 'react';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';

export interface NetworkStatus {
  isConnected: boolean;
  isInternetReachable: boolean | null;
  isOffline: boolean;
  type: string;
  refresh: () => Promise<NetInfoState>;
}

export function useNetworkStatus(): NetworkStatus {
  const [netState, setNetState] = useState<NetInfoState | null>(null);

  useEffect(() => {
    // Initial fetch
    NetInfo.fetch().then((state) => {
      setNetState(state);
    });

    // Subscribe to network state changes
    const unsubscribe = NetInfo.addEventListener((state) => {
      setNetState(state);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const refresh = useCallback(async () => {
    const state = await NetInfo.refresh();
    setNetState(state);
    return state;
  }, []);

  // Offline condition: isConnected is explicitly false OR isInternetReachable is explicitly false
  const isOffline =
    netState !== null &&
    (netState.isConnected === false || netState.isInternetReachable === false);

  return {
    isConnected: netState?.isConnected ?? true,
    isInternetReachable: netState?.isInternetReachable ?? null,
    isOffline,
    type: netState?.type ?? 'unknown',
    refresh,
  };
}
