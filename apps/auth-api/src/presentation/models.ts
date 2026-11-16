import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
export class ProfileResponse {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ format: 'email' }) email!: string;
  @ApiProperty({ minLength: 2, maxLength: 40 }) displayName!: string;
  @ApiProperty({ format: 'date-time', type: String }) createdAt!: string;
}
export class AuthResponse {
  @ApiProperty() accessToken!: string;
  @ApiProperty({ enum: ['Bearer'] }) tokenType!: string;
  @ApiProperty({ type: 'integer', minimum: 1 }) expiresIn!: number;
  @ApiProperty({ type: ProfileResponse }) profile!: ProfileResponse;
}
export class GuestProfile {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty() displayName!: string;
}
export class GuestResponse {
  @ApiProperty() accessToken!: string;
  @ApiProperty({ enum: ['Bearer'] }) tokenType!: string;
  @ApiProperty({ type: 'integer', minimum: 1 }) expiresIn!: number;
  @ApiProperty({ type: GuestProfile }) guest!: GuestProfile;
}
export class ProblemDetail {
  @ApiPropertyOptional() field?: string;
  @ApiProperty() message!: string;
}
export class Problem {
  @ApiProperty({ type: 'integer' }) status!: number;
  @ApiProperty() code!: string;
  @ApiProperty() message!: string;
  @ApiPropertyOptional({ type: [ProblemDetail] }) details?: ProblemDetail[];
}
export class HealthStatus {
  @ApiProperty({ enum: ['ok'] }) status!: string;
  @ApiProperty() service!: string;
  @ApiPropertyOptional({ format: 'date-time' }) timestamp?: string;
}
export class Jwk {
  @ApiProperty({ enum: ['RSA'] }) kty!: string;
  @ApiProperty({ enum: ['sig'] }) use!: string;
  @ApiProperty({ enum: ['RS256'] }) alg!: string;
  @ApiProperty() kid!: string;
  @ApiProperty() n!: string;
  @ApiProperty() e!: string;
}
export class Jwks {
  @ApiProperty({ type: [Jwk] }) keys!: Jwk[];
}
