export interface RuntimeManifest {
  os: string;
  kernel: string;
  drivers: Record<string, string>; // e.g., nvidia: "535.104"
  hardwareAcceleration: 'CUDA' | 'ROCm' | 'CPU' | 'NONE';
}
