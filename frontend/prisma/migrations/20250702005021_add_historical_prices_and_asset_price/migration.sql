-- AlterTable
ALTER TABLE "assets" ADD COLUMN     "price" DOUBLE PRECISION;

-- CreateTable
CREATE TABLE "historical_prices" (
    "id" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "source" TEXT,
    "assetType" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "historical_prices_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "historical_prices_symbol_date_idx" ON "historical_prices"("symbol", "date" DESC);

-- CreateIndex
CREATE INDEX "historical_prices_date_idx" ON "historical_prices"("date");

-- CreateIndex
CREATE UNIQUE INDEX "historical_prices_symbol_date_key" ON "historical_prices"("symbol", "date");
