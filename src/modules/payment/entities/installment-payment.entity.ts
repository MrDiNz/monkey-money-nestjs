import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm'
import { Installment } from './installment.entity'

@Entity()
export class InstallmentPayment {
  @PrimaryGeneratedColumn()
  id: number

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  paidAmount: number

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  lateFee: number

  @Column({ type: 'timestamp with time zone' })
  paidAt: Date

  @ManyToOne(() => Installment, (inst) => inst.payments, { onDelete: 'CASCADE' })
  @JoinColumn()
  installment: Installment

  @CreateDateColumn()
  createdAt: Date
}
