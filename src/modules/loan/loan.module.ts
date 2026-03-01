import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LoanService } from './loan.service';
import { LoanController } from './loan.controller';
import { Loan } from './entities/loan.entity';
import { Borrower } from './entities/borrower.entity';
import { Vehicle } from './entities/vehicle.entity';
import { Guarantor } from './entities/guarantor.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Loan, Borrower, Vehicle, Guarantor])],
  controllers: [LoanController],
  providers: [LoanService],
})
export class LoanModule {}
