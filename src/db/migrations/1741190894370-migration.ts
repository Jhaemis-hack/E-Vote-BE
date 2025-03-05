import { MigrationInterface, QueryRunner } from 'typeorm';

export class Migration1741190894370 implements MigrationInterface {
  name = 'Migration1741190894370';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "elections" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "title" character varying NOT NULL, "description" character varying NOT NULL, "start_date" TIMESTAMP NOT NULL, "end_date" TIMESTAMP NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "status" character varying NOT NULL, "type" character varying NOT NULL, "created_by" uuid NOT NULL, CONSTRAINT "PK_21abca6e4191b830d1eb8379cf0" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "users" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "first_name" character varying NOT NULL, "last_name" character varying NOT NULL, "email" character varying NOT NULL, "password" character varying NOT NULL, "verified" boolean NOT NULL DEFAULT false, "user_type" "public"."users_user_type_enum" NOT NULL DEFAULT 'user', CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE ("email"), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "elections" ADD CONSTRAINT "FK_f0be556ca641069809597863a02" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "elections" DROP CONSTRAINT "FK_f0be556ca641069809597863a02"`);
    await queryRunner.query(`DROP TABLE "users"`);
    await queryRunner.query(`DROP TABLE "elections"`);
  }
}
