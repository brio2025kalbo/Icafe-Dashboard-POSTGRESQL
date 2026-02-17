/*
 Navicat Premium Dump SQL

 Source Server         : IcafeDashboard
 Source Server Type    : PostgreSQL
 Source Server Version : 180001 (180001)
 Source Host           : localhost:5432
 Source Catalog        : icafe_dashboard
 Source Schema         : public

 Target Server Type    : PostgreSQL
 Target Server Version : 180001 (180001)
 File Encoding         : 65001

 Date: 18/02/2026 02:15:24
*/


-- ----------------------------
-- Type structure for qb_auto_send_mode
-- ----------------------------
DROP TYPE IF EXISTS "public"."qb_auto_send_mode";
CREATE TYPE "public"."qb_auto_send_mode" AS ENUM (
  'daily_time',
  'business_day_end',
  'last_shift'
);
ALTER TYPE "public"."qb_auto_send_mode" OWNER TO "postgres";

-- ----------------------------
-- Type structure for qb_status
-- ----------------------------
DROP TYPE IF EXISTS "public"."qb_status";
CREATE TYPE "public"."qb_status" AS ENUM (
  'success',
  'failed',
  'pending'
);
ALTER TYPE "public"."qb_status" OWNER TO "postgres";

-- ----------------------------
-- Type structure for role
-- ----------------------------
DROP TYPE IF EXISTS "public"."role";
CREATE TYPE "public"."role" AS ENUM (
  'user',
  'admin'
);
ALTER TYPE "public"."role" OWNER TO "postgres";

-- ----------------------------
-- Type structure for user_cafe_role
-- ----------------------------
DROP TYPE IF EXISTS "public"."user_cafe_role";
CREATE TYPE "public"."user_cafe_role" AS ENUM (
  'owner',
  'manager',
  'viewer'
);
ALTER TYPE "public"."user_cafe_role" OWNER TO "postgres";

-- ----------------------------
-- Sequence structure for cafes_id_seq
-- ----------------------------
DROP SEQUENCE IF EXISTS "public"."cafes_id_seq";
CREATE SEQUENCE "public"."cafes_id_seq" 
INCREMENT 1
MINVALUE  1
MAXVALUE 2147483647
START 1
CACHE 1;

-- ----------------------------
-- Sequence structure for qb_auto_send_settings_id_seq
-- ----------------------------
DROP SEQUENCE IF EXISTS "public"."qb_auto_send_settings_id_seq";
CREATE SEQUENCE "public"."qb_auto_send_settings_id_seq" 
INCREMENT 1
MINVALUE  1
MAXVALUE 2147483647
START 1
CACHE 1;

-- ----------------------------
-- Sequence structure for qb_report_logs_id_seq
-- ----------------------------
DROP SEQUENCE IF EXISTS "public"."qb_report_logs_id_seq";
CREATE SEQUENCE "public"."qb_report_logs_id_seq" 
INCREMENT 1
MINVALUE  1
MAXVALUE 2147483647
START 1
CACHE 1;

-- ----------------------------
-- Sequence structure for qb_tokens_id_seq
-- ----------------------------
DROP SEQUENCE IF EXISTS "public"."qb_tokens_id_seq";
CREATE SEQUENCE "public"."qb_tokens_id_seq" 
INCREMENT 1
MINVALUE  1
MAXVALUE 2147483647
START 1
CACHE 1;

-- ----------------------------
-- Sequence structure for user_cafes_id_seq
-- ----------------------------
DROP SEQUENCE IF EXISTS "public"."user_cafes_id_seq";
CREATE SEQUENCE "public"."user_cafes_id_seq" 
INCREMENT 1
MINVALUE  1
MAXVALUE 2147483647
START 1
CACHE 1;

-- ----------------------------
-- Sequence structure for users_id_seq
-- ----------------------------
DROP SEQUENCE IF EXISTS "public"."users_id_seq";
CREATE SEQUENCE "public"."users_id_seq" 
INCREMENT 1
MINVALUE  1
MAXVALUE 2147483647
START 1
CACHE 1;

