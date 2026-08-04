import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule } from '@nestjs/schedule';
import { ClusterManagerService } from './services/cluster-manager.service';
import { WorkerWebSocketGateway } from './gateways/worker-websocket.gateway';

@Module({
  imports: [EventEmitterModule.forRoot(), ScheduleModule.forRoot()],
  providers: [ClusterManagerService, WorkerWebSocketGateway],
  exports: [ClusterManagerService],
})
export class ClusterModule {}
