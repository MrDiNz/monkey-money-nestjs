import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
} from 'typeorm';
import { Loan } from './loan.entity';

@Entity()
export class Guarantor {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  firstName: string;

  @Column()
  lastName: string;

  @Column()
  houseNo: string;

  @Column()
  moo: string;

  @Column()
  subDistrict: string;

  @Column()
  district: string;

  @Column()
  province: string;

  @Column()
  nationalId: string;

  @Column()
  phone: string;

  @Column('decimal', { precision: 10, scale: 7 })
  lat: number;

  @Column('decimal', { precision: 10, scale: 7 })
  lng: number;

  @Column()
  occupation: string;

  @ManyToOne(() => Loan, (loan) => loan.guarantors, { onDelete: 'CASCADE' })
  loan: Loan;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
