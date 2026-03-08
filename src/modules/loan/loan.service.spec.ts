import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { LoanService } from './loan.service';
import { Loan } from './entities/loan.entity';
import { Guarantor } from './entities/guarantor.entity';
import { PaymentService } from '@/modules/payment/payment.service';
import {
  CreateLoanDto,
  BorrowerDto,
  VehicleDto,
  GuarantorDto,
} from './dto/create-loan.dto';
import { UpdateLoanDto } from './dto/update-loan.dto';
import {
  roundInstallmentAmount,
  calculateInstallmentSchedule,
} from './utils/installment.util';

const mockBorrowerDto: BorrowerDto = {
  firstName: 'สมชาย',
  lastName: 'ใจดี',
  houseNo: '123',
  moo: '5',
  subDistrict: 'บางกอก',
  district: 'พระนคร',
  province: 'กรุงเทพ',
  nationalId: '1234567890123',
  phone: '0812345678',
  lat: 13.7563,
  lng: 100.5018,
  occupation: 'ค้าขาย',
};

const mockVehicleDto: VehicleDto = {
  model: 'Wave 125',
  type: 'มอเตอร์ไซค์',
  color: 'แดง',
  registrationYear: '2563',
  chassisNumber: 'ABC123',
  engineNumber: 'ENG456',
  licensePlateNumber: 'กข 1234',
  licensePlateProvince: 'กรุงเทพ',
  mileage: 12000,
};

const mockGuarantorDto: GuarantorDto = {
  ...mockBorrowerDto,
  firstName: 'สมหญิง',
  nationalId: '9876543210123',
};

const mockLoanTermsDto = {
  loanAmount: 50000,
  numberOfInstallments: 12,
  interestRate: 3.75,
  paymentFrequency: 1,
};

