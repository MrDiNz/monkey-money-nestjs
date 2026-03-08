import { Test, TestingModule } from '@nestjs/testing'
import { NotFoundException } from '@nestjs/common'
import { getRepositoryToken } from '@nestjs/typeorm'
import { calculateAutoPenalty, applyPayment } from './utils/payment.util'
import { PaymentService } from './payment.service'
import { Installment, InstallmentStatus } from './entities/installment.entity'
import { InstallmentPayment } from './entities/installment-payment.entity'
import { AutoPenalty } from './entities/auto-penalty.entity'
import { Loan } from '@/modules/loan/entities/loan.entity'

// ─── Pure function tests ─────────────────────────────────────────────────────

describe('calculateAutoPenalty', () => {
  it('TC-BE-01: all installments in the future → 0', () => {
    const installments = [{ dueDate: new Date('2026-05-01'), status: 'UNPAID' }]
    expect(calculateAutoPenalty(installments, new Date('2026-04-01'))).toBe(0)
  })

  it('TC-BE-02: overdue < 1 full month → 0', () => {
    const installments = [{ dueDate: new Date('2026-04-04'), status: 'UNPAID' }]
    expect(calculateAutoPenalty(installments, new Date('2026-04-05'))).toBe(0)
  })

  it('TC-BE-03: overdue 1 full month → 100', () => {
    const installments = [{ dueDate: new Date('2026-03-04'), status: 'UNPAID' }]
    expect(calculateAutoPenalty(installments, new Date('2026-04-05'))).toBe(100)
  })

  it('TC-BE-04: overdue 2 full months → 200', () => {
    const installments = [{ dueDate: new Date('2026-03-04'), status: 'UNPAID' }]
    expect(calculateAutoPenalty(installments, new Date('2026-05-05'))).toBe(200)
  })

  it('TC-BE-05: 2 installments overdue — Mar(2mo) + Apr(1mo) = 300', () => {
    const installments = [
      { dueDate: new Date('2026-03-04'), status: 'UNPAID' },
      { dueDate: new Date('2026-04-04'), status: 'UNPAID' },
    ]
    expect(calculateAutoPenalty(installments, new Date('2026-05-05'))).toBe(300)
  })

  it('TC-BE-06: already PAID installments excluded from penalty', () => {
    const installments = [
      { dueDate: new Date('2026-03-04'), status: 'PAID' },
      { dueDate: new Date('2026-04-04'), status: 'UNPAID' },
    ]
    expect(calculateAutoPenalty(installments, new Date('2026-05-05'))).toBe(100)
  })
})

describe('applyPayment', () => {
  const installments = [
    { id: 1, dueDate: new Date('2026-02-01'), amount: 1000, paidAmount: 0, status: 'UNPAID' },
    { id: 2, dueDate: new Date('2026-03-01'), amount: 1000, paidAmount: 0, status: 'UNPAID' },
  ]

  it('TC-BE-07: amount covers only auto_penalty — installments untouched', () => {
    const result = applyPayment({ installments, autoPenalty: 200 }, 200, 0)
    expect(result.penaltyPaid).toBe(200)
    expect(result.lateFeePaid).toBe(0)
    expect(result.installmentsPaid).toHaveLength(0)
    expect(result.credit).toBe(0)
  })

  it('TC-BE-08: amount covers penalty + late_fee + 1 installment exactly', () => {
    const result = applyPayment({ installments, autoPenalty: 200 }, 1250, 50)
    expect(result.penaltyPaid).toBe(200)
    expect(result.lateFeePaid).toBe(50)
    expect(result.installmentsPaid).toHaveLength(1)
    expect(result.installmentsPaid[0].id).toBe(1)
    expect(result.credit).toBe(0)
  })

  it('TC-BE-09: overpayment → credit carries forward', () => {
    const result = applyPayment({ installments, autoPenalty: 0 }, 2300, 0)
    expect(result.installmentsPaid).toHaveLength(2)
    expect(result.credit).toBe(300)
  })

  it('TC-BE-10: amount < installment amount — partial sub-payment, installment stays UNPAID', () => {
    const result = applyPayment({ installments, autoPenalty: 0 }, 500, 0)
    expect(result.installmentsPaid[0].partialAmount).toBe(500)
    expect(result.installmentsPaid[0].fullyPaid).toBe(false)
    expect(result.credit).toBe(0)
  })

  it('TC-BE-11: amount < auto_penalty — only partial penalty paid', () => {
    const result = applyPayment({ installments, autoPenalty: 300 }, 100, 0)
    expect(result.penaltyPaid).toBe(100)
    expect(result.lateFeePaid).toBe(0)
    expect(result.installmentsPaid).toHaveLength(0)
  })

  it('TC-BE-12: multiple sub-payments on same installment accumulate correctly', () => {
    const installmentsWithPartial = [
      { id: 1, dueDate: new Date('2026-02-01'), amount: 1000, paidAmount: 400, status: 'UNPAID' },
    ]
    const result = applyPayment({ installments: installmentsWithPartial, autoPenalty: 0 }, 600, 0)
    expect(result.installmentsPaid[0].fullyPaid).toBe(true)
  })
})

