-- CreateEnum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'Role') THEN
    CREATE TYPE "Role" AS ENUM ('REQUESTER', 'IT_STAFF', 'ADMINISTRATOR');
  END IF;
END $$;

-- DropForeignKey
ALTER TABLE "attachments" DROP CONSTRAINT IF EXISTS "attachments_removedByRequesterId_fkey";
ALTER TABLE "tickets" DROP CONSTRAINT IF EXISTS "tickets_requesterId_fkey";

-- AlterTable attachments
ALTER TABLE "attachments" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable categories
DO $$
BEGIN
  ALTER TABLE "categories" RENAME CONSTRAINT "Category_pkey" TO "categories_pkey";
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;
ALTER TABLE "categories" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable related_systems
ALTER TABLE "related_systems" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable tickets
ALTER TABLE "tickets" ADD COLUMN IF NOT EXISTS "requesterResolvedAt" TIMESTAMP(3);
ALTER TABLE "tickets" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- CreateTable users
CREATE TABLE IF NOT EXISTS "users" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL DEFAULT '$2a$10$7EqJtq98hPqEX7fNZaFWoO.8/E5O0H6uFvj/4J8O0M/v4e6T9i0yS',
    "role" "Role" NOT NULL DEFAULT 'REQUESTER',
    "department" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "mustChangePassword" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "users_email_key" UNIQUE ("email")
);

-- Copy existing data from requester_users into users if table exists
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'requester_users') THEN
    INSERT INTO "users" ("id", "name", "email", "department", "isActive", "createdAt", "updatedAt")
    SELECT "id", "name", "email", "department", "isActive", "createdAt", "updatedAt"
    FROM "requester_users"
    ON CONFLICT ("email") DO NOTHING;
    
    -- Sync sequence if data was migrated
    IF (SELECT MAX(id) FROM "users") IS NOT NULL THEN
      PERFORM setval('users_id_seq', (SELECT MAX(id) FROM "users"));
    END IF;

    DROP TABLE "requester_users";
  END IF;
END $$;

-- AddForeignKey
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_removedByRequesterId_fkey" FOREIGN KEY ("removedByRequesterId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
