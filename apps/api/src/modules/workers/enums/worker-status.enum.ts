/**
 * Represents the current operational state of a worker.
 */
export enum WorkerStatus {
  INITIALIZING = 'INITIALIZING',
  IDLE = 'IDLE',
  BUSY = 'BUSY',
  PAUSED = 'PAUSED',
  ERROR = 'ERROR',
  SHUTTING_DOWN = 'SHUTTING_DOWN',
  OFFLINE = 'OFFLINE',
}