-- ----------------------------
-- Table structure for cafes
-- ----------------------------
DROP TABLE IF EXISTS "public"."cafes";
CREATE TABLE "public"."cafes" (
  "id" int4 NOT NULL DEFAULT nextval('cafes_id_seq'::regclass),
  "userId" int4 NOT NULL,
  "name" varchar(255) COLLATE "pg_catalog"."default" NOT NULL,
  "cafeId" varchar(64) COLLATE "pg_catalog"."default" NOT NULL,
  "apiKeyEncrypted" text COLLATE "pg_catalog"."default" NOT NULL,
  "location" varchar(500) COLLATE "pg_catalog"."default",
  "timezone" varchar(100) COLLATE "pg_catalog"."default",
  "isActive" bool NOT NULL DEFAULT true,
  "createdAt" timestamp(6) NOT NULL DEFAULT now(),
  "updatedAt" timestamp(6) NOT NULL DEFAULT now()
)
;

-- ----------------------------
-- Records of cafes
-- ----------------------------
INSERT INTO "public"."cafes" VALUES (1, 2, 'The Goomar E-Sports Calumpang', '87127', '8f2e7674e63243b18e4575c2e5c3e129:1838e834daac25a47b587c02ccd51e62:d4f836d2d6d66d2c526a7766868c97fbfd5a829560e93e833a6feca5ecb06a386df3668edbaebe6a75ccb9d255ab62740686ed1966ac520ed844877c30b5c1d67b1337ac29be503ffb41d17219bdeb3ebfc85bb12544d2de921a0646f2452bf8f41441bd301ef0903e47d69a5d1a04def3a2b765a3c88c3346fe50720705ded9d25f9b0cdf36fec27b4b101bf40b54064082c06beddaafd3fdf5b565a6cb062f926366bbe08bd9366fc37e0bdf825f6de93f81a01490a18cf48a282f9d6765799c80d4d30569c7774eb27f2cc3a4d40ce5933232a1794a25e620657764046f6e1b4c9ab52a7ac04e17ae542532f1c0db58125407aa89119f6074f56a94ed934ea512c13b11b82271bd5d66ae10d1103e541950fc2d34ddad552571ad11cf909c84df10421123747cabafb975c46d4d2f04bc791dad16fd6681e26e8a2ef5557c10bb3ec70ac7872c5afdc129b516e978610ad0865691c577a9cbfcbd7fac92f5b286ff07196d0ef9b65c5d9aeae3809065f228119fff85d025b9723e459b20ed242b0a61d122a805dc9c38b48d417c8151c17e6db79ff41ca09a2545b7430555f7463544fa2f3f4d0a3c5326b754e089b4434ce3eddd514d785fc552d5264b500cda865d36623ece82d666ce1a53a413587c720f50c3a8d57bb00ed85b20cfe368436ccd2d5118a8aada5b2f10bdbae437393358a3eed78c1474e7a05c77b7a53ffd30803728bf452036f2ded1d3b588f032a1dca5ec1d650dc32ffeaf8addd57eefa903fca0824bc79e5f3816fb737d359e6d0a0025c538e2ba2147e4490d8bc4527a5e74d1c408fe6992e1bcd2db764cb6d69a80551db1c8585ded6203fbec7db4030b5597a70df9b512270475dc13d8fb02a59778a4518e59567012ad04c63b9344c222f71ab26a6cf16e879092f15dfd9affcf97987dfdacfd78dbdfcec7f40830617cd5a32c54d58f309a4ce6c73e21f23fac2f93c518a98c6860bb6e230408be797fb4aefa3f02d1e26bf1d8d3e8177da2dcb7a9a186d6e70ffc1fc3d02a6467e49b0bdd9977337da9a6ad5187c4ee01da5a5fd90a2ab488df5f1e3d04bb8835dba8d8edb16b11fd6419ac926d5525aff550b8ad1f619b013308260ed01443288e2f16e7a5f4f0360e3ade3961a37655273ae7c49c2cb531b784488abd700a5c64e3854eee098b9da9fb23be86f140d36f25e763393250e395610c0aab67971bbfabe191a849ed954793f8bed87b0bac31202c744840ac29a80edac5c594b58e542d16f3ea861ffe69e1137e9a2b5f8ff8f9974c8fe3ba18af02628b006b3b4e4a48349406dc2efd9b796bd77a2f86bef9bb525b77815fac818d0ac3f811df79528ed730d6b90006db49cba09e54ca89b93075c9239f622b55cbb68c32ec5eef6d1b6028', '', '', 't', '2026-02-10 03:16:33.568241', '2026-02-10 03:16:33.568241');
INSERT INTO "public"."cafes" VALUES (2, 2, 'The Goomar E-Sports Koronadal', '87169', 'e22a7a59ea734495f42f80a2021e0265:9f107a6002dac192fda1e699bb5b366e:fe73fa9d68847abfc5f918ec1565819cb5501640607f726d2ad4caaf8135f99df83cb90750cdb48085b4c6fdd9150d0d705339053ccadce4b5e4e3f919e770acfa8ccbe6f0e8c7bc706c55cbcd22361c5a2fc6659f50fb7ba073caea898bff6d922b59b0fa6fd192dabfe19aeda03708d450a9df8ff22fed21cdba73b9b8df29a1779f09454b83ca1e35fecb912bfb217ce97d2a4d336f021b5419f5363629540d0c54124bc627aa1966c6fae0e9c04c1bf243502c2cad1d0a72b4c90d630b9c144bc9c05d78f7e928e240129abc0dc062004f01955a3d0e0b7618ba7d381e8eb13d02cd9cd6fd4c7d0b8b20a6c6105c188a9eedd7a51bf2536ec47eef3c337493d8ae259580627144a43dc82ca63f17f7d094eb7331c9d0693a25767e1a4d81b2393648a8984a853db4e8ae9358c9d6e8bb3fff2d5b36e2cb847dcf159210f282a83f3ad82fbda9ba8af127cec8e46f9ffa772aa99e745b148467076715b4a2a17be6206d68c4dae79e7a31b6a4039a3e887117b5f9eda92c9f597930844c37a1c14096926c92ce1b645c99e1a7c23105dceee656ed7e7451ae6813b7b634d25e988ee80874dac86c02fdf3ee7bad14e77833fd90a98e6f8a301f582da7d67677d97ddb4cd06bc287af596d3982bc49b1bafc6d2d86536318cc69661b57d19b62fa729f01e96c474165be76240181392014d9fa894deccbad77c15c5f0d9d8e5e0a384a119f4ce23d114bead0762e86e03813d52edc54d361a6ed892882bb6e4557f0359df5cc70ce825ea001723592b9d1b20bbf2fff82c54f3cba503acd37e60f93c0387e8af581bceac30ba1ad8ddae8b42e1a465eb6c42b1e68be363d7bc41baa8c737431451f8d53fd24c24f89f2b47c979457e3adcad8afed79aa5f7c7b7e90d8f7e794c5fbc212282149b85ae7c60e72d43fe0b2a5c6a7759b6b9780299f9ecad10015b243297ada3cbc365c139d674598b13508772a11bce41b24f92d8b18c15dc6e1bab2775b52f54d1bc204ee339c04ece46907071faeb0c72855c8336ba1640f0410bbc130e897dcc7f148dae70ac9d1d36cc4575511039168209e33416cb73dae6f8a697e835ef5a6bb2480857b90f14a01d66eae726dc51d131d40d9ed085aa93b3ad94624ebefaf798383d3df61c1a4f94c17287b18a0178e914ee5d9d08de81a79413dc828421c4f50c65081288f36f9920a880ad6e61ebd2b1328346c4f523b61479243835d05239bb818bb0ef71ebe7288ce84cade97d49a7df773e69d18c5f255460608019365cfbaedce1ef75b87662ffef0a20c470d1d319d72ab59a83348e735c7af2e74afac254eafea3375f60cc6b13aac9fab82fc939fa943b55fcb3c6885565c2d4fd75299d2f3821d96a41843422208fbd5d2beb76d712d21a6', '', '', 't', '2026-02-10 03:16:57.035931', '2026-02-10 03:16:57.035931');
INSERT INTO "public"."cafes" VALUES (3, 2, 'The Goomar E-Sports Laurel', '12345', '8530cfe0666cb9fc035869c761ae1ffa:677ccd86aa90f122013331d33376943e:60fe11d0dc', '', '', 't', '2026-02-12 02:23:52.385335', '2026-02-12 02:23:52.385335');

