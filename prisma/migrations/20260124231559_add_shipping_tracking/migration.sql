-- CreateEnum
CREATE TYPE "ShippingCarrier" AS ENUM ('USPS', 'UPS', 'FEDEX', 'DHL', 'OTHER');

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "deliveredAt" TIMESTAMP(3),
ADD COLUMN     "shippedAt" TIMESTAMP(3),
ADD COLUMN     "shippingCarrier" "ShippingCarrier",
ADD COLUMN     "trackingNumber" TEXT;

-- CreateIndex
CREATE INDEX "Order_trackingNumber_idx" ON "Order"("trackingNumber");
