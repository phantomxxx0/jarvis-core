import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { UsersRepository } from './users.repository';
import { UsersService } from './users.service';
describe('UsersService', () => {
  let service: UsersService;
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: UsersRepository, useValue: {} },
        { provide: ConfigService, useValue: {} },
      ],
    }).compile();
    service = module.get<UsersService>(UsersService);
  });
  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
