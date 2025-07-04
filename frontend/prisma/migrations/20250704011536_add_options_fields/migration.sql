-- AlterTable
ALTER TABLE "assets" ADD COLUMN     "expirationDate" TIMESTAMP(3),
ADD COLUMN     "optionType" TEXT,
ADD COLUMN     "strikePrice" DOUBLE PRECISION;
