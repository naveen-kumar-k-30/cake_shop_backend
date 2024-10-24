/*
  Warnings:

  - You are about to drop the column `shippingInfo` on the `Order` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Order" DROP COLUMN "shippingInfo",
ALTER COLUMN "paymentMethod" SET DEFAULT 'cash on Delivery';
