-- Enhance activity_logs with module and request metadata; make branch_id optional
ALTER TABLE "activity_logs" ALTER COLUMN "branch_id" DROP NOT NULL;
ALTER TABLE "activity_logs" ADD COLUMN IF NOT EXISTS "module" TEXT;
ALTER TABLE "activity_logs" ADD COLUMN IF NOT EXISTS "ip_address" TEXT;
ALTER TABLE "activity_logs" ADD COLUMN IF NOT EXISTS "user_agent" TEXT;
CREATE INDEX IF NOT EXISTS "activity_logs_module_idx" ON "activity_logs"("module");
CREATE INDEX IF NOT EXISTS "activity_logs_action_idx" ON "activity_logs"("action");

-- Create audit_logs table for security-focused change tracking
CREATE TABLE IF NOT EXISTS "audit_logs" (
    "id" TEXT NOT NULL,
    "branch_id" TEXT,
    "user_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "module" TEXT,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT,
    "summary" TEXT,
    "old_values" JSONB,
    "new_values" JSONB,
    "changed_fields" JSONB,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "audit_logs_branch_id_idx" ON "audit_logs"("branch_id");
CREATE INDEX IF NOT EXISTS "audit_logs_user_id_idx" ON "audit_logs"("user_id");
CREATE INDEX IF NOT EXISTS "audit_logs_created_at_idx" ON "audit_logs"("created_at");
CREATE INDEX IF NOT EXISTS "audit_logs_entity_type_idx" ON "audit_logs"("entity_type");
CREATE INDEX IF NOT EXISTS "audit_logs_entity_id_idx" ON "audit_logs"("entity_id");
CREATE INDEX IF NOT EXISTS "audit_logs_action_idx" ON "audit_logs"("action");
CREATE INDEX IF NOT EXISTS "audit_logs_module_idx" ON "audit_logs"("module");

ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_branch_id_fkey"
    FOREIGN KEY ("branch_id") REFERENCES "clinic_branch"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
