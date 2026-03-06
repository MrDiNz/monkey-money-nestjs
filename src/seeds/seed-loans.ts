/**
 * Seed 200 diverse loans for testing the search feature.
 *
 * Run:
 *   pnpm run seed
 *
 * Prerequisites: DB must be running and tables must exist (migration:run or synchronize).
 */

import 'dotenv/config';
import { DataSource } from 'typeorm';
import { Loan } from '../modules/loan/entities/loan.entity';
import { Borrower } from '../modules/loan/entities/borrower.entity';
import { Vehicle } from '../modules/loan/entities/vehicle.entity';
import { Guarantor } from '../modules/loan/entities/guarantor.entity';
import { User } from '../modules/user/entities/user.entity';
import {
  generateLoanNumber,
  getBangkokParts,
  getMonthRangeUTC,
} from '../modules/loan/utils/loan-number.util';
import { Between } from 'typeorm';

// ─── Seed Data Pools ─────────────────────────────────────────────────────────

const FIRST_NAMES = [
  'สมชาย',
  'สมหญิง',
  'วิชัย',
  'วิชชุดา',
  'อนุชา',
  'อนุชิต',
  'ประยุทธ์',
  'ประยูร',
  'นิพนธ์',
  'นิตยา',
  'สุรชัย',
  'สุรีรัตน์',
  'ธนาคม',
  'ธนาภรณ์',
  'กิตติ',
  'กิตติมา',
  'พิษณุ',
  'ชัยวัฒน์',
  'มนตรี',
  'มนัสสา',
];

const LAST_NAMES = [
  'ใจดี',
  'มั่นคง',
  'รักดี',
  'สวัสดิ์',
  'พันธ์ดี',
  'บุญมา',
  'ศรีสุข',
  'วงศ์สา',
  'แสนดี',
  'ทองคำ',
  'เพ็งจันทร์',
  'กุลบุตร',
  'อินทรา',
  'นาคา',
  'มณีรัตน์',
  'สิงห์ทอง',
  'ขุนทอง',
  'ผาทอง',
  'จันทร์หอม',
  'ดวงดี',
];

const PROVINCES = [
  'กรุงเทพมหานคร',
  'เชียงใหม่',
  'นครราชสีมา',
  'ขอนแก่น',
  'อุดรธานี',
  'สุราษฎร์ธานี',
  'ภูเก็ต',
  'ชลบุรี',
  'นครปฐม',
  'อยุธยา',
];

const PLATE_PREFIXES = [
  'กข',
  'กค',
  'ขข',
  'ขค',
  'งง',
  'จจ',
  'ชช',
  'ซซ',
  'ญญ',
  'ฐฐ',
];

const VEHICLE_MODELS = [
  'Honda Wave 125',
  'Yamaha Fino',
  'Honda Click 125',
  'Suzuki Raider',
  'Honda PCX 160',
  'Yamaha NMAX',
  'Honda Scoopy',
  'Honda Airblade',
  'Kawasaki D-Tracker',
  'Yamaha Aerox',
];

const VEHICLE_TYPES = ['มอเตอร์ไซค์', 'สกู๊ตเตอร์', 'บิ๊กไบค์'];

const COLORS = ['แดง', 'น้ำเงิน', 'ขาว', 'ดำ', 'เหลือง', 'เขียว', 'เทา', 'ส้ม'];

const OCCUPATIONS = [
  'ค้าขาย',
  'รับจ้าง',
  'เกษตรกร',
  'พนักงานบริษัท',
  'ข้าราชการ',
  'ประกอบธุรกิจส่วนตัว',
  'ช่างซ่อมรถ',
  'ขับรถรับจ้าง',
  'พนักงานโรงงาน',
  'แม่บ้าน',
];

const pick = <T>(arr: T[], i: number): T => arr[i % arr.length];

// ─── DataSource ───────────────────────────────────────────────────────────────

