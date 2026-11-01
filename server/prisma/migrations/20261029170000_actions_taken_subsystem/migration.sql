-- server/prisma/migrations/20261029170000_actions_taken_subsystem/migration.sql

-- 1. Create actions_taken table if not exists
CREATE TABLE IF NOT EXISTS "actions_taken" (
    "id" SERIAL NOT NULL,
    "ticketId" INTEGER NOT NULL,
    "actionDateTime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actionDescription" VARCHAR(1000) NOT NULL,
    "result" VARCHAR(1000) NOT NULL,
    "performedById" INTEGER NOT NULL,
    "followUpRequired" BOOLEAN NOT NULL DEFAULT false,
    "followUpNote" VARCHAR(1000),
    "attachmentNotes" VARCHAR(500),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "actions_taken_pkey" PRIMARY KEY ("id")
);

-- 2. Create single and composite indexes
CREATE INDEX IF NOT EXISTS "actions_taken_ticketId_idx" ON "actions_taken"("ticketId");
CREATE INDEX IF NOT EXISTS "actions_taken_performedById_idx" ON "actions_taken"("performedById");
CREATE INDEX IF NOT EXISTS "actions_taken_actionDateTime_idx" ON "actions_taken"("actionDateTime");
CREATE INDEX IF NOT EXISTS "actions_taken_ticketId_actionDateTime_idx" ON "actions_taken"("ticketId", "actionDateTime");

-- 3. Add foreign key constraints safely
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'actions_taken_ticketId_fkey'
  ) THEN
    ALTER TABLE "actions_taken" ADD CONSTRAINT "actions_taken_ticketId_fkey" 
      FOREIGN KEY ("ticketId") REFERENCES "tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'actions_taken_performedById_fkey'
  ) THEN
    ALTER TABLE "actions_taken" ADD CONSTRAINT "actions_taken_performedById_fkey" 
      FOREIGN KEY ("performedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

