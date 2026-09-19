-- CreateEnum
CREATE TYPE "AIReportStatus" AS ENUM ('PENDING', 'GENERATING', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "ai_reports" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "status" "AIReportStatus" NOT NULL DEFAULT 'PENDING',
    "summary" TEXT,
    "highlights" JSONB,
    "achievements" JSONB,
    "concerns" JSONB,
    "nextSteps" JSONB,
    "model" TEXT,
    "generatedAt" TIMESTAMP(3),
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_reports_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ai_reports_projectId_idx" ON "ai_reports"("projectId");

-- CreateIndex
CREATE INDEX "ai_reports_projectId_periodStart_periodEnd_idx" ON "ai_reports"("projectId", "periodStart", "periodEnd");

-- CreateIndex
CREATE UNIQUE INDEX "ai_reports_projectId_periodStart_periodEnd_key" ON "ai_reports"("projectId", "periodStart", "periodEnd");

-- AddForeignKey
ALTER TABLE "ai_reports" ADD CONSTRAINT "ai_reports_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