const dataSource = new DataSource({
  type: 'postgres',
  host: process.env.DATABASE_HOST ?? 'localhost',
  port: parseInt(process.env.DATABASE_PORT ?? '', 10) || 5432,
  username: process.env.DATABASE_USERNAME ?? 'postgres',
  password: process.env.DATABASE_PASSWORD ?? 'postgres',
  database: process.env.DATABASE_NAME ?? 'monkey-money',
  entities: [Loan, Borrower, Vehicle, Guarantor, User],
  synchronize: false,
});

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  await dataSource.initialize();
  console.log('✅ DB connected');

  const loanRepo = dataSource.getRepository(Loan);
  const guarantorRepo = dataSource.getRepository(Guarantor);

  // Determine starting sequence for current Bangkok month
  const now = new Date();
  const { year, month } = getBangkokParts(now);
  const { start, end } = getMonthRangeUTC(year, month);
  const existing = await loanRepo.count({
    where: { createdAt: Between(start, end) },
  });
  let seq = existing + 1;

  console.log(
    `📅 Bangkok ${year}-${String(month).padStart(2, '0')} — starting sequence: ${seq}`,
  );

  const TOTAL = 200;
  const created: number[] = [];

  for (let i = 0; i < TOTAL; i++) {
    const firstName = pick(FIRST_NAMES, i);
    const lastName = pick(LAST_NAMES, i + 3);
    const province = pick(PROVINCES, i);
    const platePrefix = pick(PLATE_PREFIXES, i);
    const plateNumber = String(1000 + i).slice(1); // 000–199 → padded 3-digit
    const model = pick(VEHICLE_MODELS, i);
    const color = pick(COLORS, i);
    const occupation = pick(OCCUPATIONS, i);

    // Unique 13-digit national ID: prefix 1 + 12-digit padded index
    const nationalId = `1${String(i + 1).padStart(12, '0')}`;

    // Unique chassis / engine numbers
    const chassisNumber = `CH${String(i + 1).padStart(6, '0')}`;
    const engineNumber = `EN${String(i + 1).padStart(6, '0')}`;

    // Spread coords around Bangkok area
    const lat = 13.75 + (i % 20) * 0.01;
    const lng = 100.5 + (i % 20) * 0.01;

    const loanNumber = generateLoanNumber(now, seq++);

    const loan = loanRepo.create({
      loanNumber,
      borrower: {
        firstName,
        lastName,
        houseNo: String((i % 200) + 1),
        moo: String((i % 10) + 1),
        subDistrict: `ตำบล${i + 1}`,
        district: `อำเภอ${(i % 20) + 1}`,
        province,
        nationalId,
        phone: `08${String(i).padStart(8, '0')}`,
        lat,
        lng,
        occupation,
      } as Borrower,
      vehicle: {
        model,
        type: pick(VEHICLE_TYPES, i),
        color,
        registrationYear: String(2555 + (i % 10)),
        chassisNumber,
        engineNumber,
        licensePlateNumber: `${platePrefix} ${plateNumber}`,
        licensePlateProvince: province,
      } as Vehicle,
    });

    const saved = await loanRepo.save(loan);
    created.push(saved.id);

    // Add 1 guarantor to every 3rd loan for variety
    if (i % 3 === 0) {
      const gNationalId = `2${String(i + 1).padStart(12, '0')}`;
      const guarantor = guarantorRepo.create({
        firstName: pick(FIRST_NAMES, i + 10),
        lastName: pick(LAST_NAMES, i + 7),
        houseNo: String((i % 100) + 1),
        moo: String((i % 5) + 1),
        subDistrict: `ตำบลค้ำ${i + 1}`,
        district: `อำเภอค้ำ${(i % 10) + 1}`,
        province,
        nationalId: gNationalId,
        phone: `09${String(i).padStart(8, '0')}`,
        lat,
        lng,
        occupation: pick(OCCUPATIONS, i + 5),
        loan: saved,
      } as Guarantor);
      await guarantorRepo.save(guarantor);
    }
  }

  console.log(
    `🌱 Seeded ${TOTAL} loans (IDs: ${created[0]}–${created[TOTAL - 1]})`,
  );
  console.log('\nSearch test samples:');
  console.log(`  firstName  → "สมชาย"        (loans 0, 20, 40, 60, ...)`);
  console.log(`  lastName   → "ใจดี"           (loans 0, 20, 40, 60, ...)`);
  console.log(`  nationalId → "10000000001"   (partial match on loan #1)`);
  console.log(`  plate      → "กข"             (loans 0, 10, 20, ...)`);
  console.log(
    `  loanNumber → "${generateLoanNumber(now, existing + 1)}" (first seeded loan)`,
  );

  await dataSource.destroy();
  console.log('\n✅ Done');
}

main().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
