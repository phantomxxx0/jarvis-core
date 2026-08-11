import { Task } from './task';

export interface Plan {
  id: string;
  intentId: string;
  tasks: Task[];
  estimatedComplexity: 'LOW' | 'MEDIUM' | 'HIGH';
}