-- ----------------------------
-- Table structure for qb_auto_send_settings
-- ----------------------------
DROP TABLE IF EXISTS "public"."qb_auto_send_settings";
CREATE TABLE "public"."qb_auto_send_settings" (
  "id" int4 NOT NULL DEFAULT nextval('qb_auto_send_settings_id_seq'::regclass),
  "userId" int4 NOT NULL,
  "cafeId" int4 NOT NULL,
  "enabled" int4 NOT NULL DEFAULT 0,
  "mode" "public"."qb_auto_send_mode" NOT NULL,
  "scheduleTime" varchar(5) COLLATE "pg_catalog"."default",
  "createdAt" timestamp(6) NOT NULL DEFAULT now(),
  "updatedAt" timestamp(6) NOT NULL DEFAULT now()
)
;

-- ----------------------------
-- Records of qb_auto_send_settings
-- ----------------------------

-- ----------------------------
-- Table structure for qb_report_logs
-- ----------------------------
DROP TABLE IF EXISTS "public"."qb_report_logs";
CREATE TABLE "public"."qb_report_logs" (
  "id" int4 NOT NULL DEFAULT nextval('qb_report_logs_id_seq'::regclass),
  "user_id" int4 NOT NULL,
  "cafe_id" int4 NOT NULL,
  "cafe_name" varchar(255) COLLATE "pg_catalog"."default" NOT NULL,
  "business_date" varchar(10) COLLATE "pg_catalog"."default" NOT NULL,
  "journal_entry_id" varchar(64) COLLATE "pg_catalog"."default",
  "total_cash" int4,
  "shift_count" int4,
  "status" "public"."qb_status" NOT NULL DEFAULT 'pending'::qb_status,
  "error_message" text COLLATE "pg_catalog"."default",
  "sent_at" timestamp(6) NOT NULL DEFAULT now()
)
;

