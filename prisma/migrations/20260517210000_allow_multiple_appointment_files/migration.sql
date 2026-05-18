-- Allow multiple AppointmentFile rows per Appointment.
-- Idempotent: safe to run on DBs where the unique was already dropped.

-- 1) Drop the old unique constraint on appointmentId (if present)
ALTER TABLE "AppointmentFile" DROP CONSTRAINT IF EXISTS "AppointmentFile_appointmentId_key";

-- 2) Drop the matching unique index (if present)
DROP INDEX IF EXISTS "AppointmentFile_appointmentId_key";

-- 3) Add a non-unique index so lookups by appointmentId stay fast
DO $$ BEGIN
    CREATE INDEX "AppointmentFile_appointmentId_idx" ON "AppointmentFile" ("appointmentId");
EXCEPTION
    WHEN duplicate_table THEN NULL;
    WHEN duplicate_object THEN NULL;
END $$;
