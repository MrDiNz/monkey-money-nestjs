import {
  roundInstallmentAmount,
  calculateInstallmentSchedule,
} from './installment.util'

// ─── roundInstallmentAmount ───────────────────────────────────────────────────

describe('roundInstallmentAmount', () => {
  it('TC-BE-01: already ends in .00 → unchanged', () => {
    expect(roundInstallmentAmount(500.0)).toBe(500.0)
  })

  it('TC-BE-02: already ends in .50 → unchanged', () => {
    expect(roundInstallmentAmount(100.5)).toBe(100.5)
  })

  it('TC-BE-03: 100.01 → 100.50', () => {
    expect(roundInstallmentAmount(100.01)).toBe(100.5)
  })

  it('TC-BE-04: 100.51 → 101.00', () => {
    expect(roundInstallmentAmount(100.51)).toBe(101.0)
  })

  it('TC-BE-05: 100.25 → 100.50', () => {
    expect(roundInstallmentAmount(100.25)).toBe(100.5)
  })

  it('TC-BE-05b: 0.01 → 0.50', () => {
    expect(roundInstallmentAmount(0.01)).toBe(0.5)
  })

  it('TC-BE-05c: 1000.00 → 1000.00 (exact integer)', () => {
    expect(roundInstallmentAmount(1000.0)).toBe(1000.0)
  })
})

// ─── calculateInstallmentSchedule ────────────────────────────────────────────

describe('calculateInstallmentSchedule', () => {
  const baseLoan = {
    loanAmount: 10000,
    interestRate: 24, // 24% per year
    numberOfInstallments: 12,
    paymentFrequency: 1, // 1x per month
    createdAt: new Date('2026-01-15T00:00:00Z'),
  }
  // interest = 10000 × 0.24 × (12/12) = 2400
  // total = 12400, per installment = 12400/12 = 1033.333... → roundUp → 1033.50

  it('TC-BE-06: returns numberOfInstallments items', () => {
    const result = calculateInstallmentSchedule(baseLoan)
    expect(result).toHaveLength(12)
  })

  it('TC-BE-07: regular installment amount = roundUp(total / count)', () => {
    const result = calculateInstallmentSchedule(baseLoan)
    expect(result[0].amount).toBe(1033.5)
  })

  it('TC-BE-07b: regular installments all end in .00 or .50 (rounding rule)', () => {
    const result = calculateInstallmentSchedule(baseLoan)
    result.slice(0, -1).forEach((inst) => {
      const cents = Math.round((inst.amount % 1) * 100)
      expect(cents === 0 || cents === 50).toBe(true)
    })
  })

  it('TC-BE-08: sum of all installments equals principal + total interest', () => {
    const result = calculateInstallmentSchedule(baseLoan)
    const sum = result.reduce((acc, i) => acc + i.amount, 0)
    const expectedTotal = 10000 + 10000 * 0.24 * (12 / 12) // 12400
    expect(sum).toBeCloseTo(expectedTotal, 0)
  })

  it('TC-BE-09: due dates increment by 1 month for frequency=1', () => {
    const result = calculateInstallmentSchedule(baseLoan)
    expect(result[0].dueDate).toEqual(new Date('2026-02-15T00:00:00Z'))
    expect(result[1].dueDate).toEqual(new Date('2026-03-15T00:00:00Z'))
    expect(result[11].dueDate).toEqual(new Date('2027-01-15T00:00:00Z'))
  })

  it('TC-BE-10: installmentNo starts at 1 and increments to numberOfInstallments', () => {
    const result = calculateInstallmentSchedule(baseLoan)
    expect(result[0].installmentNo).toBe(1)
    expect(result[11].installmentNo).toBe(12)
  })

  it('TC-BE-11: frequency=4 (weekly) — due dates increment by 7 days', () => {
    const loan = {
      ...baseLoan,
      paymentFrequency: 4,
      numberOfInstallments: 4,
      createdAt: new Date('2026-01-01T00:00:00Z'),
    }
    const result = calculateInstallmentSchedule(loan)
    expect(result[0].dueDate).toEqual(new Date('2026-01-08T00:00:00Z'))
    expect(result[1].dueDate).toEqual(new Date('2026-01-15T00:00:00Z'))
  })

  it('TC-BE-12: frequency=2 (bi-monthly) — due dates increment by 15 days', () => {
    const loan = {
      ...baseLoan,
      paymentFrequency: 2,
      numberOfInstallments: 4,
      createdAt: new Date('2026-01-01T00:00:00Z'),
    }
    const result = calculateInstallmentSchedule(loan)
    expect(result[0].dueDate).toEqual(new Date('2026-01-16T00:00:00Z'))
    expect(result[1].dueDate).toEqual(new Date('2026-01-31T00:00:00Z'))
  })

  it('TC-BE-13: 0% interest — total = loanAmount, amount rounded up to nearest 0.5', () => {
    // 10000 / 3 = 3333.333... → 3333.50
    const loan = {
      loanAmount: 10000,
      interestRate: 0,
      numberOfInstallments: 3,
      paymentFrequency: 1,
      createdAt: new Date('2026-01-01T00:00:00Z'),
    }
    const result = calculateInstallmentSchedule(loan)
    expect(result[0].amount).toBe(3333.5)
    expect(result[1].amount).toBe(3333.5)
    // last absorbs rounding diff
    const sum = result.reduce((acc, i) => acc + i.amount, 0)
    expect(sum).toBeCloseTo(10000, 0)
  })

  it('TC-BE-14: exact division — no rounding needed (e.g. 3000 / 3 = 1000.00)', () => {
    const loan = {
      loanAmount: 3000,
      interestRate: 0,
      numberOfInstallments: 3,
      paymentFrequency: 1,
      createdAt: new Date('2026-01-01T00:00:00Z'),
    }
    const result = calculateInstallmentSchedule(loan)
    result.slice(0, -1).forEach((inst) => expect(inst.amount).toBe(1000.0))
  })
})
