import { NestFactory } from '@nestjs/core';
import { WinstonModule } from 'nest-winston';
import { format, transports } from 'winston';
import { AppModule } from './app.module';

async function bootstrap() {
  // Format for logger
  const customFormat = format.combine(
    format.colorize(),
    format.splat(),
    format.timestamp(),
    format.printf((info) => {
      return `${info.timestamp} ${info.level}: ${info.message}`;
    }),
  );
  const app = await NestFactory.create(AppModule, {
    logger: WinstonModule.createLogger({
      transports: [
        new transports.File({
          filename: `logs/app.log`,
          format: customFormat,
        }),
        new transports.Console({
          format: customFormat,
        }),
      ],
    }),
  });
  await app.listen(3000);
}
bootstrap();
