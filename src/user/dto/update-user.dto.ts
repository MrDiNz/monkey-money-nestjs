import { IsString, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateUserDto {
  @ApiProperty({ example: 'John Doe', description: 'The name of the user', required: false })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({ example: 'johndoe', description: 'The username of the user', required: false })
  @IsString()
  @IsOptional()
  username?: string;

  @ApiProperty({ example: 'password123', description: 'The password of the user', required: false })
  @IsString()
  @IsOptional()
  password?: string;

  @ApiProperty({ example: 'Some remark', description: 'Optional remark', required: false })
  @IsString()
  @IsOptional()
  remark?: string;
}
