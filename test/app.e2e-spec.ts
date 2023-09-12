import { Logger } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from '../src/app.module';
import { AppService } from '../src/app.service';

describe('App (e2e)', () => {
  let appService: AppService;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    appService = moduleFixture.get<AppService>(AppService);
  });

  it('should run the service on initialization', async () => {
    const mockLogger = jest.spyOn(Logger.prototype, 'log');
    const mockProcessExit = jest.spyOn(process, 'exit').mockImplementation();

    // Call main service under test
    await appService.onModuleInit();

    expect(mockLogger).toHaveBeenCalledWith('Initiate indexing...');
    expect(mockLogger).toHaveBeenCalledWith(
      'Indexing complete! Printing highest token-value accounts by account type...',
    );
    expect(mockLogger).toHaveBeenCalledWith(
      'All tasks complete! Shutting down...',
    );

    expect(mockProcessExit).toHaveBeenCalledWith(0);
  });
});
