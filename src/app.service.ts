import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { readFileSync } from 'fs';
import {
  Observable,
  Subject,
  delay,
  distinctUntilChanged,
  filter,
  forkJoin,
  from,
  lastValueFrom,
  mergeMap,
  takeUntil,
  tap,
} from 'rxjs';
import path = require('path');

interface AccountStateMap {
  [id: string]: Account;
}

interface AccountStreamMap {
  [id: string]: Account[];
}

// So we may divide and run concurrently
interface AccountStreamMap$ {
  [id: string]: Observable<Account>;
}

interface AccountTypeValueMap {
  [accountType: string]: Account;
}

interface Account {
  id: string;
  accountType: string;
  tokens: number;
  callbackTimeMs: number;
  data: Data;
  version?: number;
}

// Possible fields based on file
interface Data {
  mintId?: string;
  img?: string;
  expiry?: number;
  currentBid?: number;
}

const file = path.join(__dirname, '..', 'data-source.json');

// Range of values between min and max exclusive
export const randomDelay = (min: number, max: number): number =>
  Math.random() * (max - min);

@Injectable()
export class AppService implements OnModuleInit {
  private readonly _logger = new Logger(AppService.name);
  // Stores an account update stream for each account
  private _accountStreamMap$: AccountStreamMap$ = {};
  // Store information about the most recent account commit (from callback)
  private _lastCommittedAccounts: AccountStateMap = {};

  /**
   * Triggers on module initialization, builds account streams and stores the latest updates
   */
  async onModuleInit() {
    this.buildMultiAccountStream();
    await this.getMultiAccountStream();
  }

  /**
   * Reads from a file and builds a table of account updates to emulate blockchain streams
   */
  buildMultiAccountStream() {
    try {
      const data = readFileSync(file, 'utf8');
      const accountsFromFile = JSON.parse(data);

      // Stores account updates by account ID
      const accountStreamMap: AccountStreamMap = {};
      for (const account of accountsFromFile) {
        accountStreamMap[account.id]
          ? accountStreamMap[account.id].push(account)
          : (accountStreamMap[account.id] = [account]);
      }
      // Convert updates for each account into an observable stream
      for (const [id, accountStream] of Object.entries(accountStreamMap)) {
        this._accountStreamMap$[id] = from(accountStream).pipe(
          delay(randomDelay(0, 1000)),
        );
      }
    } catch (error) {
      console.error('Error reading data from file:', error);
    }
  }

  /**
   * Processes and stores latest account updates for a multiple accounts concurrently
   */
  async getMultiAccountStream() {
    // Emulate streaming account information
    this._logger.log('Initiate indexing...');
    // Process account updates concurrently
    const concurrentStream$ = forkJoin(
      Object.values(this._accountStreamMap$).map((accountStream$) =>
        this._getSingleAccountStream(accountStream$),
      ),
    );
    await lastValueFrom(concurrentStream$);

    this._logger.log(
      'Indexing complete! Printing highest token-value accounts by account type...',
    );
    // Get highest token-value accounts by account type
    const accountByAccountType: AccountTypeValueMap =
      this.getHighestTokenAccounts(this._lastCommittedAccounts);
    this._logger.log(accountByAccountType);
  }

  /**
   * Returns table of the highest token-value accounts by account type
   * @param accountState - the latest account state
   */
  getHighestTokenAccounts(accountState: AccountStateMap): AccountTypeValueMap {
    return Object.values(accountState).reduce((res, account) => {
      if (
        !res[account.accountType] ||
        account.tokens > res[account.accountType].tokens
      ) {
        res[account.accountType] = account;
      }
      return res;
    }, {});
  }

  /**
   * Processes account updates for a single account and updates a table of the latest committed account updates
   * @param accountStream$ - stream of account updates for a single account
   */
  private _getSingleAccountStream(accountStream$: Observable<Account>) {
    const startTime = Date.now();
    const cancelCallbackStream$ = new Subject();

    return accountStream$.pipe(
      // Ignores updates for older versions (e.g., if prev.version still >= curr.version)
      distinctUntilChanged((prev, curr) => prev.version >= curr.version),
      // Not explicitly stated but undefined versions (e.g., bad states) should be ignored
      filter((account) => account.version !== undefined),
      tap((account) => {
        this._logger.log(
          `${Date.now() - startTime}ms - (${account.id}, v${
            account.version
          }) indexed.`,
        );

        // Cancel all active callbacks since a new version has been ingested
        cancelCallbackStream$.next('Cancel active callbacks!');
      }),
      mergeMap((account) =>
        // Create delayed callback for each individual account update
        from([account]).pipe(
          delay(account.callbackTimeMs),
          // Ingested account has newer version so "cancel" active callback
          takeUntil(
            cancelCallbackStream$.pipe(
              tap(() =>
                this._logger.log(
                  `${Date.now() - startTime}ms - (${account.id}, v${
                    account.version
                  }) active callback canceled.`,
                ),
              ),
            ),
          ),
          // If account update was not cancelled by newer version, commit the update
          tap(() => {
            this._logger.log(
              `${Date.now() - startTime}ms - (${account.id}, v${
                account.version
              }) callback fired.`,
            );

            if (
              !this._lastCommittedAccounts[account.id] ||
              this._lastCommittedAccounts[account.id].version < account.version
            )
              this._lastCommittedAccounts[account.id] = account;
          }),
        ),
      ),
    );
  }
}
