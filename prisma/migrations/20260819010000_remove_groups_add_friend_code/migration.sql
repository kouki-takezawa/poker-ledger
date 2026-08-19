-- This migration retires the persistent Group/GroupMember model. Sessions no
-- longer belong to a shared group; they are just their creator plus whichever
-- friends were invited for that occasion. See docs/spec-friends.md.
--
-- NOTE: this drops the Group and GroupMember tables. It does NOT touch
-- Session/SessionEntry/Rebuy/RebuyShare/Settlement rows (your poker history
-- is preserved) — only the "which group" association column on Session is
-- dropped, along with the now-unused Group/GroupMember tables themselves.
-- Back up before running against a database with real data.

-- AddColumn (nullable first, so it can be backfilled)
ALTER TABLE "User" ADD COLUMN "friendCode" TEXT;

-- Backfill existing users with a random 8-character code
UPDATE "User"
SET "friendCode" = UPPER(SUBSTRING(REPLACE(gen_random_uuid()::text, '-', '') FOR 8))
WHERE "friendCode" IS NULL;

ALTER TABLE "User" ALTER COLUMN "friendCode" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "User_friendCode_key" ON "User"("friendCode");

-- DropForeignKey
ALTER TABLE "Session" DROP CONSTRAINT "Session_groupId_fkey";

-- DropForeignKey
ALTER TABLE "GroupMember" DROP CONSTRAINT "GroupMember_groupId_fkey";

-- DropForeignKey
ALTER TABLE "GroupMember" DROP CONSTRAINT "GroupMember_userId_fkey";

-- DropForeignKey
ALTER TABLE "Group" DROP CONSTRAINT "Group_createdById_fkey";

-- AlterTable
ALTER TABLE "Session" DROP COLUMN "groupId";

-- DropTable
DROP TABLE "GroupMember";

-- DropTable
DROP TABLE "Group";
