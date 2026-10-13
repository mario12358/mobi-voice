import { getNetworkStateAsync, NetworkStateType } from 'expo-network';

import type { ConnectionType, NetworkInfo } from './types';

export const expoNetworkInfo: NetworkInfo = {
  async connection(): Promise<ConnectionType> {
    const state = await getNetworkStateAsync();
    if (state.isConnected === false) return 'none';
    if (state.type === NetworkStateType.WIFI || state.type === NetworkStateType.ETHERNET) return 'wifi';
    if (state.type === NetworkStateType.CELLULAR) return 'cellular';
    return state.type === NetworkStateType.NONE ? 'none' : 'other';
  },
};
