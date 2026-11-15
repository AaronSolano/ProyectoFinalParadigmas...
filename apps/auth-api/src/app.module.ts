import { DynamicModule, Module } from '@nestjs/common';
import { AuthService } from './application/auth-service';
import { Settings } from './config/settings';
import { ArgonPasswords, RsaTokens } from './data/credentials';
import { PasswordHasher, Profiles, TOKENS, Tokens } from './domain/profile';
import { AuthController } from './presentation/auth.controller';
import { PublicController } from './presentation/public.controller';
const SETTINGS = Symbol('Settings');
const PROFILES = Symbol('Profiles');
const PASSWORDS = Symbol('PasswordHasher');
@Module({
  controllers: [AuthController, PublicController],
  providers: [
    { provide: PASSWORDS, useClass: ArgonPasswords },
    {
      provide: TOKENS,
      inject: [SETTINGS],
      useFactory: (settings: Settings): Tokens => new RsaTokens(settings),
    },
    {
      provide: AuthService,
      inject: [PROFILES, PASSWORDS, TOKENS],
      useFactory: (
        repository: Profiles,
        passwords: PasswordHasher,
        tokens: Tokens,
      ) => new AuthService(repository, passwords, tokens),
    },
  ],
})
export class AppModule {
  static register(config: Settings, profiles: Profiles): DynamicModule {
    return {
      module: AppModule,
      providers: [
        { provide: SETTINGS, useValue: config },
        { provide: PROFILES, useValue: profiles },
      ],
    };
  }
}
