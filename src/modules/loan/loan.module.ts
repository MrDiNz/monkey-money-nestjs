import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LoanService } from './loan.service';
import { LoanController } from './loan.controller';
import { Loan } from './entities/loan.entity';
import { Borrower } from './entities/borrower.entity';
import { Vehicle } from './entities/vehicle.entity';
import { Guarantor } from './entities/guarantor.entity';
import { PaymentModule } from '@/modules/payment/payment.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Loan, Borrower, Vehicle, Guarantor]),
    PaymentModule,
  ],
  controllers: [LoanController],
  providers: [LoanService],
  exports: [LoanService],
})
export class LoanModule {}
