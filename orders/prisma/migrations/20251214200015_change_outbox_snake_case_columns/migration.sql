/*
  Warnings:

  - You are about to drop the column `aggregateId` on the `Outbox` table. All the data in the column will be lost.
  - You are about to drop the column `aggregateType` on the `Outbox` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `Outbox` table. All the data in the column will be lost.
  - You are about to drop the column `eventType` on the `Outbox` table. All the data in the column will be lost.
  - Added the required column `aggregate_id` to the `Outbox` table without a default value. This is not possible if the table is not empty.
  - Added the required column `aggregate_type` to the `Outbox` table without a default value. This is not possible if the table is not empty.
  - Added the required column `event_type` to the `Outbox` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "public"."Outbox_aggregateType_aggregateId_idx";

-- AlterTable
ALTER TABLE "Outbox" DROP COLUMN "aggregateId",
DROP COLUMN "aggregateType",
DROP COLUMN "createdAt",
DROP COLUMN "eventType",
ADD COLUMN     "aggregate_id" TEXT NOT NULL,
ADD COLUMN     "aggregate_type" TEXT NOT NULL,
ADD COLUMN     "created_At" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "event_type" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "Outbox_aggregate_type_aggregate_id_idx" ON "Outbox"("aggregate_type", "aggregate_id");
