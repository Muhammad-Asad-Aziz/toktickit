-- CreateEnum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'Priority') THEN
    CREATE TYPE "Priority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'TicketStatus') THEN
    CREATE TYPE "TicketStatus" AS ENUM ('NEW', 'OPEN', 'IN_PROGRESS', 'WAITING_FOR_REQUESTER', 'RESOLVED', 'CLOSED', 'REOPENED', 'CANCELLED');
  END IF;
END $$;

-- AlterTable tickets: Add ownerId
ALTER TABLE "tickets" ADD COLUMN IF NOT EXISTS "ownerId" INTEGER;

-- Ensure columns use Enums safely
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tickets' AND column_name = 'requestedPriority' AND data_type = 'character varying') THEN
    ALTER TABLE "tickets" ALTER COLUMN "requestedPriority" TYPE "Priority" USING UPPER("requestedPriority")::"Priority";
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tickets' AND column_name = 'requestedPriority' AND data_type = 'text') THEN
    ALTER TABLE "tickets" ALTER COLUMN "requestedPriority" TYPE "Priority" USING UPPER("requestedPriority")::"Priority";
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tickets' AND column_name = 'itPriority' AND data_type = 'character varying') THEN
    ALTER TABLE "tickets" ALTER COLUMN "itPriority" TYPE "Priority" USING COALESCE(UPPER("itPriority")::"Priority", UPPER("requestedPriority")::"Priority", 'MEDIUM'::"Priority");
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tickets' AND column_name = 'itPriority' AND data_type = 'text') THEN
    ALTER TABLE "tickets" ALTER COLUMN "itPriority" TYPE "Priority" USING COALESCE(UPPER("itPriority")::"Priority", UPPER("requestedPriority")::"Priority", 'MEDIUM'::"Priority");
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tickets' AND column_name = 'currentStatus' AND data_type = 'character varying') THEN
    ALTER TABLE "tickets" ALTER COLUMN "currentStatus" TYPE "TicketStatus" USING UPPER("currentStatus")::"TicketStatus";
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tickets' AND column_name = 'currentStatus' AND data_type = 'text') THEN
    ALTER TABLE "tickets" ALTER COLUMN "currentStatus" TYPE "TicketStatus" USING UPPER("currentStatus")::"TicketStatus";
  END IF;
END $$;

ALTER TABLE "tickets" ALTER COLUMN "requestedPriority" SET DEFAULT 'MEDIUM'::"Priority";
ALTER TABLE "tickets" ALTER COLUMN "itPriority" SET DEFAULT 'MEDIUM'::"Priority";
ALTER TABLE "tickets" ALTER COLUMN "currentStatus" SET DEFAULT 'NEW'::"TicketStatus";

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'tickets_ownerId_fkey'
  ) THEN
    ALTER TABLE "tickets" ADD CONSTRAINT "tickets_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "tickets_ownerId_idx" ON "tickets"("ownerId");
CREATE INDEX IF NOT EXISTS "tickets_itPriority_idx" ON "tickets"("itPriority");
CREATE INDEX IF NOT EXISTS "tickets_createdAt_idx" ON "tickets"("createdAt");
