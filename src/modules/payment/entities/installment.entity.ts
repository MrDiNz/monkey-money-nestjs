import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm'
import { Loan } from '@/modules/loan/entities/loan.entity'
import { InstallmentPayment } from './installment-payment.entity'

export enum InstallmentStatus {
  UNPAID = 'UNPAID',
  PARTIAL = 'PARTIAL',
  PAID = 'PAID',
}

@Entity()
export class Installment {
  @PrimaryGeneratedColumn()
  id: number

  @Column({ type: 'timestamp with time zone' })
  dueDate: Date

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  amount: number

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  paidAmount: number

  @Column({ type: 'enum', enum: InstallmentStatus, default: InstallmentStatus.UNPAID })
  status: InstallmentStatus

  @ManyToOne(() => Loan, (loan) => loan.installments, { onDelete: 'CASCADE' })
  @JoinColumn()
  loan: Loan

  @OneToMany(() => InstallmentPayment, (p) => p.installment, { cascade: true })
  payments: InstallmentPayment[]

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date
}
