import {
  PropsWithChildren,
  useContext,
  createContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import { makeProxy } from "../utilities/rpc";
import {
  AndroidSystemImageInfo,
  DeviceInfo,
  DeviceManagerInterface,
  IOSRuntimeInfo,
} from "../../common/DeviceManager";
import { Platform } from "../providers/UtilsProvider";

const DeviceManager = makeProxy<DeviceManagerInterface>("DeviceManager");

interface DevicesContextProps {
  devices: DeviceInfo[];
  finishedInitialLoad: boolean;
  androidImages: AndroidSystemImageInfo[];
  iOSRuntimes: IOSRuntimeInfo[];
  deviceManager: DeviceManagerInterface;
  reload: () => void;
}

const DevicesContext = createContext<DevicesContextProps>({
  devices: [],
  finishedInitialLoad: false,
  androidImages: [],
  iOSRuntimes: [],
  deviceManager: DeviceManager,
  reload: () => {},
});

export default function DevicesProvider({ children }: PropsWithChildren) {
  const [devices, setDevices] = useState<DeviceInfo[]>([]);
  const [androidImages, setAndroidImages] = useState<AndroidSystemImageInfo[]>([]);
  const [iOSRuntimes, setIOSRuntimes] = useState<IOSRuntimeInfo[]>([]);
  const [finishedInitialLoad, setFinishedInitialLoad] = useState(false);

  const reload = useCallback(async () => {
    try {
      const promises = [
        DeviceManager.listAllDevices().then(setDevices),
        DeviceManager.listInstalledAndroidImages().then(setAndroidImages),
      ];
      if (Platform.OS === "macos") {
        promises.push(DeviceManager.listInstalledIOSRuntimes().then(setIOSRuntimes));
      }
      await Promise.all(promises);
    } finally {
      setFinishedInitialLoad(true);
    }
  }, [setDevices, setAndroidImages, setIOSRuntimes, setFinishedInitialLoad]);

  useEffect(() => {
    DeviceManager.addListener("devicesChanged", setDevices);
    reload();
    return () => {
      DeviceManager.removeListener("devicesChanged", setDevices);
    };
  }, []);

  const contextValue = useMemo(() => {
    return {
      devices,
      finishedInitialLoad,
      androidImages,
      iOSRuntimes,
      reload,
      deviceManager: DeviceManager,
    };
  }, [devices, finishedInitialLoad, androidImages, iOSRuntimes, reload, DeviceManager]);

  return <DevicesContext.Provider value={contextValue}>{children}</DevicesContext.Provider>;
}

export function useDevices() {
  const context = useContext(DevicesContext);

  if (context === undefined) {
    throw new Error("useDevices must be used within a DevicesProvider");
  }
  return context;
}
