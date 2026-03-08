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

  @Column({ name: 'paid_amount', type: 'decimal', precision: 15, scale: 2 })
  paidAmount: number

  @Column({ name: 'late_fee', type: 'decimal', precision: 10, scale: 2, default: 0 })
  lateFee: number

  @Column({ name: 'paid_at', type: 'timestamp with time zone' })
  paidAt: Date

  @ManyToOne(() => Installment, (inst) => inst.payments, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'installment_id' })
  installment: Installment

  @CreateDateColumn()
  createdAt: Date
}
