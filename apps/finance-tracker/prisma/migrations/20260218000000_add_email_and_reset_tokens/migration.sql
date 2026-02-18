-- AlterTable: add email fields to users
ALTER TABLE "users" ADD COLUMN "email_hash" TEXT NOT NULL DEFAULT '';
ALTER TABLE "users" ADD COLUMN "email_encrypted" TEXT NOT NULL DEFAULT '';

-- CreateIndex: unique constraint on email_hash
CREATE UNIQUE INDEX "users_email_hash_key" ON "users"("email_hash");

-- CreateTable: password_reset_tokens
CREATE TABLE "password_reset_tokens" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: index on user_id for reset tokens
CREATE INDEX "password_reset_tokens_user_id_idx" ON "password_reset_tokens"("user_id");

-- AddForeignKey
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
