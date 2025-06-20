import AsyncStorage from "@react-native-async-storage/async-storage";

export type DeviceConfig = {
  deviceId: string;
  location: string;
  name: string;
  status: "active" | "inactive" | "maintenance";
  configuration: {
    surveyInterval: number;
    theme: string;
    language: string;
  };
  createdAt: string;
  updatedAt: string;
};

const CONFIG_KEY = "device_config";

export const getDeviceConfig = async (): Promise<DeviceConfig | null> => {
  const json = await AsyncStorage.getItem(CONFIG_KEY);
  return json ? JSON.parse(json) : null;
};

export const setDeviceConfig = async (config: DeviceConfig) => {
  await AsyncStorage.setItem(CONFIG_KEY, JSON.stringify(config));
};

export const updateDeviceConfig = async (partial: Partial<DeviceConfig>) => {
  const current = await getDeviceConfig();
  if (!current) return;
  const updated = {
    ...current,
    ...partial,
    updatedAt: new Date().toISOString(),
  };
  await setDeviceConfig(updated);
};
