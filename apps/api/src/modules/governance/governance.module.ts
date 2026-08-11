import { Module } from '@nestjs/common';
import { UsersModule } from '../users/users.module';
import { AuditModule } from '../audit/audit.module';
import { IdentityService } from './identity/identity.service';
import { AuthorizationService } from './authorization/authorization.service';
import { PolicyEngine } from './authorization/policy-engine.service';
import { PermissionMapper } from './authorization/permission-mapper.service';

@Module({
  imports: [UsersModule, AuditModule],
  providers: [
    IdentityService,
    AuthorizationService,
    PolicyEngine,
    PermissionMapper,
  ],
  exports: [IdentityService, AuthorizationService],
})
export class GovernanceModule {}
