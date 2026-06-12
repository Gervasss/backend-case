-- CreateTable
CREATE TABLE "Imovel" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "propertyType" TEXT,
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "price" DOUBLE PRECISION,
    "bedrooms" INTEGER,
    "bathrooms" INTEGER,
    "areaM2" DOUBLE PRECISION,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "ownerId" TEXT NOT NULL,
    "leadId" TEXT,

    CONSTRAINT "Imovel_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Imovel_leadId_key" ON "Imovel"("leadId");

-- CreateIndex
CREATE INDEX "Imovel_ownerId_idx" ON "Imovel"("ownerId");

-- CreateIndex
CREATE INDEX "Imovel_ownerId_city_idx" ON "Imovel"("ownerId", "city");

-- AddForeignKey
ALTER TABLE "Imovel" ADD CONSTRAINT "Imovel_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Imovel" ADD CONSTRAINT "Imovel_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;
