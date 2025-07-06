import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidateInputPipe } from './core/pipes';
import { HttpExceptionFilter } from './core/filters';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);

  app.useGlobalPipes(new ValidateInputPipe({ transform: true }));

  app.useGlobalFilters(new HttpExceptionFilter());

  app.setGlobalPrefix('api/v1');

  app.enableCors({
    origin: configService.getOrThrow<string>('ORIGINS').split(','),
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    credentials: true,
  });

  await app.listen(configService.get('PORT') ?? 3000);
}

bootstrap().catch((error) => {
  console.error(error);
  process.exit(1);
});
