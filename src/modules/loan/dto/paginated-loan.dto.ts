import { ApiProperty } from '@nestjs/swagger';
import { Loan } from '../entities/loan.entity';

export class PaginationMeta {
  @ApiProperty({ example: 100 })
  total: number;

  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 10 })
  limit: number;

  @ApiProperty({ example: 10 })
  totalPages: number;
}

export class PaginatedLoanDto {
  @ApiProperty({ type: [Loan] })
  data: Loan[];

  @ApiProperty({ type: PaginationMeta })
  meta: PaginationMeta;
}
