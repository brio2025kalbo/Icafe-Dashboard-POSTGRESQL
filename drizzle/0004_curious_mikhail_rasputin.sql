CREATE TYPE "public"."qb_auto_send_mode" AS ENUM('daily_time', 'business_day_end', 'last_shift');--> statement-breakpoint
CREATE TABLE "qb_auto_send_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"cafeId" integer NOT NULL,
	"enabled" integer DEFAULT 0 NOT NULL,
	"mode" "qb_auto_send_mode" NOT NULL,
	"scheduleTime" varchar(5),
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
