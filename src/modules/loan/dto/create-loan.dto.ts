import {
  IsArray,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
  ArrayMaxSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class LoanTermsDto {
  @ApiProperty({ example: 50000, description: 'วงเงินกู้ (บาท)' })
  @IsNumber()
  @Min(1)
  loanAmount: number;

  @ApiProperty({ example: 12, description: 'จำนวนงวด' })
  @IsInt()
  @Min(1)
  numberOfInstallments: number;

  @ApiProperty({ example: 3.75, description: 'อัตราดอกเบี้ย % ต่อปี' })
  @IsNumber()
  @Min(0)
  interestRate: number;

  @ApiProperty({
    example: 1,
    description: 'รอบงวดชำระ: 1, 2, หรือ 4 ครั้งต่อเดือน',
    enum: [1, 2, 4],
  })
  @IsIn([1, 2, 4])
  paymentFrequency: number;
}

export class BorrowerDto {
  @ApiProperty({ example: 'สมชาย' })
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @ApiProperty({ example: 'ใจดี' })
  @IsString()
  @IsNotEmpty()
  lastName: string;

  @ApiProperty({ example: '123' })
  @IsString()
  @IsNotEmpty()
  houseNo: string;

  @ApiProperty({ example: '5' })
  @IsString()
  @IsNotEmpty()
  moo: string;

  @ApiProperty({ example: 'บางกอก' })
  @IsString()
  @IsNotEmpty()
  subDistrict: string;

  @ApiProperty({ example: 'พระนคร' })
  @IsString()
  @IsNotEmpty()
  district: string;

  @ApiProperty({ example: 'กรุงเทพ' })
  @IsString()
  @IsNotEmpty()
  province: string;

  @ApiProperty({ example: '1234567890123' })
  @IsString()
  @IsNotEmpty()
  nationalId: string;

  @ApiProperty({ example: '0812345678' })
  @IsString()
  @IsNotEmpty()
  phone: string;

  @ApiProperty({ example: 13.7563 })
  @IsNumber()
  lat: number;

  @ApiProperty({ example: 100.5018 })
  @IsNumber()
  lng: number;

  @ApiProperty({ example: 'ค้าขาย' })
  @IsString()
  @IsNotEmpty()
  occupation: string;
}

export class VehicleDto {
  @ApiProperty({ example: 'Wave 125' })
  @IsString()
  @IsNotEmpty()
  model: string;

  @ApiProperty({ example: 'มอเตอร์ไซค์' })
  @IsString()
  @IsNotEmpty()
  type: string;

  @ApiProperty({ example: 'แดง' })
  @IsString()
  @IsNotEmpty()
  color: string;

  @ApiProperty({ example: '2563' })
  @IsString()
  @IsNotEmpty()
  registrationYear: string;

  @ApiProperty({ example: 'ABC123' })
  @IsString()
  @IsNotEmpty()
  chassisNumber: string;

  @ApiProperty({ example: 'ENG456' })
  @IsString()
  @IsNotEmpty()
  engineNumber: string;

  @ApiProperty({ example: 'กข 1234' })
  @IsString()
  @IsNotEmpty()
  licensePlateNumber: string;

  @ApiProperty({ example: 'กรุงเทพ' })
  @IsString()
  @IsNotEmpty()
  licensePlateProvince: string;

  @ApiProperty({ example: 12000, description: 'เลขไมล์รถ (กิโลเมตร)' })
  @IsInt()
  @Min(0)
  mileage: number;

  @ApiProperty({
    example: 50000,
    description: 'ราคาประเมิน',
    required: false,
    nullable: true,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  appraisedValue?: number | null;
}

export class GuarantorDto extends BorrowerDto {}

export class CreateLoanDto extends LoanTermsDto {
  @ApiProperty({ type: BorrowerDto })
  @ValidateNested()
  @Type(() => BorrowerDto)
  borrower: BorrowerDto;

  @ApiProperty({ type: VehicleDto })
  @ValidateNested()
  @Type(() => VehicleDto)
  vehicle: VehicleDto;

  @ApiProperty({
    type: [GuarantorDto],
    description: 'สูงสุด 2 คน',
    required: false,
    default: [],
  })
  @IsArray()
  @ArrayMaxSize(2)
  @ValidateNested({ each: true })
  @Type(() => GuarantorDto)
  guarantors: GuarantorDto[] = [];
}