const makeLoan = (overrides: Partial<Loan> = {}): Loan =>
  ({
    id: 1,
    loanNumber: '69-03-1',
    loanAmount: 50000,
    numberOfInstallments: 12,
    interestRate: 3.75,
    paymentFrequency: 1,
    borrower: {
      ...mockBorrowerDto,
      id: 1,
      loan: null as any,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    vehicle: {
      ...mockVehicleDto,
      appraisedValue: null,
      id: 1,
      loan: null as any,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    guarantors: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }) as Loan;

// ─── QueryBuilder mock ──────────────────────────────────────────────────────

const mockQb = {
  leftJoinAndSelect: jest.fn().mockReturnThis(),
  orderBy: jest.fn().mockReturnThis(),
  skip: jest.fn().mockReturnThis(),
  take: jest.fn().mockReturnThis(),
  where: jest.fn().mockReturnThis(),
  getManyAndCount: jest.fn(),
};

describe('LoanService', () => {
  let service: LoanService;

  const loanRepo = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    createQueryBuilder: jest.fn().mockReturnValue(mockQb),
    remove: jest.fn(),
    count: jest.fn(),
  };

  const guarantorRepo = {
    create: jest.fn(),
    save: jest.fn(),
    delete: jest.fn(),
  };

  const paymentService = {
    generateInstallments: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    // Re-setup mockQb after clearAllMocks resets call tracking.
    // Implementation survives clearAllMocks, but we re-set mockReturnThis to be safe.
    mockQb.leftJoinAndSelect.mockReturnThis();
    mockQb.orderBy.mockReturnThis();
    mockQb.skip.mockReturnThis();
    mockQb.take.mockReturnThis();
    mockQb.where.mockReturnThis();
    loanRepo.createQueryBuilder.mockReturnValue(mockQb);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LoanService,
        { provide: getRepositoryToken(Loan), useValue: loanRepo },
        { provide: getRepositoryToken(Guarantor), useValue: guarantorRepo },
        { provide: PaymentService, useValue: paymentService },
      ],
    }).compile();

    service = module.get<LoanService>(LoanService);
    jest.clearAllMocks();

    // Re-setup after clearAllMocks
    mockQb.leftJoinAndSelect.mockReturnThis();
    mockQb.orderBy.mockReturnThis();
    mockQb.skip.mockReturnThis();
    mockQb.take.mockReturnThis();
    mockQb.where.mockReturnThis();
    loanRepo.createQueryBuilder.mockReturnValue(mockQb);
    paymentService.generateInstallments.mockResolvedValue(undefined);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ---------------------------------------------------------------------------
  describe('create', () => {
    it('should create a loan without guarantors', async () => {
      const dto: CreateLoanDto = {
        ...mockLoanTermsDto,
        borrower: mockBorrowerDto,
        vehicle: mockVehicleDto,
        guarantors: [],
      };
      const loan = makeLoan();

      loanRepo.count.mockResolvedValue(0);
      loanRepo.create.mockReturnValue(loan);
      loanRepo.save.mockResolvedValue(loan);
      loanRepo.findOne.mockResolvedValue(loan);

      const result = await service.create(dto);

      expect(loanRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          borrower: mockBorrowerDto,
          vehicle: mockVehicleDto,
        }),
      );
      expect(loanRepo.save).toHaveBeenCalledWith(loan);
      expect(guarantorRepo.save).not.toHaveBeenCalled();
      expect(result).toEqual(loan);
    });

    it('should create a loan with 1 guarantor', async () => {
      const dto: CreateLoanDto = {
        ...mockLoanTermsDto,
        borrower: mockBorrowerDto,
        vehicle: mockVehicleDto,
        guarantors: [mockGuarantorDto],
      };
      loanRepo.count.mockResolvedValue(0);
      const savedLoan = makeLoan();
      const guarantorEntity = {
        ...mockGuarantorDto,
        id: 1,
        loan: savedLoan,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const loanWithGuarantor = makeLoan({
        guarantors: [guarantorEntity as any],
      });

      loanRepo.create.mockReturnValue(savedLoan);
      loanRepo.save.mockResolvedValue(savedLoan);
      guarantorRepo.create.mockReturnValue(guarantorEntity);
      guarantorRepo.save.mockResolvedValue([guarantorEntity]);
      loanRepo.findOne.mockResolvedValue(loanWithGuarantor);

      const result = await service.create(dto);

      expect(guarantorRepo.create).toHaveBeenCalledWith({
        ...mockGuarantorDto,
        loan: savedLoan,
      });
      expect(guarantorRepo.save).toHaveBeenCalled();
      expect(result.guarantors).toHaveLength(1);
    });

    it('should generate loanNumber using Bangkok time, not UTC', async () => {
      // UTC Mar 31 18:00 = Bangkok Apr 1 01:00 → should be 69-04-1
      jest.useFakeTimers().setSystemTime(new Date('2026-03-31T18:00:00Z'));
      loanRepo.count.mockResolvedValue(0);
      const savedLoan = makeLoan({
        loanNumber: '69-04-1',
        createdAt: new Date('2026-03-31T18:00:00Z'),
      } as any);
      loanRepo.create.mockReturnValue(savedLoan);
      loanRepo.save.mockResolvedValue(savedLoan);
      loanRepo.findOne.mockResolvedValue(savedLoan);

      const dto: CreateLoanDto = {
        ...mockLoanTermsDto,
        borrower: mockBorrowerDto,
        vehicle: mockVehicleDto,
        guarantors: [],
      };
      const result = await service.create(dto);
      expect(result.loanNumber).toBe('69-04-1');
      jest.useRealTimers();
    });

    it('should generate loanNumber as third loan of the Bangkok month', async () => {
      loanRepo.count.mockResolvedValue(2);
      const savedLoan = makeLoan({
        loanNumber: '69-03-3',
        createdAt: new Date('2026-03-20T10:00:00Z'),
      } as any);
      loanRepo.create.mockReturnValue(savedLoan);
      loanRepo.save.mockResolvedValue(savedLoan);
      loanRepo.findOne.mockResolvedValue(savedLoan);

      const dto: CreateLoanDto = {
        ...mockLoanTermsDto,
        borrower: mockBorrowerDto,
        vehicle: mockVehicleDto,
        guarantors: [],
      };
      const result = await service.create(dto);
      expect(result.loanNumber).toBe('69-03-3');
    });

    it('should create a loan with mileage and no appraisedValue', async () => {
      const dto: CreateLoanDto = {
        ...mockLoanTermsDto,
        borrower: mockBorrowerDto,
        vehicle: { ...mockVehicleDto, mileage: 15000 },
        guarantors: [],
      };
      const loan = makeLoan();
      loanRepo.count.mockResolvedValue(0);
      loanRepo.create.mockReturnValue(loan);
      loanRepo.save.mockResolvedValue(loan);
      loanRepo.findOne.mockResolvedValue(loan);

      await service.create(dto);

      expect(loanRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          vehicle: expect.objectContaining({ mileage: 15000 }),
        }),
      );
    });

    it('should create a loan with mileage and appraisedValue', async () => {
      const dto: CreateLoanDto = {
        ...mockLoanTermsDto,
        borrower: mockBorrowerDto,
        vehicle: { ...mockVehicleDto, mileage: 20000, appraisedValue: 50000 },
        guarantors: [],
      };
      const loan = makeLoan();
      loanRepo.count.mockResolvedValue(0);
      loanRepo.create.mockReturnValue(loan);
      loanRepo.save.mockResolvedValue(loan);
      loanRepo.findOne.mockResolvedValue(loan);

      await service.create(dto);

      expect(loanRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          vehicle: expect.objectContaining({
            mileage: 20000,
            appraisedValue: 50000,
          }),
        }),
      );
    });

    it('should create a loan with 2 guarantors', async () => {
      const dto: CreateLoanDto = {
        ...mockLoanTermsDto,
        borrower: mockBorrowerDto,
        vehicle: mockVehicleDto,
        guarantors: [
          mockGuarantorDto,
          { ...mockGuarantorDto, firstName: 'คนที่สอง' },
        ],
      };
      loanRepo.count.mockResolvedValue(0);
      const savedLoan = makeLoan();
      const loanWith2Guarantors = makeLoan({
        guarantors: [{} as any, {} as any],
      });

      loanRepo.create.mockReturnValue(savedLoan);
      loanRepo.save.mockResolvedValue(savedLoan);
      guarantorRepo.create.mockReturnValue({} as any);
      guarantorRepo.save.mockResolvedValue([]);
      loanRepo.findOne.mockResolvedValue(loanWith2Guarantors);

      const result = await service.create(dto);

      expect(guarantorRepo.create).toHaveBeenCalledTimes(2);
      expect(result.guarantors).toHaveLength(2);
    });

    describe('loan terms persisted on create', () => {
      it('TC-BE-TERMS-01: should persist all 4 loan term fields', async () => {
        const dto: CreateLoanDto = {
          loanAmount: 50000,
          numberOfInstallments: 12,
          interestRate: 3.75,
          paymentFrequency: 1,
          borrower: mockBorrowerDto,
          vehicle: mockVehicleDto,
          guarantors: [],
        };
        const loan = makeLoan();
        loanRepo.count.mockResolvedValue(0);
        loanRepo.create.mockReturnValue(loan);
        loanRepo.save.mockResolvedValue(loan);
        loanRepo.findOne.mockResolvedValue(loan);

        await service.create(dto);

        expect(loanRepo.create).toHaveBeenCalledWith(
          expect.objectContaining({
            loanAmount: 50000,
            numberOfInstallments: 12,
            interestRate: 3.75,
            paymentFrequency: 1,
          }),
        );
      });

      it('TC-BE-TERMS-02: should persist paymentFrequency=2', async () => {
        const dto: CreateLoanDto = {
          loanAmount: 30000,
          numberOfInstallments: 24,
          interestRate: 5.0,
          paymentFrequency: 2,
          borrower: mockBorrowerDto,
          vehicle: mockVehicleDto,
          guarantors: [],
        };
        const loan = makeLoan();
        loanRepo.count.mockResolvedValue(0);
        loanRepo.create.mockReturnValue(loan);
        loanRepo.save.mockResolvedValue(loan);
        loanRepo.findOne.mockResolvedValue(loan);

        await service.create(dto);

        expect(loanRepo.create).toHaveBeenCalledWith(
          expect.objectContaining({ paymentFrequency: 2 }),
        );
      });

      it('TC-BE-TERMS-03: should persist paymentFrequency=4', async () => {
        const dto: CreateLoanDto = {
          loanAmount: 20000,
          numberOfInstallments: 6,
          interestRate: 2.5,
          paymentFrequency: 4,
          borrower: mockBorrowerDto,
          vehicle: mockVehicleDto,
          guarantors: [],
        };
        const loan = makeLoan();
        loanRepo.count.mockResolvedValue(0);
        loanRepo.create.mockReturnValue(loan);
        loanRepo.save.mockResolvedValue(loan);
        loanRepo.findOne.mockResolvedValue(loan);

        await service.create(dto);

        expect(loanRepo.create).toHaveBeenCalledWith(
          expect.objectContaining({ paymentFrequency: 4 }),
        );
      });
    });
  });

  // ---------------------------------------------------------------------------
  describe('findAll', () => {
    it('TC-BE-01: no search param → returns all loans without WHERE clause', async () => {
      const loans = [makeLoan(), makeLoan(), makeLoan()];
      mockQb.getManyAndCount.mockResolvedValue([loans, 3]);

      const result = await service.findAll(1, 10, undefined);

      expect(mockQb.where).not.toHaveBeenCalled();
      expect(result).toEqual({
        data: loans,
        meta: { total: 3, page: 1, limit: 10, totalPages: 1 },
      });
    });

    it('TC-BE-02: search by firstName applies ILIKE with correct term', async () => {
      const loans = [makeLoan()];
      mockQb.getManyAndCount.mockResolvedValue([loans, 1]);

      await service.findAll(1, 10, 'สม');

      expect(mockQb.where).toHaveBeenCalledWith(
        expect.stringContaining('borrower.firstName ILIKE :term'),
        { term: '%สม%' },
      );
    });

    it('TC-BE-03: search by lastName applies ILIKE with correct term', async () => {
      mockQb.getManyAndCount.mockResolvedValue([[], 0]);

      await service.findAll(1, 10, 'ใจดี');

      expect(mockQb.where).toHaveBeenCalledWith(
        expect.stringContaining('borrower.lastName ILIKE :term'),
        { term: '%ใจดี%' },
      );
    });

    it('TC-BE-04: search by nationalId applies ILIKE with correct term', async () => {
      mockQb.getManyAndCount.mockResolvedValue([[], 0]);

      await service.findAll(1, 10, '12345');

      expect(mockQb.where).toHaveBeenCalledWith(
        expect.stringContaining('borrower.nationalId ILIKE :term'),
        { term: '%12345%' },
      );
    });

    it('TC-BE-05: search by licensePlateNumber applies ILIKE with correct term', async () => {
      mockQb.getManyAndCount.mockResolvedValue([[], 0]);

      await service.findAll(1, 10, 'กข');

      expect(mockQb.where).toHaveBeenCalledWith(
        expect.stringContaining('vehicle.licensePlateNumber ILIKE :term'),
        { term: '%กข%' },
      );
    });

    it('TC-BE-06: search by loanNumber applies ILIKE with correct term', async () => {
      mockQb.getManyAndCount.mockResolvedValue([[], 0]);

      await service.findAll(1, 10, '69-03');

      expect(mockQb.where).toHaveBeenCalledWith(
        expect.stringContaining('loan.loanNumber ILIKE :term'),
        { term: '%69-03%' },
      );
    });

    it('TC-BE-07: search by exact loanNumber returns matching loan', async () => {
      const matchedLoan = makeLoan({ loanNumber: '69-03-1' } as any);
      mockQb.getManyAndCount.mockResolvedValue([[matchedLoan], 1]);

      const result = await service.findAll(1, 10, '69-03-1');

      expect(mockQb.where).toHaveBeenCalledWith(
        expect.stringContaining('loan.loanNumber ILIKE :term'),
        { term: '%69-03-1%' },
      );
      expect(result.data[0].loanNumber).toBe('69-03-1');
    });

    it('TC-BE-08: empty search string → no WHERE clause (returns all)', async () => {
      const loans = [makeLoan(), makeLoan()];
      mockQb.getManyAndCount.mockResolvedValue([loans, 2]);

      const result = await service.findAll(1, 10, '');

      expect(mockQb.where).not.toHaveBeenCalled();
      expect(result.meta.total).toBe(2);
    });

    it('TC-BE-09: no match → empty results with total=0', async () => {
      mockQb.getManyAndCount.mockResolvedValue([[], 0]);

      const result = await service.findAll(1, 10, 'xxxxxxxxxx');

      expect(result).toEqual({
        data: [],
        meta: { total: 0, page: 1, limit: 10, totalPages: 0 },
      });
    });

    it('TC-BE-10: search + pagination applies correct skip and take', async () => {
      mockQb.getManyAndCount.mockResolvedValue([[], 15]);

      await service.findAll(2, 10, 'สม');

      expect(mockQb.skip).toHaveBeenCalledWith(10);
      expect(mockQb.take).toHaveBeenCalledWith(10);
      expect(mockQb.where).toHaveBeenCalledWith(expect.any(String), {
        term: '%สม%',
      });
    });

    it('TC-BE-11: WHERE clause has OR across all 5 fields', async () => {
      mockQb.getManyAndCount.mockResolvedValue([[], 0]);

      await service.findAll(1, 10, 'test');

      const whereArg = mockQb.where.mock.calls[0][0] as string;
      expect(whereArg).toContain('borrower.firstName ILIKE :term');
      expect(whereArg).toContain('borrower.lastName ILIKE :term');
      expect(whereArg).toContain('borrower.nationalId ILIKE :term');
      expect(whereArg).toContain('vehicle.licensePlateNumber ILIKE :term');
      expect(whereArg).toContain('loan.loanNumber ILIKE :term');
    });

    it('should calculate totalPages correctly when not evenly divisible', async () => {
      mockQb.getManyAndCount.mockResolvedValue([[], 25]);

      const result = await service.findAll(1, 10);

      expect(result.meta.totalPages).toBe(3);
    });

    it('should return totalPages=0 when total is 0', async () => {
      mockQb.getManyAndCount.mockResolvedValue([[], 0]);

      const result = await service.findAll(1, 10);

      expect(result.meta.totalPages).toBe(0);
    });

    it('should return loanNumber in each loan item', async () => {
      const loans = [
        makeLoan({ id: 3, loanNumber: '69-03-3' } as any),
        makeLoan({ id: 2, loanNumber: '69-03-2' } as any),
        makeLoan({ id: 1, loanNumber: '69-03-1' } as any),
      ];
      mockQb.getManyAndCount.mockResolvedValue([loans, 3]);

      const result = await service.findAll(1, 10);
      expect(result.data[0].loanNumber).toBe('69-03-3');
      expect(result.data[2].loanNumber).toBe('69-03-1');
    });
  });

  // ---------------------------------------------------------------------------
  describe('findOne', () => {
    it('should return a loan by id', async () => {
      const loan = makeLoan();
      loanRepo.findOne.mockResolvedValue(loan);

      const result = await service.findOne(1);

      expect(loanRepo.findOne).toHaveBeenCalledWith({ where: { id: 1 } });
      expect(result).toEqual(loan);
    });

    it('should throw NotFoundException when loan does not exist', async () => {
      loanRepo.findOne.mockResolvedValue(null);

      await expect(service.findOne(99)).rejects.toThrow(NotFoundException);
      await expect(service.findOne(99)).rejects.toThrow(
        'Loan with ID 99 not found',
      );
    });
  });

  // ---------------------------------------------------------------------------
  describe('update', () => {
    it('should patch borrower fields', async () => {
      const loan = makeLoan();
      loanRepo.findOne.mockResolvedValue(loan);
      loanRepo.save.mockResolvedValue(loan);

      const dto: UpdateLoanDto = {
        borrower: { firstName: 'ใหม่' } as BorrowerDto,
      };
      await service.update(1, dto);

      expect(loan.borrower.firstName).toBe('ใหม่');
      expect(loanRepo.save).toHaveBeenCalledWith(loan);
    });

    it('should patch vehicle fields', async () => {
      const loan = makeLoan();
      loanRepo.findOne.mockResolvedValue(loan);
      loanRepo.save.mockResolvedValue(loan);

      const dto: UpdateLoanDto = {
        vehicle: { color: 'น้ำเงิน' } as VehicleDto,
      };
      await service.update(1, dto);

      expect(loan.vehicle.color).toBe('น้ำเงิน');
    });

    it('should patch vehicle mileage', async () => {
      const loan = makeLoan();
      loanRepo.findOne.mockResolvedValue(loan);
      loanRepo.save.mockResolvedValue(loan);

      const dto: UpdateLoanDto = {
        vehicle: { mileage: 30000 } as VehicleDto,
      };
      await service.update(1, dto);

      expect(loan.vehicle.mileage).toBe(30000);
    });

    it('should patch vehicle appraisedValue', async () => {
      const loan = makeLoan();
      loanRepo.findOne.mockResolvedValue(loan);
      loanRepo.save.mockResolvedValue(loan);

      const dto: UpdateLoanDto = {
        vehicle: { appraisedValue: 75000 } as VehicleDto,
      };
      await service.update(1, dto);

      expect(loan.vehicle.appraisedValue).toBe(75000);
    });

    it('should replace guarantors with new list', async () => {
      const loan = makeLoan();
      loanRepo.findOne.mockResolvedValue(loan);
      loanRepo.save.mockResolvedValue(loan);
      guarantorRepo.delete.mockResolvedValue(undefined as any);
      guarantorRepo.create.mockReturnValue(mockGuarantorDto as any);
      guarantorRepo.save.mockResolvedValue([mockGuarantorDto]);

      const dto: UpdateLoanDto = { guarantors: [mockGuarantorDto] };
      await service.update(1, dto);

      expect(guarantorRepo.delete).toHaveBeenCalledWith({ loan: { id: 1 } });
      expect(guarantorRepo.save).toHaveBeenCalled();
    });

    it('should clear all guarantors when empty array is passed', async () => {
      const loan = makeLoan();
      loanRepo.findOne.mockResolvedValue(loan);
      loanRepo.save.mockResolvedValue(loan);
      guarantorRepo.delete.mockResolvedValue(undefined as any);

      const dto: UpdateLoanDto = { guarantors: [] };
      await service.update(1, dto);

      expect(guarantorRepo.delete).toHaveBeenCalledWith({ loan: { id: 1 } });
      expect(guarantorRepo.save).not.toHaveBeenCalled();
    });

    it('should not touch guarantors when guarantors field is undefined', async () => {
      const loan = makeLoan();
      loanRepo.findOne.mockResolvedValue(loan);
      loanRepo.save.mockResolvedValue(loan);

      const dto: UpdateLoanDto = {};
      await service.update(1, dto);

      expect(guarantorRepo.delete).not.toHaveBeenCalled();
      expect(guarantorRepo.save).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when more than 2 guarantors are provided', async () => {
      const loan = makeLoan();
      loanRepo.findOne.mockResolvedValue(loan);

      const dto: UpdateLoanDto = {
        guarantors: [mockGuarantorDto, mockGuarantorDto, mockGuarantorDto],
      };

      await expect(service.update(1, dto)).rejects.toThrow(BadRequestException);
      await expect(service.update(1, dto)).rejects.toThrow(
        'guarantors must not exceed 2',
      );
    });

    it('should throw NotFoundException when loan does not exist', async () => {
      loanRepo.findOne.mockResolvedValue(null);

      await expect(service.update(99, {})).rejects.toThrow(NotFoundException);
    });

    it('should return the updated loan via findOne', async () => {
      const loan = makeLoan();
      const updatedLoan = makeLoan({ guarantors: [] });
      loanRepo.findOne
        .mockResolvedValueOnce(loan)
        .mockResolvedValueOnce(updatedLoan);
      loanRepo.save.mockResolvedValue(loan);

      const result = await service.update(1, {});

      expect(loanRepo.findOne).toHaveBeenCalledTimes(2);
      expect(result).toEqual(updatedLoan);
    });

    describe('loan terms update', () => {
      it('TC-BE-TERMS-04: should patch loanAmount on existing loan', async () => {
        const loan = makeLoan();
        loanRepo.findOne.mockResolvedValue(loan);
        loanRepo.save.mockResolvedValue(loan);

        const dto: UpdateLoanDto = { loanAmount: 99000 };
        await service.update(1, dto);

        expect(loan.loanAmount).toBe(99000);
        expect(loanRepo.save).toHaveBeenCalledWith(loan);
      });

      it('TC-BE-TERMS-05: should patch interestRate on existing loan', async () => {
        const loan = makeLoan();
        loanRepo.findOne.mockResolvedValue(loan);
        loanRepo.save.mockResolvedValue(loan);

        const dto: UpdateLoanDto = { interestRate: 6.5 };
        await service.update(1, dto);

        expect(loan.interestRate).toBe(6.5);
        expect(loanRepo.save).toHaveBeenCalledWith(loan);
      });

      it('TC-BE-TERMS-06: should patch paymentFrequency on existing loan', async () => {
        const loan = makeLoan();
        loanRepo.findOne.mockResolvedValue(loan);
        loanRepo.save.mockResolvedValue(loan);

        const dto: UpdateLoanDto = { paymentFrequency: 4 };
        await service.update(1, dto);

        expect(loan.paymentFrequency).toBe(4);
        expect(loanRepo.save).toHaveBeenCalledWith(loan);
      });
    });
  });

  // ---------------------------------------------------------------------------
  describe('getNextSequence', () => {
    it('should return 1 when no loans exist in Bangkok month', async () => {
      loanRepo.count.mockResolvedValue(0);
      const seq = await service.getNextSequence(
        new Date('2026-03-15T10:00:00Z'),
      );
      expect(seq).toBe(1);
    });

    it('should return 3 when 2 loans already exist in Bangkok month', async () => {
      loanRepo.count.mockResolvedValue(2);
      const seq = await service.getNextSequence(
        new Date('2026-03-15T10:00:00Z'),
      );
      expect(seq).toBe(3);
    });

    it('should use Bangkok month boundary — UTC 2026-03-31T18:00Z counts as April', async () => {
      loanRepo.count.mockResolvedValue(0);
      await service.getNextSequence(new Date('2026-03-31T18:00:00Z'));
      // must query with April Bangkok range: start=2026-03-31T17:00:00Z, end=2026-04-30T16:59:59.999Z
      expect(loanRepo.count).toHaveBeenCalledWith({
        where: {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          createdAt: expect.objectContaining({}),
        },
      });
    });

    it('should reset to 1 for a new Bangkok month', async () => {
      loanRepo.count.mockResolvedValue(0);
      const seq = await service.getNextSequence(
        new Date('2026-04-01T00:00:00Z'),
      );
      expect(seq).toBe(1);
    });
  });

  // ---------------------------------------------------------------------------
  describe('remove', () => {
    it('should remove a loan', async () => {
      const loan = makeLoan();
      loanRepo.findOne.mockResolvedValue(loan);
      loanRepo.remove.mockResolvedValue(loan);

      await service.remove(1);

      expect(loanRepo.remove).toHaveBeenCalledWith(loan);
    });

    it('should throw NotFoundException when loan does not exist', async () => {
      loanRepo.findOne.mockResolvedValue(null);

      await expect(service.remove(99)).rejects.toThrow(NotFoundException);
      await expect(service.remove(99)).rejects.toThrow(
        'Loan with ID 99 not found',
      );
    });
  });
});

