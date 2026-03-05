import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
} from 'typeorm';
import { Loan } from './loan.entity';

@Entity()
export class Vehicle {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  model: string;

  @Column()
  type: string;

  @Column()
  color: string;

  @Column()
  registrationYear: string;

  @Column()
  chassisNumber: string;

  @Column()
  engineNumber: string;

  @Column()
  licensePlateNumber: string;

  @Column()
  licensePlateProvince: string;

  @Column({ type: 'int' })
  mileage: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  appraisedValue: number | null;

  @OneToOne(() => Loan, (loan) => loan.vehicle)
  loan: Loan;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