// ─── PaymentService unit tests ───────────────────────────────────────────────

describe('PaymentService', () => {
  let service: PaymentService

  const installmentRepo = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
  }
  const installmentPaymentRepo = {
    create: jest.fn(),
    save: jest.fn(),
  }
  const autoPenaltyRepo = {
    create: jest.fn(),
    save: jest.fn(),
  }
  const loanRepo = {
    findOne: jest.fn(),
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentService,
        { provide: getRepositoryToken(Installment), useValue: installmentRepo },
        { provide: getRepositoryToken(InstallmentPayment), useValue: installmentPaymentRepo },
        { provide: getRepositoryToken(AutoPenalty), useValue: autoPenaltyRepo },
        { provide: getRepositoryToken(Loan), useValue: loanRepo },
      ],
    }).compile()

    service = module.get<PaymentService>(PaymentService)
    jest.clearAllMocks()
  })

  // ── generateInstallments ──────────────────────────────────────────────────

  describe('generateInstallments', () => {
    const makeLoan = (overrides = {}) =>
      ({
        id: 1,
        loanAmount: 3000,
        numberOfInstallments: 3,
        interestRate: 0,
        paymentFrequency: 1,
        createdAt: new Date('2026-01-15T00:00:00Z'),
        ...overrides,
      }) as Loan

    it('TC-SVC-01: creates numberOfInstallments installments', async () => {
      const created: object[] = []
      installmentRepo.create.mockImplementation((d: object) => { created.push(d); return d })
      installmentRepo.save.mockResolvedValue(created)

      await service.generateInstallments(makeLoan())

      expect(installmentRepo.create).toHaveBeenCalledTimes(3)
      expect(installmentRepo.save).toHaveBeenCalledWith(expect.arrayContaining([expect.any(Object)]))
    })

    it('TC-SVC-02: each installment amount = loanAmount / numberOfInstallments', async () => {
      const created: Array<{ amount: number }> = []
      installmentRepo.create.mockImplementation((d: { amount: number }) => { created.push(d); return d })
      installmentRepo.save.mockResolvedValue(created)

      await service.generateInstallments(makeLoan())

      created.forEach((inst) => expect(inst.amount).toBe(1000))
    })

    it('TC-SVC-03: due dates are monthly ascending from loan creation date', async () => {
      const created: Array<{ dueDate: Date }> = []
      installmentRepo.create.mockImplementation((d: { dueDate: Date }) => { created.push(d); return d })
      installmentRepo.save.mockResolvedValue(created)

      await service.generateInstallments(makeLoan())

      // createdAt Jan 15 → due dates Feb 15, Mar 15, Apr 15
      expect(created[0].dueDate).toEqual(new Date('2026-02-15T00:00:00Z'))
      expect(created[1].dueDate).toEqual(new Date('2026-03-15T00:00:00Z'))
      expect(created[2].dueDate).toEqual(new Date('2026-04-15T00:00:00Z'))
    })

    it('TC-SVC-03b: installment amount includes interest and ends in .00 or .50 (rounding rule)', async () => {
      // loanAmount=10000, interestRate=24, n=12, freq=1
      // interest = 10000 × 0.24 × (12/12) = 2400 → total = 12400
      // 12400 / 12 = 1033.333... → roundUp → 1033.50
      const created: Array<{ amount: number }> = []
      installmentRepo.create.mockImplementation((d: { amount: number }) => { created.push(d); return d })
      installmentRepo.save.mockResolvedValue(created)

      await service.generateInstallments(
        makeLoan({ loanAmount: 10000, numberOfInstallments: 12, interestRate: 24, paymentFrequency: 1 }),
      )

      created.slice(0, -1).forEach((inst) => {
        expect(inst.amount).toBe(1033.5)
        const cents = Math.round((inst.amount % 1) * 100)
        expect(cents === 0 || cents === 50).toBe(true)
      })
    })

    it('TC-SVC-04: all installments start as UNPAID with paidAmount=0', async () => {
      const created: Array<{ status: InstallmentStatus; paidAmount: number }> = []
      installmentRepo.create.mockImplementation(
        (d: { status: InstallmentStatus; paidAmount: number }) => { created.push(d); return d },
      )
      installmentRepo.save.mockResolvedValue(created)

      await service.generateInstallments(makeLoan())

      created.forEach((inst) => {
        expect(inst.status).toBe(InstallmentStatus.UNPAID)
        expect(inst.paidAmount).toBe(0)
      })
    })
  })

  // ── getPaymentSummary ─────────────────────────────────────────────────────

  describe('getPaymentSummary', () => {
    it('TC-SVC-05: returns 0s when no unpaid installments', async () => {
      loanRepo.findOne.mockResolvedValue({ id: 1 })
      installmentRepo.find.mockResolvedValue([])

      const result = await service.getPaymentSummary(1, new Date('2026-04-01'))

      expect(result).toEqual({ autoPenalty: 0, overdueInstallments: 0, total: 0 })
    })

    it('TC-SVC-06: calculates autoPenalty and overdueInstallments correctly', async () => {
      loanRepo.findOne.mockResolvedValue({ id: 1 })
      installmentRepo.find.mockResolvedValue([
        { dueDate: new Date('2026-03-04'), amount: 1000, paidAmount: 0, status: 'UNPAID' },
      ])

      // 2 months overdue → 200 penalty; 1000 remaining installment → total 1200
      const result = await service.getPaymentSummary(1, new Date('2026-05-05'))

      expect(result.autoPenalty).toBe(200)
      expect(result.overdueInstallments).toBe(1000)
      expect(result.total).toBe(1200)
    })

    it('TC-SVC-07: accounts for paidAmount in overdueInstallments total', async () => {
      loanRepo.findOne.mockResolvedValue({ id: 1 })
      installmentRepo.find.mockResolvedValue([
        { dueDate: new Date('2026-03-04'), amount: 1000, paidAmount: 400, status: 'PARTIAL' },
      ])

      const result = await service.getPaymentSummary(1, new Date('2026-04-01'))

      expect(result.overdueInstallments).toBe(600) // 1000 - 400
    })

    it('TC-SVC-08: throws NotFoundException when loan not found', async () => {
      loanRepo.findOne.mockResolvedValue(null)

      await expect(service.getPaymentSummary(99, new Date())).rejects.toThrow(NotFoundException)
      await expect(service.getPaymentSummary(99, new Date())).rejects.toThrow(
        'Loan with ID 99 not found',
      )
    })
  })

  // ── processPayment ────────────────────────────────────────────────────────

  describe('processPayment', () => {
    const mockLoan = { id: 1 } as Loan
    const REF = new Date('2026-05-05') // referenceDate used in most tests

    beforeEach(() => {
      installmentRepo.save.mockResolvedValue({})
      installmentPaymentRepo.create.mockReturnValue({})
      installmentPaymentRepo.save.mockResolvedValue({})
      autoPenaltyRepo.create.mockReturnValue({})
      autoPenaltyRepo.save.mockResolvedValue({})
    })

    it('TC-SVC-09: throws NotFoundException when loan not found', async () => {
      loanRepo.findOne.mockResolvedValue(null)
      installmentRepo.find.mockResolvedValue([])

      await expect(service.processPayment(99, { amount: 1000 }, REF)).rejects.toThrow(
        NotFoundException,
      )
    })

    it('TC-SVC-10: deducts auto penalty before installment (TC-INT-03 equivalent)', async () => {
      loanRepo.findOne.mockResolvedValue(mockLoan)
      // 2 months overdue → penalty = 200
      installmentRepo.find.mockResolvedValue([
        { id: 1, dueDate: new Date('2026-03-04'), amount: 1000, paidAmount: 0, status: 'UNPAID' },
      ])

      const result = await service.processPayment(1, { amount: 500, lateFee: 0 }, REF)

      expect(result.penaltyPaid).toBe(200)
      expect(result.installmentsPaid[0].partialAmount).toBe(300)
    })

    it('TC-SVC-11: saves AutoPenalty record when penalty is collected', async () => {
      loanRepo.findOne.mockResolvedValue(mockLoan)
      installmentRepo.find.mockResolvedValue([
        { id: 1, dueDate: new Date('2026-03-04'), amount: 1000, paidAmount: 0, status: 'UNPAID' },
      ])

      await service.processPayment(1, { amount: 500 }, REF)

      expect(autoPenaltyRepo.save).toHaveBeenCalledTimes(1)
    })

    it('TC-SVC-12: does NOT save AutoPenalty when no penalty applicable', async () => {
      loanRepo.findOne.mockResolvedValue(mockLoan)
      // Future installment → 0 months overdue → 0 penalty
      installmentRepo.find.mockResolvedValue([
        { id: 1, dueDate: new Date('2026-06-01'), amount: 1000, paidAmount: 0, status: 'UNPAID' },
      ])

      await service.processPayment(1, { amount: 1000 }, new Date('2026-04-01'))

      expect(autoPenaltyRepo.save).not.toHaveBeenCalled()
    })

    it('TC-SVC-13: marks installment as PAID when fully covered', async () => {
      loanRepo.findOne.mockResolvedValue(mockLoan)
      // Future due date → 0 months overdue → no penalty
      const inst = { id: 1, dueDate: new Date('2026-06-01'), amount: 1000, paidAmount: 0, status: 'UNPAID' as InstallmentStatus }
      installmentRepo.find.mockResolvedValue([inst])

      await service.processPayment(1, { amount: 1000 }, new Date('2026-04-01'))

      expect(inst.status).toBe(InstallmentStatus.PAID)
    })

    it('TC-SVC-14: marks installment as PARTIAL when partially covered', async () => {
      loanRepo.findOne.mockResolvedValue(mockLoan)
      // Future due date → 0 months overdue → no penalty
      const inst = { id: 1, dueDate: new Date('2026-06-01'), amount: 1000, paidAmount: 0, status: 'UNPAID' as InstallmentStatus }
      installmentRepo.find.mockResolvedValue([inst])

      await service.processPayment(1, { amount: 600 }, new Date('2026-04-01'))

      expect(inst.status).toBe(InstallmentStatus.PARTIAL)
      expect(inst.paidAmount).toBe(600)
    })

    it('TC-SVC-15: credit carries to next installment when first is fully paid (TC-INT-04 equivalent)', async () => {
      loanRepo.findOne.mockResolvedValue(mockLoan)
      // Future due dates → no penalty; 1300 = inst1(1000 fully) + inst2(300 partial)
      installmentRepo.find.mockResolvedValue([
        { id: 1, dueDate: new Date('2026-06-01'), amount: 1000, paidAmount: 0, status: 'UNPAID' },
        { id: 2, dueDate: new Date('2026-07-01'), amount: 1000, paidAmount: 0, status: 'UNPAID' },
      ])

      const result = await service.processPayment(1, { amount: 1300 }, new Date('2026-04-01'))

      expect(result.installmentsPaid).toHaveLength(2)
      expect(result.installmentsPaid[0].fullyPaid).toBe(true)
      expect(result.installmentsPaid[1].partialAmount).toBe(300)
      expect(result.credit).toBe(0)
    })

    it('TC-SVC-16: returns credit when amount exceeds all installments', async () => {
      loanRepo.findOne.mockResolvedValue(mockLoan)
      // Future due date → no penalty; 1300 - 1000 installment = 300 credit
      installmentRepo.find.mockResolvedValue([
        { id: 1, dueDate: new Date('2026-06-01'), amount: 1000, paidAmount: 0, status: 'UNPAID' },
      ])

      const result = await service.processPayment(1, { amount: 1300 }, new Date('2026-04-01'))

      expect(result.credit).toBe(300)
    })

    it('TC-SVC-17: creates InstallmentPayment record for each installment touched', async () => {
      loanRepo.findOne.mockResolvedValue(mockLoan)
      installmentRepo.find.mockResolvedValue([
        { id: 1, dueDate: new Date('2026-02-01'), amount: 1000, paidAmount: 0, status: 'UNPAID' },
        { id: 2, dueDate: new Date('2026-03-01'), amount: 1000, paidAmount: 0, status: 'UNPAID' },
      ])

      await service.processPayment(1, { amount: 2000 }, new Date('2026-04-01'))

      expect(installmentPaymentRepo.save).toHaveBeenCalledTimes(2)
    })

    it('TC-SVC-18: applies lateFee deduction between penalty and installment', async () => {
      loanRepo.findOne.mockResolvedValue(mockLoan)
      // no penalty (future due date)
      installmentRepo.find.mockResolvedValue([
        { id: 1, dueDate: new Date('2026-06-01'), amount: 1000, paidAmount: 0, status: 'UNPAID' },
      ])

      // 150 amount − 50 lateFee = 100 toward installment
      const result = await service.processPayment(
        1,
        { amount: 150, lateFee: 50 },
        new Date('2026-04-01'),
      )

      expect(result.lateFeePaid).toBe(50)
      expect(result.installmentsPaid[0].partialAmount).toBe(100)
    })
  })
})
