-- Safe migration for production environments that might already contain partial schema changes.

CREATE TABLE IF NOT EXISTS "Review" (
  "id" TEXT NOT NULL,
  "author" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "rating" INTEGER NOT NULL DEFAULT 5,
  "order" INTEGER NOT NULL DEFAULT 0,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Review_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "AppointmentFile" (
  "id" TEXT NOT NULL,
  "fileName" TEXT NOT NULL,
  "originalName" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL,
  "size" INTEGER NOT NULL,
  "data" BYTEA NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "appointmentId" TEXT NOT NULL,
  CONSTRAINT "AppointmentFile_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "AppointmentFile_appointmentId_key" ON "AppointmentFile"("appointmentId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'AppointmentFile_appointmentId_fkey'
  ) THEN
    ALTER TABLE "AppointmentFile"
    ADD CONSTRAINT "AppointmentFile_appointmentId_fkey"
    FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
