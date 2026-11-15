import {
  IsBoolean,
  IsInt,
  IsString,
  IsUUID,
  Length,
  Max,
  MaxLength,
  Min,
  Matches,
  ValidateIf,
} from "class-validator";
export class QuizInput {
  @IsString() @Length(1, 120) @Matches(/\S/) title!: string;
  @ValidateIf((_, v) => v !== undefined)
  @IsString()
  @MaxLength(500)
  description?: string;
}
export class QuestionInput {
  @IsString() @Length(1, 500) @Matches(/\S/) statement!: string;
  @IsBoolean() correctAnswer!: boolean;
  @ValidateIf((_, v) => v !== undefined) @IsInt() @Min(1) position?: number;
}
export class SessionInput {
  @IsUUID("4") quizId!: string;
  @ValidateIf((_, v) => v !== undefined)
  @IsInt()
  @Min(5)
  @Max(120)
  questionTimeSeconds?: number;
}
export class JoinInput {
  @ValidateIf((_, v) => v !== undefined)
  @IsString()
  @Length(1, 40)
  @Matches(/\S/)
  displayName?: string;
}
