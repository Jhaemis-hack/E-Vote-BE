import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ElectionModule } from './modules/election/election.module';
import { UserModule } from './modules/user/user.module';
import { ScheduleModule } from '@nestjs/schedule';
import authConfig from './config/auth.config';
import dataSource from './migrations/migration.config';
import { VoteModule } from './modules/votes/votes.module';
import { EmailModule } from './modules/email/email.module';
import { VoterModule } from './modules/voter/voter.module';
import { RedisModule } from '@nestjs-modules/ioredis';
import { CandidateModule } from './modules/candidate/candidate.module';
import { SubscriptionModule } from './modules/subscription/subscription.module';
import { GoogleAuthModule } from './modules/googleAuth/google.auth.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      load: [authConfig],
      /*
       * By default, the package looks for a env file in the root directory of the application.
       * We don't use ".env" file because it is prioritize as the same level as real environment variables.
       * To specify multiple. env files, set the envFilePath property.
       * If a variable is found in multiple files, the first one takes precedence.
       */
      // envFilePath: ['.env.development.local', `.env.${process.env.PROFILE}`],
      isGlobal: true,
      expandVariables: true,
    }),
    TypeOrmModule.forRootAsync({
      useFactory: () => ({
        ...dataSource.options,
        autoLoadEntities: true,
      }),
      dataSourceFactory: async () => dataSource,
    }),
    RedisModule.forRootAsync({
      useFactory: async (configService: ConfigService) => ({
        type: 'single', // Use a single Redis instance
        url: `redis://${configService.get('REDIS_HOST')}:${configService.get('REDIS_PORT')}`,
        options: {
          password: configService.get('REDIS_PASSWORD'), // Optional password
        },
      }),
      inject: [ConfigService], // Inject ConfigService
    }),
    UserModule,
    ElectionModule,
    VoteModule,
    ScheduleModule.forRoot(),
    EmailModule,
    VoterModule,
    CandidateModule,
    SubscriptionModule,
    GoogleAuthModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
