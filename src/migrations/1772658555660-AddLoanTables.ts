import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddLoanTables1772658555660 implements MigrationInterface {
  name = 'AddLoanTables1772658555660';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "borrower" ("id" SERIAL NOT NULL, "firstName" character varying NOT NULL, "lastName" character varying NOT NULL, "houseNo" character varying NOT NULL, "moo" character varying NOT NULL, "subDistrict" character varying NOT NULL, "district" character varying NOT NULL, "province" character varying NOT NULL, "nationalId" character varying NOT NULL, "phone" character varying NOT NULL, "lat" numeric(10,7) NOT NULL, "lng" numeric(10,7) NOT NULL, "occupation" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_c9737036f657d00897e09029378" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "vehicle" ("id" SERIAL NOT NULL, "model" character varying NOT NULL, "type" character varying NOT NULL, "color" character varying NOT NULL, "registrationYear" character varying NOT NULL, "chassisNumber" character varying NOT NULL, "engineNumber" character varying NOT NULL, "licensePlateNumber" character varying NOT NULL, "licensePlateProvince" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_187fa17ba39d367e5604b3d1ec9" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "guarantor" ("id" SERIAL NOT NULL, "firstName" character varying NOT NULL, "lastName" character varying NOT NULL, "houseNo" character varying NOT NULL, "moo" character varying NOT NULL, "subDistrict" character varying NOT NULL, "district" character varying NOT NULL, "province" character varying NOT NULL, "nationalId" character varying NOT NULL, "phone" character varying NOT NULL, "lat" numeric(10,7) NOT NULL, "lng" numeric(10,7) NOT NULL, "occupation" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "loanId" integer, CONSTRAINT "PK_8c2d5d0676fbd7c6c381426125f" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "loan" ("id" SERIAL NOT NULL, "loanNumber" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "borrowerId" integer, "vehicleId" integer, CONSTRAINT "REL_fff5adf4a8082e21349521e6d3" UNIQUE ("borrowerId"), CONSTRAINT "REL_073b4415a6319d30949988e755" UNIQUE ("vehicleId"), CONSTRAINT "PK_4ceda725a323d254a5fd48bf95f" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "guarantor" ADD CONSTRAINT "FK_6798a1c6017efd1d88370ba38e1" FOREIGN KEY ("loanId") REFERENCES "loan"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "loan" ADD CONSTRAINT "FK_fff5adf4a8082e21349521e6d3c" FOREIGN KEY ("borrowerId") REFERENCES "borrower"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "loan" ADD CONSTRAINT "FK_073b4415a6319d30949988e7554" FOREIGN KEY ("vehicleId") REFERENCES "vehicle"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "loan" DROP CONSTRAINT "FK_073b4415a6319d30949988e7554"`,
    );
    await queryRunner.query(
      `ALTER TABLE "loan" DROP CONSTRAINT "FK_fff5adf4a8082e21349521e6d3c"`,
    );
    await queryRunner.query(
      `ALTER TABLE "guarantor" DROP CONSTRAINT "FK_6798a1c6017efd1d88370ba38e1"`,
    );
    await queryRunner.query(`DROP TABLE "loan"`);
    await queryRunner.query(`DROP TABLE "guarantor"`);
    await queryRunner.query(`DROP TABLE "vehicle"`);
    await queryRunner.query(`DROP TABLE "borrower"`);
  }
}
