import { Test, TestingModule } from '@nestjs/testing';
import { LoanController } from './loan.controller';
import { LoanService } from './loan.service';
import {
  CreateLoanDto,
  BorrowerDto,
  VehicleDto,
  GuarantorDto,
} from './dto/create-loan.dto';
import { UpdateLoanDto } from './dto/update-loan.dto';
import { Loan } from './entities/loan.entity';
import { PaginatedLoanDto } from './dto/paginated-loan.dto';

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

const mockLoan = {
  id: 1,
  borrower: mockBorrowerDto,
  vehicle: mockVehicleDto,
  guarantors: [],
  createdAt: new Date(),
  updatedAt: new Date(),
} as unknown as Loan;

const mockPaginated: PaginatedLoanDto = {
  data: [mockLoan],
  meta: { total: 1, page: 1, limit: 10, totalPages: 1 },
};

describe('LoanController', () => {
  let controller: LoanController;
  let service: jest.Mocked<LoanService>;

  const mockLoanService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [LoanController],
      providers: [{ provide: LoanService, useValue: mockLoanService }],
    }).compile();

    controller = module.get<LoanController>(LoanController);
    service = module.get(LoanService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  // ---------------------------------------------------------------------------
  describe('create', () => {
    it('should call service.create with the dto and return the result', async () => {
      const dto: CreateLoanDto = {
        borrower: mockBorrowerDto,
        vehicle: mockVehicleDto,
        guarantors: [],
      };
      service.create.mockResolvedValue(mockLoan);

      const result = await controller.create(dto);

      expect(service.create).toHaveBeenCalledWith(dto);
      expect(result).toEqual(mockLoan);
    });

    it('should call service.create with guarantors', async () => {
      const dto: CreateLoanDto = {
        borrower: mockBorrowerDto,
        vehicle: mockVehicleDto,
        guarantors: [mockGuarantorDto],
      };
      service.create.mockResolvedValue(mockLoan);

      await controller.create(dto);

      expect(service.create).toHaveBeenCalledWith(dto);
    });
  });

  // ---------------------------------------------------------------------------
  describe('findAll', () => {
    it('should convert string query params to numbers and delegate to service', async () => {
      service.findAll.mockResolvedValue(mockPaginated);

      const result = await controller.findAll('2', '5');

      expect(service.findAll).toHaveBeenCalledWith(2, 5);
      expect(result).toEqual(mockPaginated);
    });

    it('should use default values (page=1, limit=10) when not supplied', async () => {
      service.findAll.mockResolvedValue(mockPaginated);

      // default values are assigned by NestJS as string '1' / '10'
      await controller.findAll('1', '10');

      expect(service.findAll).toHaveBeenCalledWith(1, 10);
    });

    it('should return paginated result from service', async () => {
      const paginated: PaginatedLoanDto = {
        data: [],
        meta: { total: 0, page: 3, limit: 5, totalPages: 0 },
      };
      service.findAll.mockResolvedValue(paginated);

      const result = await controller.findAll('3', '5');

      expect(result).toEqual(paginated);
    });
  });

  // ---------------------------------------------------------------------------
  describe('findOne', () => {
    it('should convert string id to number and return loan', async () => {
      service.findOne.mockResolvedValue(mockLoan);

      const result = await controller.findOne('1');

      expect(service.findOne).toHaveBeenCalledWith(1);
      expect(result).toEqual(mockLoan);
    });

    it('should pass any numeric id correctly', async () => {
      service.findOne.mockResolvedValue(mockLoan);

      await controller.findOne('42');

      expect(service.findOne).toHaveBeenCalledWith(42);
    });
  });

  // ---------------------------------------------------------------------------
  describe('update', () => {
    it('should convert string id to number and call service.update', async () => {
      const dto: UpdateLoanDto = {
        borrower: { firstName: 'ใหม่' } as BorrowerDto,
      };
      service.update.mockResolvedValue(mockLoan);

      const result = await controller.update('1', dto);

      expect(service.update).toHaveBeenCalledWith(1, dto);
      expect(result).toEqual(mockLoan);
    });

    it('should pass partial dto with guarantors', async () => {
      const dto: UpdateLoanDto = { guarantors: [mockGuarantorDto] };
      service.update.mockResolvedValue(mockLoan);

      await controller.update('5', dto);

      expect(service.update).toHaveBeenCalledWith(5, dto);
    });

    it('should pass empty dto (no changes)', async () => {
      const dto: UpdateLoanDto = {};
      service.update.mockResolvedValue(mockLoan);

      await controller.update('1', dto);

      expect(service.update).toHaveBeenCalledWith(1, dto);
    });
  });

  // ---------------------------------------------------------------------------
  describe('remove', () => {
    it('should convert string id to number and call service.remove', async () => {
      service.remove.mockResolvedValue(undefined);

      await controller.remove('1');

      expect(service.remove).toHaveBeenCalledWith(1);
    });

    it('should pass any numeric id correctly', async () => {
      service.remove.mockResolvedValue(undefined);

      await controller.remove('99');

      expect(service.remove).toHaveBeenCalledWith(99);
    });
  });
});
