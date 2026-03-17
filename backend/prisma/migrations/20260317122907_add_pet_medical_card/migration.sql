-- CreateTable
CREATE TABLE "pet_medical_cards" (
    "id" TEXT NOT NULL,
    "pet_id" TEXT NOT NULL,
    "allergies" TEXT,
    "chronic_diseases" TEXT,
    "medications" TEXT,
    "vaccinations" TEXT,
    "past_illnesses" TEXT,
    "notes" TEXT,
    "last_vet_visit" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pet_medical_cards_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "pet_medical_cards_pet_id_key" ON "pet_medical_cards"("pet_id");

-- AddForeignKey
ALTER TABLE "pet_medical_cards" ADD CONSTRAINT "pet_medical_cards_pet_id_fkey" FOREIGN KEY ("pet_id") REFERENCES "pets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
