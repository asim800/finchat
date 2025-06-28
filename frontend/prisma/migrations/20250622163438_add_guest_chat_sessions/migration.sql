-- AlterTable
ALTER TABLE "chat_sessions" ADD COLUMN     "expiresAt" TIMESTAMP(3),
ADD COLUMN     "guestSessionId" TEXT,
ADD COLUMN     "isGuestSession" BOOLEAN NOT NULL DEFAULT false,
ALTER COLUMN "userId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "messages" ADD COLUMN     "provider" TEXT;