// =============================================================================
// Installment utility tests (pure functions — no DI needed)
// =============================================================================

describe('roundInstallmentAmount', () => {
  it('TC-BE-01: already ends in .00 → unchanged', () => {
    expect(roundInstallmentAmount(500.0)).toBe(500.0);
  });

  it('TC-BE-02: already ends in .50 → unchanged', () => {
    expect(roundInstallmentAmount(100.5)).toBe(100.5);
  });

  it('TC-BE-03: 100.01 → 100.50', () => {
    expect(roundInstallmentAmount(100.01)).toBe(100.5);
  });

  it('TC-BE-04: 100.51 → 101.00', () => {
    expect(roundInstallmentAmount(100.51)).toBe(101.0);
  });

  it('TC-BE-05: 100.25 → 100.50', () => {
    expect(roundInstallmentAmount(100.25)).toBe(100.5);
  });
});

describe('calculateInstallmentSchedule', () => {
  const baseLoan = {
    loanAmount: 10000,
    interestRate: 24, // 24% per year
    numberOfInstallments: 12,
    paymentFrequency: 1, // 1x per month
    createdAt: new Date('2026-01-15'),
  };

  it('TC-BE-06: returns numberOfInstallments number of items', () => {
    const result = calculateInstallmentSchedule(baseLoan);
    expect(result).toHaveLength(12);
  });

  it('TC-BE-07: installment amount = roundUp(total / count)', () => {
    // interest = 10000 × 0.24 × (12/12) = 2400
    // total = 12400, per installment = 12400/12 = 1033.33 → rounds to 1033.50
    const result = calculateInstallmentSchedule(baseLoan);
    expect(result[0].amount).toBe(1033.5);
  });

  it('TC-BE-08: last installment absorbs rounding diff — sum ≈ principal + interest', () => {
    const result = calculateInstallmentSchedule(baseLoan);
    const sum = result.reduce((acc, i) => acc + i.amount, 0);
    const expected = 10000 + 10000 * 0.24 * (12 / 12);
    expect(sum).toBeCloseTo(expected, 0);
  });

  it('TC-BE-09: due dates increment by 1 month for frequency=1', () => {
    const result = calculateInstallmentSchedule(baseLoan);
    expect(result[0].dueDate).toEqual(new Date('2026-02-15'));
    expect(result[1].dueDate).toEqual(new Date('2026-03-15'));
    expect(result[11].dueDate).toEqual(new Date('2027-01-15'));
  });

  it('TC-BE-10: installmentNo starts at 1 and increments to numberOfInstallments', () => {
    const result = calculateInstallmentSchedule(baseLoan);
    expect(result[0].installmentNo).toBe(1);
    expect(result[11].installmentNo).toBe(12);
  });

  it('TC-BE-11: frequency=4 (weekly) — due dates increment by 1 week', () => {
    const loan = {
      ...baseLoan,
      paymentFrequency: 4,
      numberOfInstallments: 4,
      createdAt: new Date('2026-01-01'),
    };
    const result = calculateInstallmentSchedule(loan);
    expect(result[0].dueDate).toEqual(new Date('2026-01-08'));
    expect(result[1].dueDate).toEqual(new Date('2026-01-15'));
  });
});

