import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, Length, Matches, MaxLength } from 'class-validator';
export class LoginRequest {
  @ApiProperty({format:'email',maxLength:254}) @IsEmail() @MaxLength(254) email!: string;
  @ApiProperty({format:'password',maxLength:128}) @IsString() @MaxLength(128) password!: string;
}
export class RegisterRequest extends LoginRequest {
  @ApiProperty({format:'password', minLength:8,maxLength:128,pattern:'^(?=.*[A-Za-z])(?=.*[0-9]).{8,128}$'}) @Matches(/^(?=.*[A-Za-z])(?=.*[0-9]).{8,128}$/) declare password: string;
  @ApiProperty({minLength:2,maxLength:40}) @IsString() @Length(2,40) displayName!: string;
}
