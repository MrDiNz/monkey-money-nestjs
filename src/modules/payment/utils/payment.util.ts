export interface InstallmentInput {
  id?: number
  dueDate: Date
  amount: number
  paidAmount: number
  status: string
}

export interface PaymentContext {
  installments: InstallmentInput[]
  autoPenalty: number
}

export interface InstallmentAllocation {
  id: number
  fullyPaid: boolean
  partialAmount: number
}

export interface AllocationResult {
  penaltyPaid: number
  lateFeePaid: number
  installmentsPaid: InstallmentAllocation[]
  credit: number
}

/**
 * Count full calendar months between two UTC dates.
 * Accounts for day-of-month: if to.day < from.day, subtract 1.
 */
function monthsBetween(from: Date, to: Date): number {
  let months =
    (to.getUTCFullYear() - from.getUTCFullYear()) * 12 +
    (to.getUTCMonth() - from.getUTCMonth())
  if (to.getUTCDate() < from.getUTCDate()) months--
  return Math.max(0, months)
}

/**
 * Calculate total auto-penalty for all UNPAID installments.
 * Penalty = 100 THB per full calendar month overdue (minimum 1 month).
 */
export function calculateAutoPenalty(
  installments: Pick<InstallmentInput, 'dueDate' | 'status'>[],
  referenceDate: Date,
): number {
  return installments.reduce((total, inst) => {
    if (inst.status === 'PAID') return total
    const months = monthsBetween(inst.dueDate, referenceDate)
    return total + months * 100
  }, 0)
}

/**
 * Allocate a payment across auto-penalty, late fee, and installments (oldest first).
 * Any remaining amount becomes credit.
 */
export function applyPayment(
  context: PaymentContext,
  amount: number,
  lateFee: number,
): AllocationResult {
  let remaining = amount

  // 1. Deduct auto penalty
  const penaltyPaid = Math.min(remaining, context.autoPenalty)
  remaining -= penaltyPaid

  // 2. Deduct late fee
  const lateFeePaid = Math.min(remaining, lateFee)
  remaining -= lateFeePaid

  // 3. Apply to installments, oldest first
  const sorted = [...context.installments].sort(
    (a, b) => a.dueDate.getTime() - b.dueDate.getTime(),
  )

  const installmentsPaid: InstallmentAllocation[] = []

  for (const inst of sorted) {
    if (remaining <= 0) break
    const needed = inst.amount - inst.paidAmount
    if (needed <= 0) continue

    const apply = Math.min(remaining, needed)
    remaining -= apply

    installmentsPaid.push({
      id: inst.id!,
      fullyPaid: apply >= needed,
      partialAmount: apply,
    })
  }

  return {
    penaltyPaid,
    lateFeePaid,
    installmentsPaid,
    credit: remaining,
  }
}
