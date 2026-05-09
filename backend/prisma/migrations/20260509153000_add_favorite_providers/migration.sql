CREATE TABLE "favorite_providers" (
  "id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "provider_id" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "favorite_providers_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "favorite_providers_user_id_provider_id_key"
ON "favorite_providers"("user_id", "provider_id");

ALTER TABLE "favorite_providers"
ADD CONSTRAINT "favorite_providers_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "favorite_providers"
ADD CONSTRAINT "favorite_providers_provider_id_fkey"
FOREIGN KEY ("provider_id") REFERENCES "providers"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
