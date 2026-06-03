-- Seña como monto fijo opcional (si es NULL, se usa el porcentaje).
ALTER TABLE "GlobalSettings" ADD COLUMN IF NOT EXISTS "depositFixedAmount" DECIMAL;
