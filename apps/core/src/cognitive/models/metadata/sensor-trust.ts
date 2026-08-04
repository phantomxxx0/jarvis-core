export const SensorTrust = {
  FILESYSTEM: 1.0,
  BROWSER: 0.99,
  VISION: 0.97,
  VOICE: 0.91,
  GPS: 0.75,
} as const;

export type SensorTrust = typeof SensorTrust[keyof typeof SensorTrust];
