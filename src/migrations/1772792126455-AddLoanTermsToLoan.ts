import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddLoanTermsToLoan1772792126455 implements MigrationInterface {
  name = 'AddLoanTermsToLoan1772792126455';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "loan" ADD "loanAmount" numeric(15,2) NOT NULL DEFAULT 0`,
    );
    await queryRunner.query(
      `ALTER TABLE "loan" ALTER COLUMN "loanAmount" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "loan" ADD "numberOfInstallments" integer NOT NULL DEFAULT 1`,
    );
    await queryRunner.query(
      `ALTER TABLE "loan" ALTER COLUMN "numberOfInstallments" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "loan" ADD "interestRate" numeric(10,2) NOT NULL DEFAULT 0`,
    );
    await queryRunner.query(
      `ALTER TABLE "loan" ALTER COLUMN "interestRate" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "loan" ADD "paymentFrequency" integer NOT NULL DEFAULT 1`,
    );
    await queryRunner.query(
      `ALTER TABLE "loan" ALTER COLUMN "paymentFrequency" DROP DEFAULT`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "loan" DROP COLUMN "paymentFrequency"`,
    );
    await queryRunner.query(`ALTER TABLE "loan" DROP COLUMN "interestRate"`);
    await queryRunner.query(
      `ALTER TABLE "loan" DROP COLUMN "numberOfInstallments"`,
    );
    await queryRunner.query(`ALTER TABLE "loan" DROP COLUMN "loanAmount"`);
  }
}
