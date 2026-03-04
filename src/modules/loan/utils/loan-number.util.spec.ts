import { generateLoanNumber, getMonthRangeUTC } from './loan-number.util'

describe('generateLoanNumber', () => {
  it('should return 69-03-1 for UTC date in Bangkok March', () => {
    // 2026-03-15T10:00:00Z → Bangkok = 2026-03-15T17:00:00+07
    expect(generateLoanNumber(new Date('2026-03-15T10:00:00Z'), 1)).toBe('69-03-1')
  })

  it('should pad month with leading zero', () => {
    expect(generateLoanNumber(new Date('2026-01-15T10:00:00Z'), 1)).toBe('69-01-1')
  })

  it('should NOT pad seq (no leading zero)', () => {
    expect(generateLoanNumber(new Date('2026-03-15T10:00:00Z'), 10)).toBe('69-03-10')
  })

  it('should use Bangkok time for month boundary — UTC March is Bangkok April', () => {
    // 2026-03-31T18:00:00Z = 2026-04-01T01:00:00+07 → must be 04
    expect(generateLoanNumber(new Date('2026-03-31T18:00:00Z'), 1)).toBe('69-04-1')
  })

  it('should use Bangkok time — UTC Dec 31 late night stays December in Bangkok', () => {
    // 2026-12-31T10:00:00Z = 2026-12-31T17:00:00+07 → December
    expect(generateLoanNumber(new Date('2026-12-31T10:00:00Z'), 3)).toBe('69-12-3')
  })

  it('should convert CE year to Buddhist Era (+543)', () => {
    // 2027 CE → 2570 BE → 70
    expect(generateLoanNumber(new Date('2027-01-15T10:00:00Z'), 1)).toBe('70-01-1')
  })

  it('should handle year boundary with Bangkok offset — UTC Jan 1 00:00 = Bangkok Jan 1 07:00', () => {
    // 2027-01-01T00:00:00Z = 2027-01-01T07:00:00+07 → still Jan 2027 → BE 2570 → 70
    expect(generateLoanNumber(new Date('2027-01-01T00:00:00Z'), 1)).toBe('70-01-1')
  })
})

describe('getMonthRangeUTC', () => {
  it('should return correct UTC range for Bangkok April 2026', () => {
    // Bangkok April 2026 = UTC 2026-03-31T17:00:00Z to 2026-04-30T16:59:59.999Z
    const { start, end } = getMonthRangeUTC(2026, 4)
    expect(start.toISOString()).toBe('2026-03-31T17:00:00.000Z')
    expect(end.toISOString()).toBe('2026-04-30T16:59:59.999Z')
  })

  it('should return correct UTC range for Bangkok January 2027', () => {
    // Bangkok Jan 2027 = UTC 2026-12-31T17:00:00Z to 2027-01-31T16:59:59.999Z
    const { start, end } = getMonthRangeUTC(2027, 1)
    expect(start.toISOString()).toBe('2026-12-31T17:00:00.000Z')
    expect(end.toISOString()).toBe('2027-01-31T16:59:59.999Z')
  })
})
