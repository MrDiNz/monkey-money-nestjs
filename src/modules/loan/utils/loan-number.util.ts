const BANGKOK_TZ = 'Asia/Bangkok';

function toBangkokParts(utcDate: Date): { year: number; month: number } {
  const parts = new Intl.DateTimeFormat('en', {
    timeZone: BANGKOK_TZ,
    year: 'numeric',
    month: '2-digit',
  }).formatToParts(utcDate);
  return {
    year: Number(parts.find((p) => p.type === 'year')!.value),
    month: Number(parts.find((p) => p.type === 'month')!.value),
  };
}

export function generateLoanNumber(utcDate: Date, seq: number): string {
  const { year, month } = toBangkokParts(utcDate);
  const beYear = year + 543;
  const yy = String(beYear).slice(-2);
  const mm = String(month).padStart(2, '0');
  return `${yy}-${mm}-${seq}`;
}

export function getMonthRangeUTC(
  bangkokYear: number,
  bangkokMonth: number,
): { start: Date; end: Date } {
  const start = new Date(
    Date.UTC(bangkokYear, bangkokMonth - 1, 1, 0, 0, 0) - 7 * 60 * 60 * 1000,
  );
  const end = new Date(
    Date.UTC(bangkokYear, bangkokMonth, 1, 0, 0, 0) - 7 * 60 * 60 * 1000 - 1,
  );
  return { start, end };
}

export function getBangkokParts(utcDate: Date): {
  year: number;
  month: number;
} {
  return toBangkokParts(utcDate);
}
