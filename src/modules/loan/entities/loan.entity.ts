import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { Borrower } from './borrower.entity';
import { Vehicle } from './vehicle.entity';
import { Guarantor } from './guarantor.entity';
import { Installment } from '@/modules/payment/entities/installment.entity';

@Entity()
export class Loan {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  loanNumber: string;

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  loanAmount: number;

  @Column({ type: 'int' })
  numberOfInstallments: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  interestRate: number;

  @Column({ type: 'int' })
  paymentFrequency: number;

  @OneToOne(() => Borrower, (borrower) => borrower.loan, {
    cascade: true,
    eager: true,
  })
  @JoinColumn()
  borrower: Borrower;

  @OneToOne(() => Vehicle, (vehicle) => vehicle.loan, {
    cascade: true,
    eager: true,
  })
  @JoinColumn()
  vehicle: Vehicle;

  @OneToMany(() => Guarantor, (guarantor) => guarantor.loan, {
    cascade: true,
    eager: true,
  })
  guarantors: Guarantor[];

  @OneToMany(() => Installment, (installment) => installment.loan)
  installments: Installment[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
