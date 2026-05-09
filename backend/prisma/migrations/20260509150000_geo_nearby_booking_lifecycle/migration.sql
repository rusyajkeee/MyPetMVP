-- CreateEnum
CREATE TYPE "ProviderCategory" AS ENUM ('VETERINARY', 'GROOMING', 'BOARDING', 'TRAINING');

-- Add columns for provider geo/category/verification
ALTER TABLE "providers"
ADD COLUMN "category" "ProviderCategory" NOT NULL DEFAULT 'VETERINARY',
ADD COLUMN "is_verified" BOOLEAN NOT NULL DEFAULT false;

-- Backfill new verification flag from legacy field
UPDATE "providers"
SET "is_verified" = "verified"
WHERE "verified" = true;

-- Normalize BookingStatus enum to lifecycle states
ALTER TYPE "BookingStatus" RENAME TO "BookingStatus_old";

CREATE TYPE "BookingStatus" AS ENUM ('PENDING', 'ACCEPTED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

ALTER TABLE "bookings"
ALTER COLUMN "status" DROP DEFAULT,
ALTER COLUMN "status" TYPE "BookingStatus" USING (
  CASE
    WHEN "status"::text = 'REJECTED' THEN 'CANCELLED'::"BookingStatus"
    WHEN "status"::text = 'PAID' THEN 'COMPLETED'::"BookingStatus"
    ELSE "status"::text::"BookingStatus"
  END
),
ALTER COLUMN "status" SET DEFAULT 'PENDING';

DROP TYPE "BookingStatus_old";

-- Add missing relation for provider reviews
ALTER TABLE "reviews"
ADD CONSTRAINT "reviews_provider_id_fkey"
FOREIGN KEY ("provider_id") REFERENCES "providers"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