-- ----------------------------
-- Records of qb_report_logs
-- ----------------------------
INSERT INTO "public"."qb_report_logs" VALUES (78, 2, 2, 'The Goomar E-Sports Koronadal', '2026-02-17', '348', 14060, 1, 'success', NULL, '2026-02-17 17:45:46.867774');
INSERT INTO "public"."qb_report_logs" VALUES (79, 2, 1, 'The Goomar E-Sports Calumpang', '2026-02-17', '349', 8598, 1, 'success', NULL, '2026-02-17 17:45:59.034778');
INSERT INTO "public"."qb_report_logs" VALUES (80, 2, 1, 'The Goomar E-Sports Calumpang', '2026-02-16', '350', 23760, 3, 'success', NULL, '2026-02-17 17:46:23.723744');
INSERT INTO "public"."qb_report_logs" VALUES (81, 2, 2, 'The Goomar E-Sports Koronadal', '2026-02-16', '351', 31764, 3, 'success', NULL, '2026-02-17 17:46:34.847014');

-- ----------------------------
-- Table structure for qb_tokens
-- ----------------------------
DROP TABLE IF EXISTS "public"."qb_tokens";
CREATE TABLE "public"."qb_tokens" (
  "id" int4 NOT NULL DEFAULT nextval('qb_tokens_id_seq'::regclass),
  "user_id" int4 NOT NULL,
  "realm_id" varchar(64) COLLATE "pg_catalog"."default" NOT NULL,
  "access_token" text COLLATE "pg_catalog"."default" NOT NULL,
  "refresh_token" text COLLATE "pg_catalog"."default" NOT NULL,
  "access_token_expires_at" timestamp(6) NOT NULL,
  "refresh_token_expires_at" timestamp(6) NOT NULL,
  "company_name" varchar(255) COLLATE "pg_catalog"."default",
  "created_at" timestamp(6) NOT NULL DEFAULT now(),
  "updated_at" timestamp(6) NOT NULL DEFAULT now()
)
;

