/*
  Warnings:

  - You are about to drop the `_CourseTopics` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `topicId` to the `Course` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "_CourseTopics" DROP CONSTRAINT "_CourseTopics_A_fkey";

-- DropForeignKey
ALTER TABLE "_CourseTopics" DROP CONSTRAINT "_CourseTopics_B_fkey";

-- AlterTable
ALTER TABLE "Course" ADD COLUMN     "topicId" INTEGER NOT NULL;

-- DropTable
DROP TABLE "_CourseTopics";

-- AddForeignKey
ALTER TABLE "Course" ADD CONSTRAINT "Course_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "Topic"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