describe('LoanService.getInstallmentSchedule', () => {
  let service: LoanService;

  const loanRepo = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    createQueryBuilder: jest.fn(),
    remove: jest.fn(),
    count: jest.fn(),
  };
  const guarantorRepo = { create: jest.fn(), save: jest.fn(), delete: jest.fn() };

  const baseLoan = {
    loanAmount: 10000,
    interestRate: 24,
    numberOfInstallments: 12,
    paymentFrequency: 1,
    createdAt: new Date('2026-01-15'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LoanService,
        { provide: getRepositoryToken(Loan), useValue: loanRepo },
        { provide: getRepositoryToken(Guarantor), useValue: guarantorRepo },
      ],
    }).compile();

    service = module.get<LoanService>(LoanService);
    jest.clearAllMocks();
  });

  it('TC-BE-12: returns schedule with correct shape for existing loan', async () => {
    loanRepo.findOne.mockResolvedValue({ id: 1, ...baseLoan });
    const result = await service.getInstallmentSchedule(1);
    expect(result).toHaveLength(12);
    expect(result[0]).toMatchObject({
      installmentNo: 1,
      amount: expect.any(Number),
      dueDate: expect.any(Date),
      paidDate: null,
      remainingBalance: expect.any(Number),
      outstandingAmount: expect.any(Number),
      status: expect.any(String),
      remark: null,
    });
  });

  it('TC-BE-13: throws NotFoundException for non-existent loan', async () => {
    loanRepo.findOne.mockResolvedValue(null);
    await expect(service.getInstallmentSchedule(999)).rejects.toThrow(
      NotFoundException,
    );
  });
});