-- ----------------------------
-- Records of qb_tokens
-- ----------------------------
INSERT INTO "public"."qb_tokens" VALUES (30002, 1, '9341456378598184', 'eyJhbGciOiJkaXIiLCJlbmMiOiJBMTI4Q0JDLUhTMjU2IiwieC5vcmciOiJIMCJ9..dTyRdKscaU1urudQhnUohQ.YVjHtFFuoLmcr2d0dzic5-ldM1k_RSbzGBPSESl7CqJn1D48ZgpkJ0za4aW6mW4h4NxyqMeHl0SnKTAKz4O4XHXhgbqpiVYPK2hhbhND7eJOcmZH32RVJjNBXC6OYw_s9pXWpN5Pqbe-jspNtsrZctp3Qf8oq_rZP7sRDQV7_9zmWU99ZJs69HPQmE47EvtWdXzhDVg5w6l06Sjbrh2kptrQsA9hhsB9KRKcHtfdKubdh4PWnjRkD3UIaVOxEl-IiwADCRw_0FiUpEAaqmfxHVgNiuAjnOY8LD4dyI9vHsuWgOOnzB9UYBwHLYBI4qNXMdx4zntJUsg6qGcWncanty9gqFx05jK3iyzkA6uGz5q_OEu3biNFS4iB6mnLgK0Rjtb9gjXHbYL0wMGuMIIGLNOonv28LmEzyo7aGpoPy9dokmMALRvTBFXDUhmRYkr5wIMFxWsgqxcbasWuWV1aDiFNBpCgJT2j9RC4_mr9JLY.tzt6hMS0mlTLMG-3qwZp4A', 'RT1-118-H0-17799098713vtt5cbm6r477gesrviq', '2026-02-16 14:17:52.446', '2026-05-27 19:24:30.446', NULL, '2026-02-15 19:24:31', '2026-02-15 19:24:31');
INSERT INTO "public"."qb_tokens" VALUES (1, 2, '9341456378598184', 'eyJhbGciOiJkaXIiLCJlbmMiOiJBMTI4Q0JDLUhTMjU2IiwieC5vcmciOiJIMCJ9..J03IKAu5wdoQBLFll9cHOA.P_Q3HvOIcVVw1L9P6Hao-CXyyaSwORpZehmoQ_zUwYdKHRlx0P6iSKef-Lef1qki-mRbj2A1I3Uvds9aDK1QwUR2Y4lTxAHEXUXjRWMnMDdIecPaNucH2fuqkTOH4fgGQDvJaR5wL08h833j9VvypLgMS6nsayMU62kPOL1c6CU4s8CBInRVCJID4adMieR0peRuP28y8kXyHirIOwwXrc42nYq1ndhr91TOKPcy-nRGwT2GnPV9b1qDA6YPOgFZJTeLZGqLktHfaBTa3cgAGDZzF3RQQg-7-Qp2xMT2HJRgjkfjmNtGvhh9LhnHiVV-OJe3Dsx9B3RY40bbUOQjnFzCG2zZ2rLBDd11u0k7W3IofvUFF3TF2-3O2R0riipjdJ_r9s8x94wmFp2NXQW2I2Hp6GSI0v76oRWLwTaQ0GfANZw6OZqrDd_qvr_8F_2OPmulRMbIEamDMluLVcVtZCBFPy1gx1RQ1BeB5msWllY.1ZWN8HaS_Jk94hSjbbKTig', 'RT1-132-H0-1780047050y5e7mn8e7fe7t3efdae5', '2026-02-17 10:30:52.348', '2026-05-29 09:30:52.348', 'Sandbox Company_US_1', '2026-02-17 17:30:52.4727', '2026-02-17 17:30:52.4727');

