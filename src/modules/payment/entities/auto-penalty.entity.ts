import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm'
import { Loan } from '@/modules/loan/entities/loan.entity'

@Entity()
export class AutoPenalty {
  @PrimaryGeneratedColumn()
  id: number

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount: number

  @Column({ name: 'calculated_at', type: 'timestamp with time zone' })
  calculatedAt: Date

  @ManyToOne(() => Loan, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'loan_id' })
  loan: Loan

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date
}
