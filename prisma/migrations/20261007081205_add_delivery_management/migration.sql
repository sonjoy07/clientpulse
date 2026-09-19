-- AlterTable
ALTER TABLE "milestones" ADD COLUMN     "startDate" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "tasks_priority_idx" ON "tasks"("priority");
