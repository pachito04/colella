-- Idempotent migration: safe to run even if `prisma db push` was used previously.
-- Adds ScheduleType enum, WorkSchedule.type column, and StoryImage table.

-- 1. ScheduleType enum
DO $$ BEGIN
    CREATE TYPE "ScheduleType" AS ENUM ('PRESENTIAL', 'VIRTUAL');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- 2. Add `type` column to WorkSchedule (default PRESENTIAL for legacy rows)
ALTER TABLE "WorkSchedule" ADD COLUMN IF NOT EXISTS "type" "ScheduleType" NOT NULL DEFAULT 'PRESENTIAL';

-- 3. Swap the unique constraint: drop the old unique on dayOfWeek alone, add compound on (dayOfWeek, type)
ALTER TABLE "WorkSchedule" DROP CONSTRAINT IF EXISTS "WorkSchedule_dayOfWeek_key";
DROP INDEX IF EXISTS "WorkSchedule_dayOfWeek_key";

DO $$ BEGIN
    CREATE UNIQUE INDEX "WorkSchedule_dayOfWeek_type_key" ON "WorkSchedule" ("dayOfWeek", "type");
EXCEPTION
    WHEN duplicate_table THEN NULL;
    WHEN duplicate_object THEN NULL;
END $$;

-- 4. StoryImage table for multi-image success stories
CREATE TABLE IF NOT EXISTS "StoryImage" (
    "id"        TEXT          NOT NULL,
    "storyId"   TEXT          NOT NULL,
    "url"       TEXT          NOT NULL,
    "order"     INTEGER       NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "StoryImage_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "StoryImage_storyId_idx" ON "StoryImage" ("storyId");

DO $$ BEGIN
    ALTER TABLE "StoryImage"
        ADD CONSTRAINT "StoryImage_storyId_fkey"
        FOREIGN KEY ("storyId") REFERENCES "SuccessStory"("id")
        ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;
