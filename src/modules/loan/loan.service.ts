import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository } from 'typeorm';
import { Loan } from './entities/loan.entity';
import { Guarantor } from './entities/guarantor.entity';
import { CreateLoanDto } from './dto/create-loan.dto';
import { UpdateLoanDto } from './dto/update-loan.dto';
import { PaginatedLoanDto } from './dto/paginated-loan.dto';
import {
  generateLoanNumber,
  getMonthRangeUTC,
  getBangkokParts,
} from './utils/loan-number.util';
import { PaymentService } from '@/modules/payment/payment.service';

@Injectable()
export class LoanService {
  constructor(
    @InjectRepository(Loan)
    private readonly loanRepository: Repository<Loan>,
    @InjectRepository(Guarantor)
    private readonly guarantorRepository: Repository<Guarantor>,
    private readonly paymentService: PaymentService,
  ) {}

  async getNextSequence(date: Date): Promise<number> {
    const { year, month } = getBangkokParts(date);
    const { start, end } = getMonthRangeUTC(year, month);
    const count = await this.loanRepository.count({
      where: { createdAt: Between(start, end) },
    });
    return count + 1;
  }

  async create(createLoanDto: CreateLoanDto): Promise<Loan> {
    const { guarantors, ...loanData } = createLoanDto;
    const now = new Date();
    const seq = await this.getNextSequence(now);
    const loanNumber = generateLoanNumber(now, seq);
    const loan = this.loanRepository.create({ ...loanData, loanNumber });
    const saved = await this.loanRepository.save(loan);

    if (guarantors && guarantors.length > 0) {
      const guarantorEntities = guarantors.map((g) =>
        this.guarantorRepository.create({ ...g, loan: saved }),
      );
      await this.guarantorRepository.save(guarantorEntities);
    }

    await this.paymentService.generateInstallments(saved);

    return this.findOne(saved.id);
  }

  async findAll(
    page: number,
    limit: number,
    search?: string,
  ): Promise<PaginatedLoanDto> {
    const qb = this.loanRepository
      .createQueryBuilder('loan')
      .leftJoinAndSelect('loan.borrower', 'borrower')
      .leftJoinAndSelect('loan.vehicle', 'vehicle')
      .leftJoinAndSelect('loan.guarantors', 'guarantors')
      .orderBy('loan.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (search && search.trim()) {
      qb.where(
        'borrower.firstName ILIKE :term OR borrower.lastName ILIKE :term OR borrower.nationalId ILIKE :term OR vehicle.licensePlateNumber ILIKE :term OR loan.loanNumber ILIKE :term',
        { term: `%${search}%` },
      );
    }

    const [data, total] = await qb.getManyAndCount();

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: number): Promise<Loan> {
    const loan = await this.loanRepository.findOne({ where: { id } });
    if (!loan) {
      throw new NotFoundException(`Loan with ID ${id} not found`);
    }
    return loan;
  }

  async update(id: number, updateLoanDto: UpdateLoanDto): Promise<Loan> {
    const loan = await this.findOne(id);

    const { guarantors, borrower, vehicle, ...rest } = updateLoanDto;

    if (borrower) {
      Object.assign(loan.borrower, borrower);
    }
    if (vehicle) {
      Object.assign(loan.vehicle, vehicle);
    }
    if (guarantors !== undefined) {
      if (guarantors.length > 2) {
        throw new BadRequestException('guarantors must not exceed 2');
      }
      await this.guarantorRepository.delete({ loan: { id } });
      if (guarantors.length > 0) {
        const newGuarantors = guarantors.map((g) =>
          this.guarantorRepository.create({ ...g, loan }),
        );
        await this.guarantorRepository.save(newGuarantors);
      }
    }

    Object.assign(loan, rest);
    await this.loanRepository.save(loan);
    return this.findOne(id);
  }

  async remove(id: number): Promise<void> {
    const loan = await this.findOne(id);
    await this.loanRepository.remove(loan);
  }
}
