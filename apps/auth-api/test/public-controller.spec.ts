import { PublicController } from '../src/presentation/public.controller';
import { Tokens } from '../src/domain/profile';

test('public JWKS controller uses only the Tokens port', () => {
  const keySet = { keys: [{ kty: 'RSA', n: 'public-modulus', e: 'AQAB', use: 'sig', alg: 'RS256', kid: 'test' }] };
  const tokens: Tokens = { jwks: () => keySet, sign: () => 'token', verify: () => 'profile-id', expiresIn: 60 };
  expect(new PublicController(tokens).jwks()).toEqual(keySet);
});
