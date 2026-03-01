import {
  Entity,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { Borrower } from './borrower.entity';
import { Vehicle } from './vehicle.entity';
import { Guarantor } from './guarantor.entity';

@Entity()
export class Loan {
  @PrimaryGeneratedColumn()
  id: number;

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

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
