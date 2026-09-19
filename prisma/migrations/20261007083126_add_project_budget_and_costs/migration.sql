-- CreateEnum
CREATE TYPE "CostCategory" AS ENUM ('LABOR', 'INFRASTRUCTURE', 'SOFTWARE', 'THIRD_PARTY', 'TRAVEL', 'OTHER');

-- CreateTable
CREATE TABLE "project_budgets" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "totalBudget" DECIMAL(12,2) NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'USD',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "project_budgets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cost_entries" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "category" "CostCategory" NOT NULL,
    "description" TEXT,
    "incurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cost_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "project_budgets_projectId_key" ON "project_budgets"("projectId");

-- CreateIndex
CREATE INDEX "project_budgets_projectId_idx" ON "project_budgets"("projectId");

-- CreateIndex
CREATE INDEX "cost_entries_projectId_idx" ON "cost_entries"("projectId");

-- CreateIndex
CREATE INDEX "cost_entries_incurredAt_idx" ON "cost_entries"("incurredAt");

-- CreateIndex
CREATE INDEX "cost_entries_category_idx" ON "cost_entries"("category");

-- CreateIndex
CREATE INDEX "cost_entries_createdById_idx" ON "cost_entries"("createdById");

-- AddForeignKey
ALTER TABLE "project_budgets" ADD CONSTRAINT "project_budgets_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cost_entries" ADD CONSTRAINT "cost_entries_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cost_entries" ADD CONSTRAINT "cost_entries_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
