CREATE TABLE "memory_metadata" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"memory_type" text NOT NULL,
	"memory_id" uuid NOT NULL,
	"status" text DEFAULT 'ACTIVE' NOT NULL,
	"importance" integer DEFAULT 50 NOT NULL,
	"confidence" integer DEFAULT 100 NOT NULL,
	"access_count" integer DEFAULT 1 NOT NULL,
	"last_access_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"archived_at" timestamp with time zone,
	"expires_at" timestamp with time zone,
	"custom_metadata" jsonb
);
--> statement-breakpoint
CREATE TABLE "conversation_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversation_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" text NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ 
DECLARE
  legacy_count INT;
BEGIN
  -- Safe guard to ensure memory_rankings is empty before destroying
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'memory_rankings') THEN
    EXECUTE 'SELECT count(*) FROM memory_rankings' INTO legacy_count;
    IF legacy_count > 0 THEN
      RAISE EXCEPTION 'MIGRATION HALTED: memory_rankings contains % rows. A manual data migration is required before replacing it with memory_metadata.', legacy_count;
    END IF;
  END IF;

  -- Perform data preservation for legacy conversations if the columns still exist
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'conversations' AND column_name = 'role') THEN
    INSERT INTO "conversation_messages" ("id", "conversation_id", "user_id", "role", "content", "created_at")
    SELECT gen_random_uuid(), "id", "user_id", "role", "content", "created_at"
    FROM "conversations"
    WHERE "role" IS NOT NULL AND "content" IS NOT NULL;
  END IF;
END $$;
--> statement-breakpoint
ALTER TABLE "memory_rankings" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "memory_rankings" CASCADE;--> statement-breakpoint
DROP INDEX IF EXISTS "conversations_user_idx";--> statement-breakpoint
DROP INDEX IF EXISTS "conversations_created_idx";--> statement-breakpoint
ALTER TABLE "conversations" ADD COLUMN "title" text;--> statement-breakpoint
ALTER TABLE "memory_metadata" ADD CONSTRAINT "memory_metadata_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversation_messages" ADD CONSTRAINT "conversation_messages_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversation_messages" ADD CONSTRAINT "conversation_messages_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "conv_messages_conv_idx" ON "conversation_messages" USING btree ("conversation_id");--> statement-breakpoint
CREATE INDEX "conv_messages_user_idx" ON "conversation_messages" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "conv_messages_created_idx" ON "conversation_messages" USING btree ("created_at");--> statement-breakpoint
ALTER TABLE "conversations" DROP COLUMN IF EXISTS "role";--> statement-breakpoint
ALTER TABLE "conversations" DROP COLUMN IF EXISTS "content";