import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { PaymentService } from './payment.service'
import { PaymentController } from './payment.controller'
import { Installment } from './entities/installment.entity'
import { InstallmentPayment } from './entities/installment-payment.entity'
import { AutoPenalty } from './entities/auto-penalty.entity'
import { Loan } from '@/modules/loan/entities/loan.entity'

@Module({
  imports: [TypeOrmModule.forFeature([Installment, InstallmentPayment, AutoPenalty, Loan])],
  controllers: [PaymentController],
  providers: [PaymentService],
  exports: [PaymentService],
})
export class PaymentModule {}
