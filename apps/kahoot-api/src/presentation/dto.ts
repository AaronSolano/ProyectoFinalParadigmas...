import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
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
  @IsArray()
  @ArrayMinSize(2)
  @ArrayMaxSize(4)
  @IsString({ each: true })
  @Length(1, 120, { each: true })
  @Matches(/\S/, { each: true })
  options!: string[];
  @IsInt() @Min(0) @Max(3) correctOption!: number;
  @ValidateIf((_, v) => v !== undefined && v !== null)
  @IsString()
  @MaxLength(300)
  explanation?: string | null;
  @ValidateIf((_, v) => v !== undefined) @IsInt() @Min(1) position?: number;
}
export class SessionInput {
  @IsUUID("4") quizId!: string;
  @ValidateIf((_, v) => v !== undefined)
  @IsInt()
  @Min(5)
  @Max(120)
  questionTimeSeconds?: number;
  @ValidateIf((_, v) => v !== undefined)
  @IsInt()
  @Min(0)
  @Max(60)
  autoAdvanceSeconds?: number;
}
export class JoinInput {
  @ValidateIf((_, v) => v !== undefined)
  @IsString()
  @Length(1, 40)
  @Matches(/\S/)
  displayName?: string;
}
