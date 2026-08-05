CREATE TABLE "task_executions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"capability_id" text NOT NULL,
	"status" text DEFAULT 'PENDING' NOT NULL,
	"input" jsonb NOT NULL,
	"output" jsonb,
	"error" jsonb,
	"worker_id" text,
	"progress" integer DEFAULT 0,
	"attempts" integer DEFAULT 0 NOT NULL,
	"max_retries" integer DEFAULT 0 NOT NULL,
	"timeout_ms" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"started_at" timestamp,
	"completed_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "task_executions" ADD CONSTRAINT "task_executions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;