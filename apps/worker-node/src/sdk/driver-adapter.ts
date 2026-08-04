export interface DriverAdapter<TDeviceState> {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  getDeviceState(): Promise<TDeviceState>;
}