-- ----------------------------
-- Table structure for user_cafes
-- ----------------------------
DROP TABLE IF EXISTS "public"."user_cafes";
CREATE TABLE "public"."user_cafes" (
  "id" int4 NOT NULL DEFAULT nextval('user_cafes_id_seq'::regclass),
  "userId" int4 NOT NULL,
  "cafeId" int4 NOT NULL,
  "role" "public"."user_cafe_role" NOT NULL DEFAULT 'owner'::user_cafe_role,
  "createdAt" timestamptz(6) NOT NULL DEFAULT now()
)
;

-- ----------------------------
-- Records of user_cafes
-- ----------------------------
INSERT INTO "public"."user_cafes" VALUES (1, 2, 6, 'owner', '2026-02-18 02:02:55.93519+08');
INSERT INTO "public"."user_cafes" VALUES (2, 2, 3, 'owner', '2026-02-18 02:02:55.937012+08');
INSERT INTO "public"."user_cafes" VALUES (3, 2, 1, 'owner', '2026-02-18 02:02:55.937974+08');
INSERT INTO "public"."user_cafes" VALUES (4, 2, 2, 'owner', '2026-02-18 02:02:55.93878+08');
INSERT INTO "public"."user_cafes" VALUES (5, 2, 5, 'owner', '2026-02-18 02:02:55.939628+08');
INSERT INTO "public"."user_cafes" VALUES (6, 3, 1, 'viewer', '2026-02-18 02:05:12.515337+08');

-- ----------------------------
-- Table structure for users
-- ----------------------------
DROP TABLE IF EXISTS "public"."users";
CREATE TABLE "public"."users" (
  "id" int4 NOT NULL DEFAULT nextval('users_id_seq'::regclass),
  "openId" varchar(64) COLLATE "pg_catalog"."default",
  "name" text COLLATE "pg_catalog"."default",
  "email" varchar(320) COLLATE "pg_catalog"."default",
  "loginMethod" varchar(64) COLLATE "pg_catalog"."default",
  "createdAt" timestamp(6) NOT NULL DEFAULT now(),
  "updatedAt" timestamp(6) NOT NULL DEFAULT now(),
  "lastSignedIn" timestamp(6) NOT NULL DEFAULT now(),
  "username" varchar(64) COLLATE "pg_catalog"."default",
  "password" varchar(255) COLLATE "pg_catalog"."default",
  "role" "public"."role" NOT NULL DEFAULT 'user'::role
)
;

-- ----------------------------
-- Records of users
-- ----------------------------
INSERT INTO "public"."users" VALUES (3, NULL, 'champs', 'champ@champ.com', 'local', '2026-02-17 19:05:15.581046', '2026-02-17 19:05:15.581046', '2026-02-17 14:34:59.167', 'champ', '1200cd4044b7f2592478b570aaca5d95:6bc01945363866cb3f2c3a95140240c851cf96bd7c43c1f9edae42928e1a9a061c9edff2492de532ffc78b79be87d37360f36fb4f6f2b8bf7d8042b2ab37bfcb', 'user');
INSERT INTO "public"."users" VALUES (4, NULL, 'vince', 'vince@vince.com', 'local', '2026-02-17 21:57:56.0757', '2026-02-17 21:57:56.0757', '2026-02-17 15:20:11.593', 'vince', '761a9fe473b69789ff75a0c89d196cdd:95e897faf09107e5ee827465e3f50bbe7f37801fdb4c0a4bba90d8e6d5f837cd527704cd8b07ea884fbebd2ff3f92002744d54b592cc9839e64cb7fee279f281', 'user');
INSERT INTO "public"."users" VALUES (2, NULL, 'Administrator', 'admin@example.com', 'local', '2026-02-17 03:20:41.34387', '2026-02-17 03:20:41.34387', '2026-02-17 17:54:59.773', 'admin', '49c94e24323413505987dfee54fb7a3f:8445326305c6c82ea835b8a5d59e3df4309eaf5a85543d202a576a9b959d08683833ca3307450f09d59dc2284d62eda6fef6827304d9d321c870ff4bb87d4a17', 'admin');

