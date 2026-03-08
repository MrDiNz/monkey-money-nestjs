import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { Installment, InstallmentStatus } from './entities/installment.entity'
import { InstallmentPayment } from './entities/installment-payment.entity'
import { AutoPenalty } from './entities/auto-penalty.entity'
import { Loan } from '@/modules/loan/entities/loan.entity'
import { calculateAutoPenalty, applyPayment } from './utils/payment.util'
import { CreatePaymentDto } from './dto/create-payment.dto'
import { calculateInstallmentSchedule } from '@/modules/loan/utils/installment.util'

@Injectable()
export class PaymentService {
  constructor(
    @InjectRepository(Installment)
    private readonly installmentRepo: Repository<Installment>,
    @InjectRepository(InstallmentPayment)
    private readonly installmentPaymentRepo: Repository<InstallmentPayment>,
    @InjectRepository(AutoPenalty)
    private readonly autoPenaltyRepo: Repository<AutoPenalty>,
    @InjectRepository(Loan)
    private readonly loanRepo: Repository<Loan>,
  ) {}

  /**
   * Generate monthly installment schedule for a loan.
   * Called by LoanService after creating a loan.
   */
  async generateInstallments(loan: Loan): Promise<void> {
    const schedule = calculateInstallmentSchedule({
      loanAmount: Number(loan.loanAmount),
      numberOfInstallments: loan.numberOfInstallments,
      interestRate: Number(loan.interestRate),
      paymentFrequency: loan.paymentFrequency,
      createdAt: loan.createdAt,
    })

    const installments = schedule.map((item) =>
      this.installmentRepo.create({
        dueDate: item.dueDate,
        amount: item.amount,
        paidAmount: 0,
        status: InstallmentStatus.UNPAID,
        loan,
      }),
    )
    await this.installmentRepo.save(installments)
  }

  async getPaymentSummary(loanId: number, referenceDate = new Date()) {
    const loan = await this.loanRepo.findOne({ where: { id: loanId } })
    if (!loan) throw new NotFoundException(`Loan with ID ${loanId} not found`)

    const installments = await this.installmentRepo.find({
      where: [
        { loan: { id: loanId }, status: InstallmentStatus.UNPAID },
        { loan: { id: loanId }, status: InstallmentStatus.PARTIAL },
      ],
      order: { dueDate: 'ASC' },
    })

    const autoPenalty = calculateAutoPenalty(
      installments.map((i) => ({ dueDate: i.dueDate, status: i.status })),
      referenceDate,
    )

    const overdueInstallments = installments.reduce(
      (sum, i) => sum + (Number(i.amount) - Number(i.paidAmount)),
      0,
    )

    return {
      autoPenalty,
      overdueInstallments,
      total: autoPenalty + overdueInstallments,
    }
  }

  async processPayment(loanId: number, dto: CreatePaymentDto, referenceDate = new Date()) {
    const loan = await this.loanRepo.findOne({ where: { id: loanId } })
    if (!loan) throw new NotFoundException(`Loan with ID ${loanId} not found`)

    const installments = await this.installmentRepo.find({
      where: [
        { loan: { id: loanId }, status: InstallmentStatus.UNPAID },
        { loan: { id: loanId }, status: InstallmentStatus.PARTIAL },
      ],
      order: { dueDate: 'ASC' },
    })

    const autoPenalty = calculateAutoPenalty(
      installments.map((i) => ({ dueDate: i.dueDate, status: i.status })),
      referenceDate,
    )

    const result = applyPayment(
      {
        installments: installments.map((i) => ({
          id: i.id,
          dueDate: i.dueDate,
          amount: Number(i.amount),
          paidAmount: Number(i.paidAmount),
          status: i.status,
        })),
        autoPenalty,
      },
      dto.amount,
      dto.lateFee ?? 0,
    )

    // Record auto-penalty if any was collected
    if (result.penaltyPaid > 0) {
      const penalty = this.autoPenaltyRepo.create({
        amount: result.penaltyPaid,
        calculatedAt: referenceDate,
        loan,
      })
      await this.autoPenaltyRepo.save(penalty)
    }

    const now = referenceDate

    // Update installments and create sub-payment records
    for (const alloc of result.installmentsPaid) {
      const inst = installments.find((i) => i.id === alloc.id)!
      const newPaid = Number(inst.paidAmount) + alloc.partialAmount
      inst.paidAmount = newPaid

      if (alloc.fullyPaid) {
        inst.status = InstallmentStatus.PAID
      } else {
        inst.status = InstallmentStatus.PARTIAL
      }
      await this.installmentRepo.save(inst)

      const payment = this.installmentPaymentRepo.create({
        paidAmount: alloc.partialAmount,
        lateFee: result.lateFeePaid,
        paidAt: now,
        installment: inst,
      })
      await this.installmentPaymentRepo.save(payment)
    }

    return result
  }
}
