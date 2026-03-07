import { ApiProperty } from '@nestjs/swagger';
import type { InstallmentStatus } from '../utils/installment.util';

export class InstallmentItemDto {
  @ApiProperty()
  installmentNo: number;

  @ApiProperty()
  dueDate: Date;

  @ApiProperty({ nullable: true, type: Date })
  paidDate: Date | null;

  @ApiProperty()
  amount: number;

  @ApiProperty()
  remainingBalance: number;

  @ApiProperty()
  outstandingAmount: number;

  @ApiProperty({ enum: ['ชำระแล้ว', 'ค้างชำระ', 'ยังไม่ถึงกำหนด'] })
  status: InstallmentStatus;

  @ApiProperty({ nullable: true, type: String })
  remark: string | null;
}
