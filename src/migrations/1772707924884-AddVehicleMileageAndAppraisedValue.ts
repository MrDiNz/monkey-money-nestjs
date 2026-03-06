import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddVehicleMileageAndAppraisedValue1772707924884 implements MigrationInterface {
  name = 'AddVehicleMileageAndAppraisedValue1772707924884';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "vehicle" ADD "mileage" integer NOT NULL DEFAULT 0`,
    );
    await queryRunner.query(
      `ALTER TABLE "vehicle" ALTER COLUMN "mileage" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "vehicle" ADD "appraisedValue" numeric(12,2)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "vehicle" DROP COLUMN "appraisedValue"`,
    );
    await queryRunner.query(`ALTER TABLE "vehicle" DROP COLUMN "mileage"`);
  }
}
