import { Test, TestingModule } from '@nestjs/testing'
import { PaymentController } from './payment.controller'
import { PaymentService } from './payment.service'
import { CreatePaymentDto } from './dto/create-payment.dto'

const mockSummary = { autoPenalty: 200, overdueInstallments: 1000, total: 1200 }
const mockAllocation = {
  penaltyPaid: 200,
  lateFeePaid: 0,
  installmentsPaid: [{ id: 1, fullyPaid: false, partialAmount: 300 }],
  credit: 0,
}

describe('PaymentController', () => {
  let controller: PaymentController
  let service: jest.Mocked<PaymentService>

  const mockPaymentService = {
    getPaymentSummary: jest.fn(),
    processPayment: jest.fn(),
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PaymentController],
      providers: [{ provide: PaymentService, useValue: mockPaymentService }],
    }).compile()

    controller = module.get<PaymentController>(PaymentController)
    service = module.get(PaymentService)
    jest.clearAllMocks()
  })

  it('should be defined', () => {
    expect(controller).toBeDefined()
  })

  // ── getPaymentSummary ───────────────────────────────────────────────────

  describe('getPaymentSummary', () => {
    it('TC-CT-01: converts string id to number and delegates to service', async () => {
      service.getPaymentSummary.mockResolvedValue(mockSummary)

      const result = await controller.getPaymentSummary('1')

      expect(service.getPaymentSummary).toHaveBeenCalledWith(1)
      expect(result).toEqual(mockSummary)
    })

    it('TC-CT-02: passes any numeric id correctly', async () => {
      service.getPaymentSummary.mockResolvedValue(mockSummary)

      await controller.getPaymentSummary('42')

      expect(service.getPaymentSummary).toHaveBeenCalledWith(42)
    })

    it('TC-CT-03: returns service result as-is', async () => {
      const summary = { autoPenalty: 0, overdueInstallments: 5000, total: 5000 }
      service.getPaymentSummary.mockResolvedValue(summary)

      const result = await controller.getPaymentSummary('5')

      expect(result).toEqual(summary)
    })
  })

  // ── processPayment ──────────────────────────────────────────────────────

  describe('processPayment', () => {
    it('TC-CT-04: converts string id to number and delegates to service', async () => {
      service.processPayment.mockResolvedValue(mockAllocation)
      const dto: CreatePaymentDto = { amount: 500, lateFee: 0 }

      const result = await controller.processPayment('1', dto)

      expect(service.processPayment).toHaveBeenCalledWith(1, dto)
      expect(result).toEqual(mockAllocation)
    })

    it('TC-CT-05: passes dto with lateFee to service', async () => {
      service.processPayment.mockResolvedValue(mockAllocation)
      const dto: CreatePaymentDto = { amount: 1500, lateFee: 100 }

      await controller.processPayment('3', dto)

      expect(service.processPayment).toHaveBeenCalledWith(3, dto)
    })

    it('TC-CT-06: passes dto without lateFee to service', async () => {
      service.processPayment.mockResolvedValue(mockAllocation)
      const dto: CreatePaymentDto = { amount: 1000 }

      await controller.processPayment('7', dto)

      expect(service.processPayment).toHaveBeenCalledWith(7, dto)
    })

    it('TC-CT-07: returns service result as-is', async () => {
      const allocation = { penaltyPaid: 0, lateFeePaid: 0, installmentsPaid: [], credit: 500 }
      service.processPayment.mockResolvedValue(allocation)

      const result = await controller.processPayment('1', { amount: 500 })

      expect(result).toEqual(allocation)
    })
  })
})
