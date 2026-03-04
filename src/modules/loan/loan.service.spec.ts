import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { LoanService } from './loan.service';
import { Loan } from './entities/loan.entity';
import { Guarantor } from './entities/guarantor.entity';
import {
  CreateLoanDto,
  BorrowerDto,
  VehicleDto,
  GuarantorDto,
} from './dto/create-loan.dto';
import { UpdateLoanDto } from './dto/update-loan.dto';

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
};

const mockGuarantorDto: GuarantorDto = {
  ...mockBorrowerDto,
  firstName: 'สมหญิง',
  nationalId: '9876543210123',
};

const makeLoan = (overrides: Partial<Loan> = {}): Loan =>
  ({
    id: 1,
    borrower: {
      ...mockBorrowerDto,
      id: 1,
      loan: null as any,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    vehicle: {
      ...mockVehicleDto,
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

describe('LoanService', () => {
  let service: LoanService;

  const loanRepo = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    findAndCount: jest.fn(),
    remove: jest.fn(),
    count: jest.fn(),
  };

  const guarantorRepo = {
    create: jest.fn(),
    save: jest.fn(),
    delete: jest.fn(),
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

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ---------------------------------------------------------------------------
  describe('create', () => {
    it('should create a loan without guarantors', async () => {
      const dto: CreateLoanDto = {
        borrower: mockBorrowerDto,
        vehicle: mockVehicleDto,
        guarantors: [],
      };
      const loan = makeLoan();

      loanRepo.create.mockReturnValue(loan);
      loanRepo.save.mockResolvedValue(loan);
      loanRepo.findOne.mockResolvedValue(loan);

      const result = await service.create(dto);

      expect(loanRepo.create).toHaveBeenCalledWith({
        borrower: mockBorrowerDto,
        vehicle: mockVehicleDto,
      });
      expect(loanRepo.save).toHaveBeenCalledWith(loan);
      expect(guarantorRepo.save).not.toHaveBeenCalled();
      expect(result).toEqual(loan);
    });

    it('should create a loan with 1 guarantor', async () => {
      const dto: CreateLoanDto = {
        borrower: mockBorrowerDto,
        vehicle: mockVehicleDto,
        guarantors: [mockGuarantorDto],
      };
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
      const savedLoan = makeLoan({ loanNumber: '69-04-1', createdAt: new Date('2026-03-31T18:00:00Z') } as any);
      loanRepo.create.mockReturnValue(savedLoan);
      loanRepo.save.mockResolvedValue(savedLoan);
      loanRepo.findOne.mockResolvedValue(savedLoan);

      const dto: CreateLoanDto = { borrower: mockBorrowerDto, vehicle: mockVehicleDto, guarantors: [] };
      const result = await service.create(dto);
      expect(result.loanNumber).toBe('69-04-1');
      jest.useRealTimers();
    });

    it('should generate loanNumber as third loan of the Bangkok month', async () => {
      loanRepo.count.mockResolvedValue(2);
      const savedLoan = makeLoan({ loanNumber: '69-03-3', createdAt: new Date('2026-03-20T10:00:00Z') } as any);
      loanRepo.create.mockReturnValue(savedLoan);
      loanRepo.save.mockResolvedValue(savedLoan);
      loanRepo.findOne.mockResolvedValue(savedLoan);

      const dto: CreateLoanDto = { borrower: mockBorrowerDto, vehicle: mockVehicleDto, guarantors: [] };
      const result = await service.create(dto);
      expect(result.loanNumber).toBe('69-03-3');
    });

    it('should create a loan with 2 guarantors', async () => {
      const dto: CreateLoanDto = {
        borrower: mockBorrowerDto,
        vehicle: mockVehicleDto,
        guarantors: [
          mockGuarantorDto,
          { ...mockGuarantorDto, firstName: 'คนที่สอง' },
        ],
      };
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
  });

  // ---------------------------------------------------------------------------
  describe('findAll', () => {
    it('should return paginated loans for page 1', async () => {
      const loans = [makeLoan()];
      loanRepo.findAndCount.mockResolvedValue([loans, 1]);

      const result = await service.findAll(1, 10);

      expect(loanRepo.findAndCount).toHaveBeenCalledWith({
        skip: 0,
        take: 10,
        order: { createdAt: 'DESC' },
      });
      expect(result).toEqual({
        data: loans,
        meta: { total: 1, page: 1, limit: 10, totalPages: 1 },
      });
    });

    it('should skip records correctly for page 2', async () => {
      loanRepo.findAndCount.mockResolvedValue([[], 25]);

      await service.findAll(2, 10);

      expect(loanRepo.findAndCount).toHaveBeenCalledWith({
        skip: 10,
        take: 10,
        order: { createdAt: 'DESC' },
      });
    });

    it('should calculate totalPages correctly when not evenly divisible', async () => {
      loanRepo.findAndCount.mockResolvedValue([[], 25]);

      const result = await service.findAll(1, 10);

      expect(result.meta.totalPages).toBe(3);
    });

    it('should return totalPages=0 when total is 0', async () => {
      loanRepo.findAndCount.mockResolvedValue([[], 0]);

      const result = await service.findAll(1, 10);

      expect(result.meta.totalPages).toBe(0);
    });

    it('should return loanNumber in each loan item', async () => {
      const loans = [
        makeLoan({ id: 3, loanNumber: '69-03-3' } as any),
        makeLoan({ id: 2, loanNumber: '69-03-2' } as any),
        makeLoan({ id: 1, loanNumber: '69-03-1' } as any),
      ];
      loanRepo.findAndCount.mockResolvedValue([loans, 3]);

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
  });

  // ---------------------------------------------------------------------------
  describe('getNextSequence', () => {
    it('should return 1 when no loans exist in Bangkok month', async () => {
      loanRepo.count.mockResolvedValue(0);
      const seq = await service.getNextSequence(new Date('2026-03-15T10:00:00Z'));
      expect(seq).toBe(1);
    });

    it('should return 3 when 2 loans already exist in Bangkok month', async () => {
      loanRepo.count.mockResolvedValue(2);
      const seq = await service.getNextSequence(new Date('2026-03-15T10:00:00Z'));
      expect(seq).toBe(3);
    });

    it('should use Bangkok month boundary — UTC 2026-03-31T18:00Z counts as April', async () => {
      loanRepo.count.mockResolvedValue(0);
      await service.getNextSequence(new Date('2026-03-31T18:00:00Z'));
      // must query with April Bangkok range: start=2026-03-31T17:00:00Z, end=2026-04-30T16:59:59.999Z
      expect(loanRepo.count).toHaveBeenCalledWith({
        where: {
          createdAt: expect.objectContaining({}),
        },
      });
    });

    it('should reset to 1 for a new Bangkok month', async () => {
      loanRepo.count.mockResolvedValue(0);
      const seq = await service.getNextSequence(new Date('2026-04-01T00:00:00Z'));
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
