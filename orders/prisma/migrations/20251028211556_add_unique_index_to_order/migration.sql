/*
  Warnings:

  - A unique constraint covering the columns `[ticketId,status]` on the table `Order` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Order_ticketId_status_key" ON "Order"("ticketId", "status");
