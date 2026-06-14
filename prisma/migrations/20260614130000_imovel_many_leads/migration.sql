-- Allow one imovel to be related to many leads by moving the relation to Lead.
ALTER TABLE "Lead" ADD COLUMN "imovelId" TEXT;

UPDATE "Lead"
SET "imovelId" = "Imovel"."id"
FROM "Imovel"
WHERE "Imovel"."leadId" = "Lead"."id";

ALTER TABLE "Imovel" DROP CONSTRAINT "Imovel_leadId_fkey";
DROP INDEX "Imovel_leadId_key";
ALTER TABLE "Imovel" DROP COLUMN "leadId";

CREATE INDEX "Lead_ownerId_imovelId_idx" ON "Lead"("ownerId", "imovelId");

ALTER TABLE "Lead" ADD CONSTRAINT "Lead_imovelId_fkey" FOREIGN KEY ("imovelId") REFERENCES "Imovel"("id") ON DELETE SET NULL ON UPDATE CASCADE;
