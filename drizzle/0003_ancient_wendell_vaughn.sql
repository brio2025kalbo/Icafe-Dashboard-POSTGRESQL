CREATE TYPE "public"."user_cafe_role" AS ENUM('owner', 'manager', 'viewer');--> statement-breakpoint
CREATE TABLE "user_cafes" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"cafeId" integer NOT NULL,
	"role" "user_cafe_role" DEFAULT 'owner' NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "user_cafe_unique" ON "user_cafes" USING btree ("userId","cafeId");