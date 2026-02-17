CREATE TYPE "public"."qb_status" AS ENUM('success', 'failed', 'pending');--> statement-breakpoint
CREATE TABLE "qb_report_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"cafe_id" integer NOT NULL,
	"cafe_name" varchar(255) NOT NULL,
	"business_date" varchar(10) NOT NULL,
	"journal_entry_id" varchar(64),
	"total_cash" integer,
	"shift_count" integer,
	"status" "qb_status" DEFAULT 'pending' NOT NULL,
	"error_message" text,
	"sent_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "qb_tokens" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"realm_id" varchar(64) NOT NULL,
	"access_token" text NOT NULL,
	"refresh_token" text NOT NULL,
	"access_token_expires_at" timestamp NOT NULL,
	"refresh_token_expires_at" timestamp NOT NULL,
	"company_name" varchar(255),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
