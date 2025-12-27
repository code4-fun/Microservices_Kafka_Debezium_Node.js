/*
  Warnings:

  - You are about to drop the column `aggregate_id` on the `Outbox` table. All the data in the column will be lost.
  - You are about to drop the column `aggregate_type` on the `Outbox` table. All the data in the column will be lost.
  - You are about to drop the column `created_at` on the `Outbox` table. All the data in the column will be lost.
  - You are about to drop the column `event_type` on the `Outbox` table. All the data in the column will be lost.
  - Added the required column `aggregateid` to the `Outbox` table without a default value. This is not possible if the table is not empty.
  - Added the required column `aggregatetype` to the `Outbox` table without a default value. This is not possible if the table is not empty.
  - Added the required column `type` to the `Outbox` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "public"."Outbox_aggregate_type_aggregate_id_idx";

-- AlterTable
ALTER TABLE "Outbox" DROP COLUMN "aggregate_id",
DROP COLUMN "aggregate_type",
DROP COLUMN "created_at",
DROP COLUMN "event_type",
ADD COLUMN     "aggregateid" TEXT NOT NULL,
ADD COLUMN     "aggregatetype" TEXT NOT NULL,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "type" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "Outbox_aggregatetype_aggregateid_idx" ON "Outbox"("aggregatetype", "aggregateid");
