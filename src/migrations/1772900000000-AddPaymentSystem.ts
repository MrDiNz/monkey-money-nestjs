import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPaymentSystem1772900000000 implements MigrationInterface {
  name = 'AddPaymentSystem1772900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."installment_status_enum" AS ENUM('UNPAID', 'PARTIAL', 'PAID')`,
    );

    await queryRunner.query(`
      CREATE TABLE "installment" (
        "id" SERIAL NOT NULL,
        "due_date" TIMESTAMP WITH TIME ZONE NOT NULL,
        "amount" NUMERIC(15,2) NOT NULL,
        "paid_amount" NUMERIC(15,2) NOT NULL DEFAULT '0',
        "status" "public"."installment_status_enum" NOT NULL DEFAULT 'UNPAID',
        "loan_id" integer,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_installment" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      ALTER TABLE "installment"
        ADD CONSTRAINT "FK_installment_loan"
        FOREIGN KEY ("loan_id") REFERENCES "loan"("id") ON DELETE CASCADE
    `);

    await queryRunner.query(`
      CREATE TABLE "installment_payment" (
        "id" SERIAL NOT NULL,
        "paid_amount" NUMERIC(15,2) NOT NULL,
        "late_fee" NUMERIC(10,2) NOT NULL DEFAULT '0',
        "paid_at" TIMESTAMP WITH TIME ZONE NOT NULL,
        "installment_id" integer,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_installment_payment" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      ALTER TABLE "installment_payment"
        ADD CONSTRAINT "FK_installment_payment_installment"
        FOREIGN KEY ("installment_id") REFERENCES "installment"("id") ON DELETE CASCADE
    `);

    await queryRunner.query(`
      CREATE TABLE "auto_penalty" (
        "id" SERIAL NOT NULL,
        "amount" NUMERIC(10,2) NOT NULL,
        "calculated_at" TIMESTAMP WITH TIME ZONE NOT NULL,
        "loan_id" integer,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_auto_penalty" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      ALTER TABLE "auto_penalty"
        ADD CONSTRAINT "FK_auto_penalty_loan"
        FOREIGN KEY ("loan_id") REFERENCES "loan"("id") ON DELETE CASCADE
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "auto_penalty" DROP CONSTRAINT "FK_auto_penalty_loan"`);
    await queryRunner.query(`DROP TABLE "auto_penalty"`);
    await queryRunner.query(
      `ALTER TABLE "installment_payment" DROP CONSTRAINT "FK_installment_payment_installment"`,
    );
    await queryRunner.query(`DROP TABLE "installment_payment"`);
    await queryRunner.query(`ALTER TABLE "installment" DROP CONSTRAINT "FK_installment_loan"`);
    await queryRunner.query(`DROP TABLE "installment"`);
    await queryRunner.query(`DROP TYPE "public"."installment_status_enum"`);
  }
}
