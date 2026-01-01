/*
  Warnings:

  - Added the required column `eventId` to the `Outbox` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Outbox" ADD COLUMN     "eventId" TEXT NOT NULL;
