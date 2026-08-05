import { Module, forwardRef } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule } from '@nestjs/schedule';
import { ClusterManagerService } from './services/cluster-manager.service';
import { WorkerWebSocketGateway } from './gateways/worker-websocket.gateway';
import { RuntimeModule } from '../runtime/runtime.module';

@Module({
  imports: [
    EventEmitterModule.forRoot(),
    ScheduleModule.forRoot(),
    forwardRef(() => RuntimeModule),
  ],
  providers: [ClusterManagerService, WorkerWebSocketGateway],
  exports: [ClusterManagerService],
})
export class ClusterModule {}