-- ----------------------------
-- Alter sequences owned by
-- ----------------------------
ALTER SEQUENCE "public"."cafes_id_seq"
OWNED BY "public"."cafes"."id";
SELECT setval('"public"."cafes_id_seq"', 6, true);

-- ----------------------------
-- Alter sequences owned by
-- ----------------------------
ALTER SEQUENCE "public"."qb_auto_send_settings_id_seq"
OWNED BY "public"."qb_auto_send_settings"."id";
SELECT setval('"public"."qb_auto_send_settings_id_seq"', 1, false);

-- ----------------------------
-- Alter sequences owned by
-- ----------------------------
ALTER SEQUENCE "public"."qb_report_logs_id_seq"
OWNED BY "public"."qb_report_logs"."id";
SELECT setval('"public"."qb_report_logs_id_seq"', 81, true);

-- ----------------------------
-- Alter sequences owned by
-- ----------------------------
ALTER SEQUENCE "public"."qb_tokens_id_seq"
OWNED BY "public"."qb_tokens"."id";
SELECT setval('"public"."qb_tokens_id_seq"', 1, true);

-- ----------------------------
-- Alter sequences owned by
-- ----------------------------
ALTER SEQUENCE "public"."user_cafes_id_seq"
OWNED BY "public"."user_cafes"."id";
SELECT setval('"public"."user_cafes_id_seq"', 6, true);

-- ----------------------------
-- Alter sequences owned by
-- ----------------------------
ALTER SEQUENCE "public"."users_id_seq"
OWNED BY "public"."users"."id";
SELECT setval('"public"."users_id_seq"', 4, true);

-- ----------------------------
-- Primary Key structure for table cafes
-- ----------------------------
ALTER TABLE "public"."cafes" ADD CONSTRAINT "cafes_pkey" PRIMARY KEY ("id");

-- ----------------------------
-- Primary Key structure for table qb_auto_send_settings
-- ----------------------------
ALTER TABLE "public"."qb_auto_send_settings" ADD CONSTRAINT "qb_auto_send_settings_pkey" PRIMARY KEY ("id");

-- ----------------------------
-- Primary Key structure for table qb_report_logs
-- ----------------------------
ALTER TABLE "public"."qb_report_logs" ADD CONSTRAINT "qb_report_logs_pkey" PRIMARY KEY ("id");

-- ----------------------------
-- Primary Key structure for table qb_tokens
-- ----------------------------
ALTER TABLE "public"."qb_tokens" ADD CONSTRAINT "qb_tokens_pkey" PRIMARY KEY ("id");

-- ----------------------------
-- Indexes structure for table user_cafes
-- ----------------------------
CREATE UNIQUE INDEX "user_cafe_unique" ON "public"."user_cafes" USING btree (
  "userId" "pg_catalog"."int4_ops" ASC NULLS LAST,
  "cafeId" "pg_catalog"."int4_ops" ASC NULLS LAST
);

-- ----------------------------
-- Primary Key structure for table user_cafes
-- ----------------------------
ALTER TABLE "public"."user_cafes" ADD CONSTRAINT "user_cafes_pkey" PRIMARY KEY ("id");

-- ----------------------------
-- Uniques structure for table users
-- ----------------------------
ALTER TABLE "public"."users" ADD CONSTRAINT "users_username_unique" UNIQUE ("username");

-- ----------------------------
-- Primary Key structure for table users
-- ----------------------------
ALTER TABLE "public"."users" ADD CONSTRAINT "users_pkey" PRIMARY KEY ("id");
