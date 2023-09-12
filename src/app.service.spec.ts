import { Test, TestingModule } from '@nestjs/testing';
import * as fs from 'fs';
import { delay, from } from 'rxjs';
import { AppService, randomDelay } from './app.service';

jest.mock('fs');

describe('AppService', () => {
  let service: AppService;

  const mockAccountState = {
    'test-account-id-001': {
      id: 'test-account-id-001',
      accountType: 'typeA',
      tokens: 1000,
      callbackTimeMs: 1000,
      data: {},
      version: 1,
    },
    'test-account-id-002': {
      id: 'test-account-id-002',
      accountType: 'typeB',
      tokens: 2000,
      callbackTimeMs: 1000,
      data: {},
      version: 1,
    },
    'test-account-id-003': {
      id: 'test-account-id-003',
      accountType: 'typeC',
      tokens: 3000,
      callbackTimeMs: 1000,
      data: {},
      version: 1,
    },
    'test-account-id-004': {
      id: 'test-account-id-004',
      accountType: 'typeA',
      tokens: 4000,
      callbackTimeMs: 1000,
      data: {},
      version: 1,
    },
    'test-account-id-005': {
      id: 'test-account-id-005',
      accountType: 'typeB',
      tokens: 5000,
      callbackTimeMs: 1000,
      data: {},
      version: 1,
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AppService],
    }).compile();

    service = module.get<AppService>(AppService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should build a multi-account stream', () => {
    const mockFile = JSON.stringify(
      Object.values(mockAccountState).map((account) => account),
    );
    (fs.readFileSync as jest.Mock).mockReturnValue(mockFile);

    // Call function under test
    service.buildMultiAccountStream();

    expect(service['_accountStreamMap$']).toBeDefined();
    expect(Object.keys(service['_accountStreamMap$']).length).toBeGreaterThan(
      0,
    );
  });

  it('should process account updates concurrently', async () => {
    const mockAccountStreamMap = {
      'test-account-id-001': [
        {
          id: 'test-account-id-001',
          accountType: 'typeA',
          tokens: 1000,
          callbackTimeMs: 1000,
          data: {},
          version: 1,
        },
        {
          id: 'test-account-id-001',
          accountType: 'typeA',
          tokens: 2000,
          callbackTimeMs: 2000,
          data: {},
          version: 2,
        },
        {
          id: 'test-account-id-001',
          accountType: 'typeA',
          tokens: 3000,
          callbackTimeMs: 3000,
          data: {},
          version: 3,
        },
      ],
    };
    const mockAccountStreamMap$ = {};
    for (const [id, accountStream] of Object.entries(mockAccountStreamMap)) {
      mockAccountStreamMap$[id] = from(accountStream).pipe(
        delay(randomDelay(0, 1000)),
      );
    }
    service['_accountStreamMap$'] = mockAccountStreamMap$;

    const loggerSpy = jest.spyOn(service['_logger'], 'log');

    // Call function under test
    await service.getMultiAccountStream();

    expect(loggerSpy).toHaveBeenCalledWith('Initiate indexing...');
    expect(loggerSpy).toHaveBeenCalledWith(
      'Indexing complete! Printing highest token-value accounts by account type...',
    );

    const mockLastCommittedAccounts = {
      'test-account-id-001': {
        id: 'test-account-id-001',
        accountType: 'typeA',
        tokens: 3000,
        callbackTimeMs: 3000,
        data: {},
        version: 3,
      },
    };
    expect(service['_lastCommittedAccounts']).toEqual(
      mockLastCommittedAccounts,
    );
  });

  it('should return the highest token-value accounts by account type', () => {
    const mockAccountTypeValue = {
      typeA: {
        id: 'test-account-id-004',
        accountType: 'typeA',
        tokens: 4000,
        callbackTimeMs: 1000,
        data: {},
        version: 1,
      },
      typeB: {
        id: 'test-account-id-005',
        accountType: 'typeB',
        tokens: 5000,
        callbackTimeMs: 1000,
        data: {},
        version: 1,
      },
      typeC: {
        id: 'test-account-id-003',
        accountType: 'typeC',
        tokens: 3000,
        callbackTimeMs: 1000,
        data: {},
        version: 1,
      },
    };

    // Call function under test
    const result = service.getHighestTokenAccounts(mockAccountState);

    expect(result).toEqual(mockAccountTypeValue);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });
});
