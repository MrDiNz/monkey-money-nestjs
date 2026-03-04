import { MigrationInterface, QueryRunner } from "typeorm";

export class AddLoanNumber1772658362200 implements MigrationInterface {
    name = 'AddLoanNumber1772658362200'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "loan" ADD "loanNumber" character varying NOT NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "loan" DROP COLUMN "loanNumber"`);
    }

}
