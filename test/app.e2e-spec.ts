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
    const loggerSpy = jest.spyOn(Logger.prototype, 'log');

    await appService.onModuleInit();

    expect(loggerSpy).toHaveBeenCalledWith('Initiate indexing...');
    expect(loggerSpy).toHaveBeenCalledWith(
      'Indexing complete! Printing highest token-value accounts by account type...',
    );
  });
});
