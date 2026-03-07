import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SentryModule } from '@sentry/nestjs/setup';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { SentryGlobalFilter } from '@sentry/nestjs/setup';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UserModule } from '@/modules/user/user.module';
import { LoanModule } from '@/modules/loan/loan.module';
import { AuthModule } from '@/core/auth/auth.module';
import { JwtAuthGuard } from '@/core/auth/jwt-auth.guard';
import databaseConfig from './config/database.config';
import globalConfig from './config/global.config';

@Module({
  imports: [
    SentryModule.forRoot(),
    ConfigModule.forRoot({
      isGlobal: true,
      load: [databaseConfig, globalConfig],
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('database.host'),
        port: configService.get<number>('database.port'),
        username: configService.get<string>('database.username'),
        password: configService.get<string>('database.password'),
        database: configService.get<string>('database.database'),
        autoLoadEntities: true,
        synchronize: configService.get<boolean>('database.synchronize'),
        migrationsRun: configService.get<boolean>('database.migrationsRun'),
        migrations: ['dist/migrations/*.js'],
      }),
      inject: [ConfigService],
    }),
    UserModule,
    LoanModule,
    AuthModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_FILTER,
      useClass: SentryGlobalFilter,
    },
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}
