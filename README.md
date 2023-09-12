# blockchain-indexer-sample

Application that emulates indexing of real-time data on the blockchain. We use [Nest](https://github.com/nestjs/nest) framework TypeScript starter repository.

## Installation

```bash
$ npm install
```

## Running the app

```bash
# development
$ npm run start

# watch mode
$ npm run start:dev

# production mode
$ npm run start:prod
```

## Test

```bash
# unit tests
$ npm run test

# e2e tests
$ npm run test:e2e

# test coverage
$ npm run test:cov
```

## Running in Docker

1. Build image: `docker build -t blockchain-indexer-sample .`
2. Run the container: `docker run -p 3000:3000 blockchain-indexer-sample`

## API Design

The task was to emulate and process streams of account updates for multiple accounts. Each account stream is treated to be concurrent with another. However, individual updates within a single account stream are treated sequentially in the same order as in the given `data-source.json` with an added delay between 0-1000ms.

### Design Considerations

Setup for present and future state:

- NestJS is easy to setup and provides more structure for building out apps
- Highly modular structure enables reusability and ease of maintenance as features scale
- TypeScript support enables developers to write clean type-safe code

Handling real-time events:

- The RxJS library was chosen to help process asynchronous data streams as there were many asynchronous events which could occur simultaneously
- Factory methods, e.g., `from()` were used to create events with delays (0-1000ms and later based on the callback time provided in each account update)
- A publish-subscribe pattern was used to handle cases where future unexpired callbacks could be cancelled if an account update with a later version was ingested

Production:

- In addition to the already logged events in this repo, we would add logs for metrics, e.g., CPU utilization, memory utilization, error rates
- Event tracing could be useful since there could be multiple data source and data sink integrations so it would enhance observability add event tracing to observe how data flows from point A to B
- Alerts are useful for high and critical failures since they require immediate response from the developer team

Regarding production roll-outs:

- A best practice before a production roll-out is to ensure e2e and performance testing is done and satisfies functional and non-functional requirements in non-production environments first
- Reviewing the app logs in `logs/app.log` could be useful during a production roll-out to ensure expected output
- Additionally, monitoring the performance metrics of the app during production roll-out to ensure non-functional requires are met
