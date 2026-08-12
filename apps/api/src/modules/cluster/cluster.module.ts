import { Module, forwardRef } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule } from '@nestjs/schedule';
import { ClusterManagerService } from './services/cluster-manager.service';
import { WorkerWebSocketGateway } from './gateways/worker-websocket.gateway';
import { RuntimeModule } from '../runtime/runtime.module';
import { BrainRouterModule } from '../brain-router/brain-router.module';

@Module({
  imports: [
    EventEmitterModule.forRoot(),
    ScheduleModule.forRoot(),
    forwardRef(() => RuntimeModule),
    forwardRef(() => BrainRouterModule),
  ],
  providers: [ClusterManagerService, WorkerWebSocketGateway],
  exports: [ClusterManagerService],
})
export class ClusterModule {}
