export type InstallmentStatus = 'ชำระแล้ว' | 'ค้างชำระ' | 'ยังไม่ถึงกำหนด';

export interface InstallmentScheduleInput {
  loanAmount: number;
  numberOfInstallments: number;
  interestRate: number;
  paymentFrequency: number;
  createdAt: Date;
}

export interface InstallmentItem {
  installmentNo: number;
  dueDate: Date;
  paidDate: Date | null;
  amount: number;
  remainingBalance: number;
  outstandingAmount: number;
  status: InstallmentStatus;
  remark: string | null;
}

export function roundInstallmentAmount(amount: number): number {
  return Math.ceil(amount * 2) / 2;
}

function addDueInterval(
  date: Date,
  paymentFrequency: number,
  times: number,
): Date {
  const result = new Date(date);
  if (paymentFrequency === 1) {
    result.setUTCMonth(result.getUTCMonth() + times);
  } else if (paymentFrequency === 2) {
    result.setUTCDate(result.getUTCDate() + 15 * times);
  } else {
    // frequency=4 (weekly)
    result.setUTCDate(result.getUTCDate() + 7 * times);
  }
  return result;
}

export function calculateInstallmentSchedule(
  loan: InstallmentScheduleInput,
): InstallmentItem[] {
  const {
    loanAmount,
    numberOfInstallments,
    interestRate,
    paymentFrequency,
    createdAt,
  } = loan;

  const periodsPerYear = paymentFrequency * 12;
  const totalInterest =
    loanAmount * (interestRate / 100) * (numberOfInstallments / periodsPerYear);
  const totalAmount = loanAmount + totalInterest;
  const roundedAmount = roundInstallmentAmount(
    totalAmount / numberOfInstallments,
  );

  const now = new Date();

  return Array.from({ length: numberOfInstallments }, (_, i) => {
    const n = i + 1;
    const dueDate = addDueInterval(createdAt, paymentFrequency, n);
    const isLast = n === numberOfInstallments;
    const amount = isLast
      ? totalAmount - roundedAmount * (numberOfInstallments - 1)
      : roundedAmount;

    const status: InstallmentStatus =
      dueDate < now ? 'ค้างชำระ' : 'ยังไม่ถึงกำหนด';

    return {
      installmentNo: n,
      dueDate,
      paidDate: null,
      amount,
      remainingBalance: amount,
      outstandingAmount: 0,
      status,
      remark: null,
    };
  });
}
