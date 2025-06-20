import NetInfo, { NetInfoState } from "@react-native-community/netinfo";

export interface NetworkStatus {
  isConnected: boolean;
  isInternetReachable: boolean;
  type: string;
  isWifi: boolean;
  isCellular: boolean;
}

class NetworkService {
  private listeners: ((status: NetworkStatus) => void)[] = [];
  private currentStatus: NetworkStatus = {
    isConnected: false,
    isInternetReachable: false,
    type: "unknown",
    isWifi: false,
    isCellular: false,
  };

  constructor() {
    this.initialize();
  }

  private async initialize() {
    // Get initial status
    const state = await NetInfo.fetch();
    this.updateStatus(state);

    // Listen for network changes
    NetInfo.addEventListener(this.handleNetworkChange);
  }

  private handleNetworkChange = (state: NetInfoState) => {
    this.updateStatus(state);
  };

  private updateStatus(state: NetInfoState) {
    this.currentStatus = {
      isConnected: state.isConnected ?? false,
      isInternetReachable: state.isInternetReachable ?? false,
      type: state.type ?? "unknown",
      isWifi: state.type === "wifi",
      isCellular: state.type === "cellular",
    };

    // Notify listeners
    this.notifyListeners();
  }

  private notifyListeners() {
    this.listeners.forEach((listener) => {
      try {
        listener(this.currentStatus);
      } catch (error) {
        console.error("Error in network status listener:", error);
      }
    });
  }

  public getCurrentStatus(): NetworkStatus {
    return { ...this.currentStatus };
  }

  public async checkConnectivity(): Promise<NetworkStatus> {
    const state = await NetInfo.fetch();
    this.updateStatus(state);
    return this.getCurrentStatus();
  }

  public addListener(listener: (status: NetworkStatus) => void): () => void {
    this.listeners.push(listener);

    // Return unsubscribe function
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  public isOnline(): boolean {
    return (
      this.currentStatus.isConnected && this.currentStatus.isInternetReachable
    );
  }

  public isWifi(): boolean {
    return this.currentStatus.isWifi;
  }

  public isCellular(): boolean {
    return this.currentStatus.isCellular;
  }

  public cleanup() {
    // Remove all listeners
    this.listeners = [];
  }

  // Get current network status
  getStatus(): NetworkStatus {
    return this.currentStatus;
  }
}

// Singleton instance
let networkServiceInstance: NetworkService | null = null;

export const getNetworkService = (): NetworkService => {
  if (!networkServiceInstance) {
    networkServiceInstance = new NetworkService();
  }
  return networkServiceInstance;
};

export const checkConnectivity = async (): Promise<NetworkStatus> => {
  return await getNetworkService().checkConnectivity();
};

export const isOnline = (): boolean => {
  return getNetworkService().isOnline();
};

export const addNetworkListener = (
  listener: (status: NetworkStatus) => void
): (() => void) => {
  return getNetworkService().addListener(listener);
};
