import { db } from '@jarvis/database';

export const DatabaseProvider = {
  provide: 'DATABASE',
  useValue: db,
};
