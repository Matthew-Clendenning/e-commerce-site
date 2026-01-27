-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "discountPercent" INTEGER;

-- CreateTable
CREATE TABLE "Sale" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "tagline" TEXT NOT NULL,
    "discount" INTEGER NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endDate" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "bannerUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Sale_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SaleCategory" (
    "id" TEXT NOT NULL,
    "saleId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,

    CONSTRAINT "SaleCategory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Sale_isActive_endDate_idx" ON "Sale"("isActive", "endDate");

-- CreateIndex
CREATE INDEX "SaleCategory_saleId_idx" ON "SaleCategory"("saleId");

-- CreateIndex
CREATE INDEX "SaleCategory_categoryId_idx" ON "SaleCategory"("categoryId");

-- CreateIndex
CREATE UNIQUE INDEX "SaleCategory_saleId_categoryId_key" ON "SaleCategory"("saleId", "categoryId");

-- AddForeignKey
ALTER TABLE "SaleCategory" ADD CONSTRAINT "SaleCategory_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "Sale"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SaleCategory" ADD CONSTRAINT "SaleCategory_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;
