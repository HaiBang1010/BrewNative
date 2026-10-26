import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMessageClientId1792990065728 implements MigrationInterface {
  name = 'AddMessageClientId1792990065728';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "messages" ADD "client_id" uuid`);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_086a2b3480b92c5a4b5014f37f" ON "messages"  ("sender_id", "client_id") `,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."IDX_086a2b3480b92c5a4b5014f37f"`,
    );
    await queryRunner.query(`ALTER TABLE "messages" DROP COLUMN "client_id"`);
  }
}
