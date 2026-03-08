import { Test, TestingModule } from '@nestjs/testing'
import { INestApplication, ValidationPipe } from '@nestjs/common'
import request from 'supertest'
import { App } from 'supertest/types'
import { DataSource } from 'typeorm'
import { AppModule } from '../src/app.module'

/**
 * Integration tests for the payment system.
 * Requires a running PostgreSQL database.
 * Run with: pnpm run test:e2e
 *
 * Test data is isolated per run:
 * - A unique test user is created in beforeAll and deleted in afterAll.
 * - Loan and installments are created fresh; installment dates are reset in beforeEach.
 */

describe('Payment System (e2e)', () => {
  let app: INestApplication<App>
  let dataSource: DataSource
  let jwtToken: string
  let loanId: number

  const uniqueSuffix = Date.now()
  const testUser = { username: `testpay_${uniqueSuffix}`, password: 'Test@1234' }

  const loanPayload = {
    loanAmount: 1000,
    numberOfInstallments: 2,
    interestRate: 3,
    paymentFrequency: 1,
    borrower: {
      firstName: 'ทดสอบ',
      lastName: 'ชำระเงิน',
      nationalId: `9${uniqueSuffix}`.slice(0, 13).padEnd(13, '0'),
      phone: '0800000001',
      occupation: 'ทดสอบ',
      houseNo: '1',
      moo: '1',
      subDistrict: 'ทดสอบ',
      district: 'ทดสอบ',
      province: 'กรุงเทพ',
      lat: 13.75,
      lng: 100.5,
    },
    vehicle: {
      model: 'Test',
      type: 'มอเตอร์ไซค์',
      color: 'แดง',
      registrationYear: '2563',
      chassisNumber: `CHS${uniqueSuffix}`,
      engineNumber: `ENG${uniqueSuffix}`,
      licensePlateNumber: `ทด ${uniqueSuffix}`.slice(0, 10),
      licensePlateProvince: 'กรุงเทพ',
      mileage: 1000,
    },
    guarantors: [],
  }

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile()

    app = moduleFixture.createNestApplication()
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }))
    await app.init()

    dataSource = moduleFixture.get(DataSource)

    // Create test user
    await request(app.getHttpServer()).post('/user').send(testUser)

    // Login to get JWT
    const loginRes = await request(app.getHttpServer()).post('/user/login').send(testUser)
    jwtToken = loginRes.body.access_token

    // Create a loan (installments auto-generated)
    const loanRes = await request(app.getHttpServer())
      .post('/loan')
      .set('Authorization', `Bearer ${jwtToken}`)
      .send(loanPayload)
    loanId = loanRes.body.id
  })

  beforeEach(async () => {
    // Reset installments: set all to UNPAID with paidAmount=0 and due dates 2 months ago
    await dataSource.query(
      `UPDATE installment SET paid_amount = 0, status = 'UNPAID',
       due_date = NOW() - INTERVAL '2 months' WHERE loan_id = $1`,
      [loanId],
    )
    // Remove any sub-payments and penalties from previous test runs
    await dataSource.query(
      `DELETE FROM installment_payment WHERE installment_id IN
       (SELECT id FROM installment WHERE loan_id = $1)`,
      [loanId],
    )
    await dataSource.query(`DELETE FROM auto_penalty WHERE loan_id = $1`, [loanId])
  })

  afterAll(async () => {
    await dataSource.query(`DELETE FROM loan WHERE id = $1`, [loanId])
    await dataSource.query(`DELETE FROM "user" WHERE username = $1`, [testUser.username])
    await app.close()
  })

  // ── TC-INT-01 ─────────────────────────────────────────────────────────────

  it('TC-INT-01: POST /loan/:id/payments → 201 with allocation result', async () => {
    const res = await request(app.getHttpServer())
      .post(`/loan/${loanId}/payments`)
      .set('Authorization', `Bearer ${jwtToken}`)
      .send({ amount: 1000, lateFee: 0 })

    expect(res.status).toBe(201)
    expect(res.body).toHaveProperty('penaltyPaid')
    expect(res.body).toHaveProperty('lateFeePaid')
    expect(res.body).toHaveProperty('installmentsPaid')
    expect(res.body).toHaveProperty('credit')
  })

  // ── TC-INT-02 ─────────────────────────────────────────────────────────────

  it('TC-INT-02: GET /loan/:id/payment-summary → 200 with correct amounts', async () => {
    const res = await request(app.getHttpServer())
      .get(`/loan/${loanId}/payment-summary`)
      .set('Authorization', `Bearer ${jwtToken}`)

    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('autoPenalty')
    expect(res.body).toHaveProperty('overdueInstallments')
    expect(res.body).toHaveProperty('total')
    // 2 installments of 500 each, both 2 months overdue → penalty = 2*2*100 = 400
    expect(res.body.autoPenalty).toBe(400)
    expect(res.body.overdueInstallments).toBe(1000)
    expect(res.body.total).toBe(1400)
  })

  // ── TC-INT-03 ─────────────────────────────────────────────────────────────

  it('TC-INT-03: penalty deducted first — amount 500 with 400 penalty leaves 100 for installment', async () => {
    const res = await request(app.getHttpServer())
      .post(`/loan/${loanId}/payments`)
      .set('Authorization', `Bearer ${jwtToken}`)
      .send({ amount: 500, lateFee: 0 })

    expect(res.status).toBe(201)
    expect(res.body.penaltyPaid).toBe(400) // 2 installments × 2 months × 100
    expect(res.body.installmentsPaid[0].partialAmount).toBe(100)
  })

  // ── TC-INT-04 ─────────────────────────────────────────────────────────────

  it('TC-INT-04: overpayment creates credit applied to next installment', async () => {
    // Pay more than first installment (500) — extra goes to second
    const res = await request(app.getHttpServer())
      .post(`/loan/${loanId}/payments`)
      .set('Authorization', `Bearer ${jwtToken}`)
      .send({ amount: 1400 + 600, lateFee: 0 }) // cover penalty(400) + inst1(500) + 600 toward inst2

    expect(res.status).toBe(201)
    expect(res.body.installmentsPaid).toHaveLength(2)
    expect(res.body.installmentsPaid[0].fullyPaid).toBe(true)
    expect(res.body.installmentsPaid[1].partialAmount).toBe(600)
    expect(res.body.credit).toBe(0)
  })

  // ── TC-INT-05 ─────────────────────────────────────────────────────────────

  it('TC-INT-05: unauthenticated request → 401', async () => {
    const [summaryRes, paymentRes] = await Promise.all([
      request(app.getHttpServer()).get(`/loan/${loanId}/payment-summary`),
      request(app.getHttpServer()).post(`/loan/${loanId}/payments`).send({ amount: 100 }),
    ])

    expect(summaryRes.status).toBe(401)
    expect(paymentRes.status).toBe(401)
  })
})
