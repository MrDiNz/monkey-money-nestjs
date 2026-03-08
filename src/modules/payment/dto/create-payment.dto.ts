import { ApiProperty } from '@nestjs/swagger'
import { IsNumber, IsPositive, IsOptional, Min } from 'class-validator'

export class CreatePaymentDto {
  @ApiProperty({ description: 'จำนวนเงินที่รับมา (บาท)', example: 5000 })
  @IsNumber()
  @IsPositive()
  amount: number

  @ApiProperty({ description: 'ค่าผิดนัด (บาท, ทศนิยม 2 ตำแหน่ง)', example: 0, required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  lateFee?: number
}
