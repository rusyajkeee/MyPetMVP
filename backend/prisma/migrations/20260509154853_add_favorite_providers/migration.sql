-- AlterTable
ALTER TABLE "bookings" ADD COLUMN     "accepted_at" TIMESTAMP(3),
ADD COLUMN     "cancelled_at" TIMESTAMP(3),
ADD COLUMN     "started_at" TIMESTAMP(3);
