import { COOKIE_NAME, MAX_FEEDBACK_LIMIT, DEFAULT_FEEDBACK_LIMIT, FEEDBACK_READ_STATUS_ALL } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
//import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { adminProcedure, protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { z } from "zod";
import {
  getUserCafes,
  getCafeById,
  addCafe,
  updateCafe,
  deleteCafe,
  getAllUserCafesWithKeys,
  getAllUsers,
  getUserById,
  createLocalUser,
  updateUser,
  deleteUser,
  getCafeUsers,
  assignUserToCafe,
  removeUserFromCafe,
  updateUserProfile,
} from "./db";
import * as icafe from "./icafe-api";
import {
  createQuickBooksClient,
  createDailySales,
  createDailyRefund,
  createDailyExpense,
} from "./services/quickbooks";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
    updateProfile: protectedProcedure
      .input(
        z.object({
          name: z.string().optional(),
          email: z.string().email().optional(),
          password: z.string().min(6).optional(),
        }).refine(
          (data) => data.name !== undefined || data.email !== undefined || data.password !== undefined,
          { message: "At least one field must be provided" }
        )
      )
      .mutation(async ({ ctx, input }) => {
        return updateUserProfile(ctx.user.id, input);
      }),
  }),

  // === Cafe Management ===
  cafes: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return getUserCafes(ctx.user.id);
    }),

    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        const cafe = await getCafeById(input.id, ctx.user.id);
        if (!cafe) return null;
        return {
          id: cafe.id,
          name: cafe.name,
          cafeId: cafe.cafeId,
          location: cafe.location,
          timezone: cafe.timezone,
          isActive: cafe.isActive,
          hasApiKey: true,
        };
      }),

    add: adminProcedure
      .input(
        z.object({
          name: z.string().min(1),
          cafeId: z.string().min(1),
          apiKey: z.string().min(1),
          location: z.string().optional(),
          timezone: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        return addCafe(ctx.user.id, input);
      }),

    update: adminProcedure
      .input(
        z.object({
          id: z.number(),
          name: z.string().optional(),
          cafeId: z.string().optional(),
          apiKey: z.string().optional(),
          location: z.string().optional(),
          timezone: z.string().optional(),
          isActive: z.number().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const { id, ...data } = input;
        return updateCafe(id, ctx.user.id, data);
      }),

    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        return deleteCafe(input.id, ctx.user.id);
      }),

    testConnection: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const cafe = await getCafeById(input.id, ctx.user.id);
        if (!cafe) return { success: false, message: "Cafe not found" };
        try {
          const result = await icafe.getPcs({
            cafeId: cafe.cafeId,
            apiKey: cafe.apiKey,
          });
          if (result.code === 200) {
            return { success: true, message: "Connected successfully" };
          }
          // Provide helpful context for common errors
          let msg = result.message || "Unknown error";
          if (msg.includes("Unauthorization from")) {
            msg += ". Please add this IP to your iCafeCloud API Access IP whitelist (Settings → API Access IP).";
          } else if (msg === "Unauthenticated.") {
            msg = "API key is invalid or expired. Please check your API key in iCafeCloud admin panel.";
          }
          return { success: false, message: msg };
        } catch (err: unknown) {
          const errMsg = err instanceof Error ? err.message : "Connection failed";
          return { success: false, message: errMsg };
        }
      }),

    testConnectionDirect: adminProcedure
      .input(z.object({ cafeId: z.string().min(1), apiKey: z.string().min(1) }))
      .mutation(async ({ input }) => {
        try {
          const result = await icafe.getPcs({
            cafeId: input.cafeId,
            apiKey: input.apiKey,
          });
          if (result.code === 200) {
            return { success: true, message: "Connected successfully" };
          }
          let msg = result.message || "Unknown error";
          if (msg.includes("Unauthorization from")) {
            msg += ". Please add this IP to your iCafeCloud API Access IP whitelist (Settings → API Access IP).";
          } else if (msg === "Unauthenticated.") {
            msg = "API key is invalid or expired. Please check your API key in iCafeCloud admin panel.";
          }
          return { success: false, message: msg };
        } catch (err: unknown) {
          const errMsg = err instanceof Error ? err.message : "Connection failed";
          return { success: false, message: errMsg };
        }
      }),

     // User assignment endpoints
    getUsers: adminProcedure
    .input(z.object({ cafeId: z.number() }))
    .query(async ({ ctx, input }) => {
      return getCafeUsers(input.cafeId, ctx.user.id);
    }),

  assignUser: adminProcedure
    .input(
      z.object({
        cafeId: z.number(),
        userId: z.number(),
        role: z.enum(["owner", "manager", "viewer"]).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return assignUserToCafe(
        input.cafeId,
        input.userId,
        ctx.user.id,
        input.role || "viewer"
      );
    }),

  removeUser: adminProcedure
    .input(
      z.object({
        cafeId: z.number(),
        userId: z.number(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return removeUserFromCafe(input.cafeId, input.userId, ctx.user.id);
    }),
}),

  // === PC Management ===
  pcs: router({
    list: protectedProcedure
      .input(z.object({ cafeDbId: z.number() }))
      .query(async ({ ctx, input }) => {
        const cafe = await getCafeById(input.cafeDbId, ctx.user.id);
        if (!cafe) return { code: 404, message: "Cafe not found", data: [] };
        return icafe.getPcs({ cafeId: cafe.cafeId, apiKey: cafe.apiKey });
      }),

      listAll: protectedProcedure.query(async ({ ctx }) => {
        const allCafes = await getAllUserCafesWithKeys(ctx.user.id);
      
        const results = await Promise.all(
          allCafes.map(async (cafe) => {
            let pcList: any[] = [];
      
            try {
              const pcsResponse = await icafe.getPcs({
                cafeId: cafe.cafeId,
                apiKey: cafe.apiKey,
              });
      
              pcList = pcsResponse?.data || [];
            } catch (err) {
              console.error("PCS fetch failed:", cafe.name, err);
            }
      
            const total = pcList.length;

            let inUse = 0;

            pcList.forEach((pc: any) => {
              if (Number(pc.pc_in_using) === 1) {
                inUse++;
              }
            });

            const offline = total - inUse;
            const online = inUse;

            return {
              cafeDbId: cafe.id,
              cafeName: cafe.name,
              cafeId: cafe.cafeId,
              pcs: pcList,
              stats: {
                total,
                online,
                inUse,
                offline,
              },
            };
          })
        );
      
        return results;
      }),
      
      
    

    setOutOfOrder: adminProcedure
      .input(
        z.object({
          cafeDbId: z.number(),
          pcNames: z.array(z.string()),
          outOfOrder: z.number(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const cafe = await getCafeById(input.cafeDbId, ctx.user.id);
        if (!cafe) return { code: 404, message: "Cafe not found" };
        return icafe.setOutOfOrder(
          { cafeId: cafe.cafeId, apiKey: cafe.apiKey },
          input.pcNames,
          input.outOfOrder
        );
      }),

    sendCommand: adminProcedure
      .input(
        z.object({
          cafeDbId: z.number(),
          command: z.record(z.string(), z.unknown()),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const cafe = await getCafeById(input.cafeDbId, ctx.user.id);
        if (!cafe) return { code: 404, message: "Cafe not found" };
        return icafe.sendWssCommand(
          { cafeId: cafe.cafeId, apiKey: cafe.apiKey },
          input.command
        );
      }),

    rooms: protectedProcedure
      .input(z.object({ cafeDbId: z.number() }))
      .query(async ({ ctx, input }) => {
        const cafe = await getCafeById(input.cafeDbId, ctx.user.id);
        if (!cafe) return { code: 404, message: "Cafe not found", data: [] };
        return icafe.getRooms({ cafeId: cafe.cafeId, apiKey: cafe.apiKey });
      }),
  }),

  // === Session Management ===
  sessions: router({
    paymentInfo: protectedProcedure
      .input(z.object({ cafeDbId: z.number(), pcName: z.string() }))
      .query(async ({ ctx, input }) => {
        const cafe = await getCafeById(input.cafeDbId, ctx.user.id);
        if (!cafe) return { code: 404, message: "Cafe not found" };
        return icafe.getPaymentInfo(
          { cafeId: cafe.cafeId, apiKey: cafe.apiKey },
          input.pcName
        );
      }),

    checkout: protectedProcedure
      .input(
        z.object({
          cafeDbId: z.number(),
          data: z.record(z.string(), z.unknown()),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const cafe = await getCafeById(input.cafeDbId, ctx.user.id);
        if (!cafe) return { code: 404, message: "Cafe not found" };
        return icafe.checkoutSession(
          { cafeId: cafe.cafeId, apiKey: cafe.apiKey },
          input.data
        );
      }),
  }),

  // === Member Management ===
  members: router({
    list: protectedProcedure
      .input(
        z.object({
          cafeDbId: z.number(),
          search: z.string().optional(),
          page: z.number().optional(),
          limit: z.number().optional(),
        })
      )
      .query(async ({ ctx, input }) => {
        const cafe = await getCafeById(input.cafeDbId, ctx.user.id);
        if (!cafe) return { code: 404, message: "Cafe not found", data: [] };
        return icafe.getMembers(
          { cafeId: cafe.cafeId, apiKey: cafe.apiKey },
          {
            search_text: input.search,
            page: input.page,
            limit: input.limit,
          }
        );
      }),

    details: protectedProcedure
      .input(z.object({ cafeDbId: z.number(), memberId: z.number() }))
      .query(async ({ ctx, input }) => {
        const cafe = await getCafeById(input.cafeDbId, ctx.user.id);
        if (!cafe) return { code: 404, message: "Cafe not found" };
        return icafe.getMemberDetails(
          { cafeId: cafe.cafeId, apiKey: cafe.apiKey },
          input.memberId
        );
      }),

    balanceHistory: protectedProcedure
      .input(z.object({ cafeDbId: z.number(), memberId: z.number() }))
      .query(async ({ ctx, input }) => {
        const cafe = await getCafeById(input.cafeDbId, ctx.user.id);
        if (!cafe) return { code: 404, message: "Cafe not found" };
        return icafe.getMemberBalanceHistory(
          { cafeId: cafe.cafeId, apiKey: cafe.apiKey },
          input.memberId
        );
      }),

    orders: protectedProcedure
      .input(z.object({ cafeDbId: z.number(), memberId: z.number() }))
      .query(async ({ ctx, input }) => {
        const cafe = await getCafeById(input.cafeDbId, ctx.user.id);
        if (!cafe) return { code: 404, message: "Cafe not found" };
        return icafe.getMemberOrders(
          { cafeId: cafe.cafeId, apiKey: cafe.apiKey },
          input.memberId
        );
      }),

    search: protectedProcedure
      .input(z.object({ cafeDbId: z.number(), searchText: z.string() }))
      .query(async ({ ctx, input }) => {
        const cafe = await getCafeById(input.cafeDbId, ctx.user.id);
        if (!cafe) return { code: 404, message: "Cafe not found", data: [] };
        return icafe.searchMembers(
          { cafeId: cafe.cafeId, apiKey: cafe.apiKey },
          input.searchText
        );
      }),

    topup: adminProcedure
      .input(
        z.object({
          cafeDbId: z.number(),
          data: z.record(z.string(), z.unknown()),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const cafe = await getCafeById(input.cafeDbId, ctx.user.id);
        if (!cafe) return { code: 404, message: "Cafe not found" };
        return icafe.topupMember(
          { cafeId: cafe.cafeId, apiKey: cafe.apiKey },
          input.data
        );
      }),
  }),

  // === Products ===
  products: router({
    list: protectedProcedure
      .input(
        z.object({
          cafeDbId: z.number(),
          sort: z.string().optional(),
          page: z.number().optional(),
          groupId: z.string().optional(),
          search: z.string().optional(),
        })
      )
      .query(async ({ ctx, input }) => {
        const cafe = await getCafeById(input.cafeDbId, ctx.user.id);
        if (!cafe) return { code: 404, message: "Cafe not found", data: [] };
        return icafe.getProducts(
          { cafeId: cafe.cafeId, apiKey: cafe.apiKey },
          {
            sort: input.sort,
            page: input.page,
            product_group_id: input.groupId,
            search_text: input.search,
          }
        );
      }),

    groups: protectedProcedure
      .input(z.object({ cafeDbId: z.number() }))
      .query(async ({ ctx, input }) => {
        const cafe = await getCafeById(input.cafeDbId, ctx.user.id);
        if (!cafe) return { code: 404, message: "Cafe not found", data: [] };
        return icafe.getProductGroups({
          cafeId: cafe.cafeId,
          apiKey: cafe.apiKey,
        });
      }),

    add: adminProcedure
      .input(
        z.object({
          cafeDbId: z.number(),
          data: z.record(z.string(), z.unknown()),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const cafe = await getCafeById(input.cafeDbId, ctx.user.id);
        if (!cafe) return { code: 404, message: "Cafe not found" };
        return icafe.addProduct(
          { cafeId: cafe.cafeId, apiKey: cafe.apiKey },
          input.data
        );
      }),

    update: adminProcedure
      .input(
        z.object({
          cafeDbId: z.number(),
          productId: z.number(),
          data: z.record(z.string(), z.unknown()),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const cafe = await getCafeById(input.cafeDbId, ctx.user.id);
        if (!cafe) return { code: 404, message: "Cafe not found" };
        return icafe.updateProduct(
          { cafeId: cafe.cafeId, apiKey: cafe.apiKey },
          input.productId,
          input.data
        );
      }),

    delete: adminProcedure
      .input(z.object({ cafeDbId: z.number(), productId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const cafe = await getCafeById(input.cafeDbId, ctx.user.id);
        if (!cafe) return { code: 404, message: "Cafe not found" };
        return icafe.deleteProduct(
          { cafeId: cafe.cafeId, apiKey: cafe.apiKey },
          input.productId
        );
      }),
  }),

  // === Reports ===
  reports: router({
    data: protectedProcedure
      .input(
        z.object({
          cafeDbId: z.number(),
          dateStart: z.string(),
          dateEnd: z.string(),
          timeStart: z.string().optional(),
          timeEnd: z.string().optional(),
          logStaffName: z.string().optional(),
        })
      )
      .query(async ({ ctx, input }) => {
        const cafe = await getCafeById(input.cafeDbId, ctx.user.id);
        if (!cafe) return { code: 404, message: "Cafe not found" };
        return icafe.getReportData(
          { cafeId: cafe.cafeId, apiKey: cafe.apiKey },
          {
            date_start: input.dateStart,
            date_end: input.dateEnd,
            time_start: input.timeStart,
            time_end: input.timeEnd,
            log_staff_name: input.logStaffName,
          }
        );
      }),

    chart: protectedProcedure
      .input(
        z.object({
          cafeDbId: z.number(),
          dateStart: z.string(),
          dateEnd: z.string(),
          chartType: z.string().optional(),
        })
      )
      .query(async ({ ctx, input }) => {
        const cafe = await getCafeById(input.cafeDbId, ctx.user.id);
        if (!cafe) return { code: 404, message: "Cafe not found" };
        return icafe.getReportChart(
          { cafeId: cafe.cafeId, apiKey: cafe.apiKey },
          {
            date_start: input.dateStart,
            date_end: input.dateEnd,
            chart_type: input.chartType,
          }
        );
      }),

    shifts: protectedProcedure
      .input(
        z.object({
          cafeDbId: z.number(),
          dateStart: z.string(),
          dateEnd: z.string(),
          timeStart: z.string().optional(),
          timeEnd: z.string().optional(),
        })
      )
      .query(async ({ ctx, input }) => {
        const cafe = await getCafeById(input.cafeDbId, ctx.user.id);
        if (!cafe) return { code: 404, message: "Cafe not found" };
        return icafe.getShiftList(
          { cafeId: cafe.cafeId, apiKey: cafe.apiKey },
          {
            date_start: input.dateStart,
            date_end: input.dateEnd,
            time_start: input.timeStart,
            time_end: input.timeEnd,
          }
        );
      }),

    shiftDetail: protectedProcedure
      .input(
        z.object({
          cafeDbId: z.number(),
          shiftId: z.string(),
        })
      )
      .query(async ({ ctx, input }) => {
        const cafe = await getCafeById(input.cafeDbId, ctx.user.id);
        if (!cafe) return { code: 404, message: "Cafe not found" };
        return icafe.getShiftDetail(
          { cafeId: cafe.cafeId, apiKey: cafe.apiKey },
          input.shiftId
        );
      }),

    customerAnalysis: protectedProcedure
      .input(
        z.object({
          cafeDbId: z.number(),
          dateStart: z.string(),
          dateEnd: z.string(),
        })
      )
      .query(async ({ ctx, input }) => {
        const cafe = await getCafeById(input.cafeDbId, ctx.user.id);
        if (!cafe) return { code: 404, message: "Cafe not found" };
        return icafe.getCustomerAnalysis(
          { cafeId: cafe.cafeId, apiKey: cafe.apiKey },
          { date_start: input.dateStart, date_end: input.dateEnd }
        );
      }),

    todayRevenue: protectedProcedure
      .query(async ({ ctx }) => {
        const allCafes = await getAllUserCafesWithKeys(ctx.user.id);
        // Use business-day logic: boundary at 06:00 AM Philippine time (UTC+8)
        const BUSINESS_DAY_START_HOUR = 6;
        const PH_OFFSET_MS = 8 * 60 * 60 * 1000; // UTC+8
        const nowUtc = new Date();
        const nowPH = new Date(nowUtc.getTime() + PH_OFFSET_MS);
        const currentHourPH = nowPH.getUTCHours();
        const businessDate = new Date(Date.UTC(
          nowPH.getUTCFullYear(),
          nowPH.getUTCMonth(),
          nowPH.getUTCDate()
        ));
        if (currentHourPH < BUSINESS_DAY_START_HOUR) {
          businessDate.setUTCDate(businessDate.getUTCDate() - 1);
        }
        const fmtUTC = (d: Date) => `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
        const dateStr = fmtUTC(businessDate);
        const nextDay = new Date(businessDate);
        nextDay.setUTCDate(nextDay.getUTCDate() + 1);
        const nextDayStr = fmtUTC(nextDay);
        

        // Helper: extract report stats from reportData response
        //const extractStats = (reportData: any) => {
        const extractStats = (reportData: any, staffName: string) => {
          const totalCash = Number(reportData?.report?.cash || 0);
          const profit = Number(reportData?.report?.profit || 0);
          const salesTotal = Number(reportData?.sale?.total || 0);
          const topups = Number(reportData?.topup?.amount || 0);
          const salesCount = Number(reportData?.sale?.product?.number || 0);
          const topupCount = Number(reportData?.topup?.number || 0);
          /*const refundTopup = reportData?.refund?.topup || {};
          let refundTotal = 0;
          let refundCount = 0;
          for (const key of Object.keys(refundTopup)) {
            const val = refundTopup[key];
            if (val && typeof val === 'object' && 'amount' in val) {
              refundTotal += Number(val.amount || 0);
              refundCount += Number(val.number || 0);
            }
          }*/
           /* const refundTopupTotal = reportData?.refund?.topup?.total;

            let refundTotal = Number(refundTopupTotal?.amount || 0);
            let refundCount = Number(refundTopupTotal?.number || 0);
            
          
          
            const refundProduct = reportData?.refund?.product;
          
          if (refundProduct && typeof refundProduct === 'object') {
            refundTotal += Number(refundProduct.amount || refundProduct.total || 0);
            refundCount += Number(refundProduct.number || refundProduct.count || 0);
          }*/
            const refundItems: any[] = [];

            const refundTopup = reportData?.refund?.topup || {};
            const refundTopupTotal = refundTopup?.total;
            
            let refundTotal = Number(refundTopupTotal?.amount || 0);
            let refundCount = Number(refundTopupTotal?.number || 0);
            
            if (refundTopupTotal?.amount) {
              refundItems.push({
                amount: Number(refundTopupTotal.amount),
                details: "Top-up Refund",
                staff: staffName,
              });
            }
            
            const refundProduct = reportData?.refund?.product;
            
            if (refundProduct && typeof refundProduct === "object") {
              const productAmount = Number(refundProduct.amount || refundProduct.total || 0);
              const productCount = Number(refundProduct.number || refundProduct.count || 0);
            
              refundTotal += productAmount;
              refundCount += productCount;
            
              if (productAmount > 0) {
                refundItems.push({
                  amount: productAmount,
                  details: "Product Refund",
                  staff: staffName,
                });
              }
            }
            

          //Product items
          const productList =
            reportData?.sale?.product?.product_list ||
            reportData?.sale?.product ||
            {};

          const products = Object.values(productList).map((p: any) => ({
            name: p.product_name || p.name || "Unknown",
            qty: Number(p.number || p.qty || 0),
            total: Number(p.total || p.amount || 0),
            staff: staffName,
          }));

          console.log("PRODUCT DEBUG:", reportData?.sale?.product);
          const expense = Math.max(0, totalCash - salesTotal - topups + refundTotal);
          
          // Expense = Cash - Product Cost - Tax - Profit (derived from iCafeCloud formula)
          //const productCost = Number(reportData?.sale?.product?.cost || 0);
          //const tax = Number(reportData?.sale?.product?.tax || 0);          
          //const expense = Math.max(0, totalCash - productCost - tax - profit);
          // Expense comes from shift data, not report
          return {
            totalCash,
            profit,
            salesTotal,
            topups,
            salesCount,
            topupCount,
            refundTotal,
            refundCount,
            expense,
            expenseItems: [],
            refundItems,
            products,
          };
        };

        const results = await Promise.all(
          allCafes.map(async (cafe) => {
            try {
              // Refund logs are now fetched separately via todayRefundLogs endpoint
              // This prevents blocking the main todayRevenue query
              const refundLogs: any[] = [];

              

              // Step 1: Fetch shifts for the business day
              const shiftsData = await icafe.getShiftList(
                { cafeId: cafe.cafeId, apiKey: cafe.apiKey },
                { date_start: dateStr, date_end: nextDayStr, time_start: '00:00', time_end: '05:59' }
                //CHAD{ date_start: dateStr, date_end: nextDayStr, time_start: '06:00', time_end: '05:59' }
              );
              const shiftList = Array.isArray((shiftsData as any)?.data)
                ? (shiftsData as any).data
                : (shiftsData as any)?.data?.shift_list || (shiftsData as any)?.data?.shifts || [];

              // Filter shifts that belong to this business day
              // Include shifts where start OR end time falls within the business day window
              const businessDayShifts = shiftList.filter((s: any) => {
                const startTime = s.shift_start_time || '';
                const endTime = s.shift_end_time || '';
                
                // Check start time
                let startInRange = false;
                if (startTime && startTime !== '-') {
                  const [datePart, timePart] = startTime.split(' ');
                  const hour = parseInt((timePart || '').split(':')[0] || '0', 10);
                  // Shift starts within business day if:
                  // - starts on dateStr at or after 06:00, OR
                  // - starts on nextDayStr before 06:00 (graveyard)
                  if (datePart === dateStr && hour >= BUSINESS_DAY_START_HOUR) startInRange = true;
                  if (datePart === nextDayStr && hour < BUSINESS_DAY_START_HOUR) startInRange = true;
                }
                
                // Check end time
                let endInRange = false;
                if (endTime && endTime !== '-') {
                  const [datePart, timePart] = endTime.split(' ');
                  const hour = parseInt((timePart || '').split(':')[0] || '0', 10);
                  // Shift ends within business day if:
                  // - ends on dateStr at or after 06:00, OR
                  // - ends on nextDayStr before 06:00
                  if (datePart === dateStr && hour >= BUSINESS_DAY_START_HOUR) endInRange = true;
                  if (datePart === nextDayStr && hour < BUSINESS_DAY_START_HOUR) endInRange = true;
                }
                
                // Include shift if start OR end falls within the business day
                return startInRange || endInRange;
              });

              // Sum expenses from shifts
              const shiftExpenseResults = await Promise.all(
                businessDayShifts.map(async (shift: any) => {
                  try {
                    const detail = await icafe.getShiftDetail(
                      { cafeId: cafe.cafeId, apiKey: cafe.apiKey },
                      shift.shift_id
                    );
              
                    const data = (detail as any)?.data || {};                    
                    

                    // EXPENSES
                    const expenseTotal = Math.abs(
                      Number(data.center_expenses || 0)
                    );
              
                    const items = (data.center_expenses_items || []).map((item: any) => ({
                      amount: Math.abs(Number(item.log_money || 0)),
                      details: item.log_details || "",
                      shiftId: shift.shift_id,
                      staff: shift.shift_staff_name || "Unknown",
                    }));

                    /* -------------------------
                      PRODUCTS (NEW)
                    ------------------------- */
                    const products = Array.isArray(data.shop_sales)
                      ? data.shop_sales.map((p: any) => ({
                          name: p.product_name || "Unknown",
                          qty: Number(p.sold || 0),
                          total: Number(p.cash || 0),
                          staff: shift.shift_staff_name || "Unknown",
                        }))
                      : [];
                      
                

              
                    return {
                      expenseTotal,
                      items,
                      products,
                    };
              
                  } catch {
                    return {
                      expenseTotal: 0,
                      items: [],
                      products: [],
                    };
                  }
                })
              );
              
              const totalShiftExpense = shiftExpenseResults.reduce(
                (sum, r) => sum + r.expenseTotal,
                0
              );
              
              const expenseItems = shiftExpenseResults.flatMap(r => r.items);
              const products = shiftExpenseResults.flatMap(
                r => r.products || []
              );
              
              
              

              if (businessDayShifts.length === 0) {
                // No shifts today — return zeros
                return {
                  cafeDbId: cafe.id, cafeName: cafe.name, cafeId: cafe.cafeId,
                  totalCash: 0, profit: 0, salesTotal: 0, topups: 0,
                  salesCount: 0, topupCount: 0, refundTotal: 0, refundCount: 0, expense: 0,expenseItems: [], products: [],
                  topupsByStaff: [],
                  shifts: [],
                  success: true, error: undefined,
                };
              }

              // Step 2: For each shift, query reportData with the shift's actual time range + staff name
              const shiftResults = await Promise.all(
                businessDayShifts.map(async (shift: any) => {
                  const startTime = shift.shift_start_time || '';
                  const endTime = shift.shift_end_time || '';
                  const staffName = shift.shift_staff_name || '';
                  const startParts = startTime.split(' ');
                  const startDate = startParts[0] || dateStr;
                  const startTimePart = startParts[1] ? startParts[1].substring(0, 5) : '06:00';
                  let endDate = startDate;
                  let endTimePart = '23:59';
                  if (endTime && endTime !== '-') {
                    const endParts = endTime.split(' ');
                    endDate = endParts[0] || startDate;
                    endTimePart = endParts[1] ? endParts[1].substring(0, 5) : '23:59';
                  }
                  try {
                    const data = await icafe.getReportData(
                      { cafeId: cafe.cafeId, apiKey: cafe.apiKey },
                      { date_start: startDate, date_end: endDate, time_start: startTimePart, time_end: endTimePart, log_staff_name: staffName }
                    );
                   // return extractStats((data as any)?.data);
                  // return extractStats((data as any)?.data, staffName);
                   const stats = extractStats((data as any)?.data, staffName);
                   return {
                     ...stats,
                     staffName,
                     startTime,
                     endTime,
                   };
                  } catch {
                    return { totalCash: 0, profit: 0, salesTotal: 0, topups: 0, salesCount: 0, topupCount: 0, refundTotal: 0, refundCount: 0, expense: 0, expenseItems: [], products: [], staffName, startTime, endTime};
                  }
                })
              );            


              // Step 3: Sum all shift results
              /*const combined = { totalCash: 0, profit: 0, salesTotal: 0, topups: 0, salesCount: 0, topupCount: 0, refundTotal: 0, refundCount: 0, expense: 0 };
              for (const sr of shiftResults) {
                combined.totalCash += sr.totalCash;
                combined.profit += sr.profit;
                combined.salesTotal += sr.salesTotal;
                combined.topups += sr.topups;
                combined.salesCount += sr.salesCount;
                combined.topupCount += sr.topupCount;
                combined.refundTotal += sr.refundTotal;
                combined.refundCount += sr.refundCount;
                combined.expense += sr.expense;
              }*/
                const combined = {
                  totalCash: 0,
                  profit: 0,
                  salesTotal: 0,
                  topups: 0,
                  salesCount: 0,
                  topupCount: 0,
                  refundTotal: 0,
                  refundCount: 0,
                  expense: totalShiftExpense,
                  expenseItems,  
                  refundItems: [], 
                  products,               
                };
                
                // Aggregate top-ups by staff
              const topupsByStaffMap: Record<string, { name: string; total: number; count: number }> = {};

                for (const sr of shiftResults) {
                  combined.totalCash += sr.totalCash;
                  combined.profit += sr.profit;
                  combined.salesTotal += sr.salesTotal;
                  combined.topups += sr.topups;
                  combined.salesCount += sr.salesCount;
                  combined.topupCount += sr.topupCount;
                  combined.refundTotal += sr.refundTotal;
                  combined.refundCount += sr.refundCount; 
                  combined.refundItems.push(...(sr.refundItems || []));

                  // Aggregate top-ups by staff
                if (sr.topups > 0 || sr.topupCount > 0) {
                  if (!topupsByStaffMap[sr.staffName]) {
                    topupsByStaffMap[sr.staffName] = { name: sr.staffName, total: 0, count: 0 };
                  }
                  topupsByStaffMap[sr.staffName].total += sr.topups;
                  topupsByStaffMap[sr.staffName].count += sr.topupCount;
                }

                }

                const shiftOrder = shiftResults.map(s => s.staffName);

                console.log(`[${cafe.name}] Refund Items before enrichment:`, combined.refundItems.length);
                combined.refundItems.forEach((item, idx) => {
                  console.log(`  [${idx}] Staff: ${item.staff}, Amount: ${item.amount}, Details: "${item.details}"`);
                });

                // Replace aggregated refundItems with individual items from refundLogs
                // This ensures each refund transaction is displayed separately in the UI
                if (refundLogs.length > 0) {
                  combined.refundItems = refundLogs.map((log: any) => {
                    // Format details to include member and reason
                    const memberInfo = log.member ? `Member: ${log.member} - ` : '';
                    const detailsWithMember = `${memberInfo}${log.reason}`;
                    
                    return {
                      amount: Math.abs(log.amount), // Convert negative amount to positive for display
                      details: detailsWithMember,
                      staff: log.staff,
                      member: log.member,
                      reason: log.reason,
                      time: log.time,
                    };
                  });
                } else {
                  // Clear refund items when no refund logs exist
                  combined.refundItems = [];
                }

                console.log(`[${cafe.name}] Refund Items after enrichment: ${combined.refundItems.length}`);
                combined.refundItems.forEach((item, idx) => {
                  console.log(`  [${idx}] ${item.staff}: "${item.details}"`);
                });

                const fullDayReport = await icafe.getReportData(
                  { cafeId: cafe.cafeId, apiKey: cafe.apiKey },
                  {
                    date_start: dateStr,
                    date_end: nextDayStr,
                    time_start: "06:00",
                    time_end: "05:59",
                  }
                );
                
                const topMembers =
                  (fullDayReport as any)?.data?.top_five_members_topup || [];

                  const topPCs =
                (fullDayReport as any)?.data?.top_five_pc_spend || [];

                // Extract game data and convert to format expected by frontend
                const gameData = (fullDayReport as any)?.data?.game || [];
                const topGames = gameData
                  .map((game: any) => {
                    const totalMinutes = Number(game.local_times || 0) + Number(game.pool_times || 0);
                    return {
                      game_name: game.name,
                      hours_played: totalMinutes / 60, // Convert minutes to hours
                      total_times: totalMinutes
                    };
                  })
                  .sort((a: any, b: any) => b.total_times - a.total_times)
                  .slice(0, 10); // Top 10 games

              return {
                cafeDbId: cafe.id, cafeName: cafe.name, cafeId: cafe.cafeId,
                ...combined,
                refundLogs,
                topMembers,
                topPCs,
                topGames,
                topupsByStaff: Object.values(topupsByStaffMap)
                .sort(
                  (a, b) =>
                    shiftOrder.indexOf(a.name) -
                    shiftOrder.indexOf(b.name)
                ),
                shifts: shiftResults.map((sr: any) => {
                  // --- Average top-up ---
                    const avgTopup =
                    sr.topupCount > 0
                      ? sr.topups / sr.topupCount
                      : 0;

                  // --- Shift duration in hours ---
                  let hours = 0;

                  if (sr.endTime && sr.endTime !== "-") {
                    // closed shift
                    const start = new Date(sr.startTime);
                    const end = new Date(sr.endTime);
                    hours = (end.getTime() - start.getTime()) / 3600000;
                  } else {
                    // active shift
                    const start = new Date(sr.startTime);
                    const now = new Date();
                    hours = (now.getTime() - start.getTime()) / 3600000;
                  }

                  // --- Sales per hour ---
                  const salesPerHour =
                    hours > 0 ? sr.salesTotal / hours : 0;

                  // --- Occupancy approximation ---
                  // Using PC revenue if available
                  const occupancy =
                    sr.totalCash > 0
                      ? Math.round((sr.salesTotal / sr.totalCash) * 100)
                      : 0;

                  // --- Revenue per hour ---  
                  const revenuePerHour2 =
                    hours > 0
                      ? (sr.salesTotal + sr.topups) / hours
                      : 0;
                  
                  // --- Projected Revenue ---    
                  const revenueSoFar = sr.salesTotal + sr.topups;

                  const revenuePerHour =
                        hours > 0 ? revenueSoFar / hours : 0;
                      
                  // assume 8-hour shift
                  const SHIFT_LENGTH = 8;
                      
                  const projectedRevenue = revenuePerHour * SHIFT_LENGTH;
                      

                
                  return {
                    staffName: sr.staffName,
                    startTime: sr.startTime,
                    endTime: sr.endTime,
                    totalCash: sr.totalCash,
                    profit: sr.profit,
                    salesTotal: sr.salesTotal,
                    topups: sr.topups,
                    expense: sr.expense,
                    // KPIs
                    avgTopup,
                    salesPerHour,
                    revenuePerHour,
                    occupancy,
                    projectedRevenue,
                  };
                }),                
                success: true, error: undefined,
              };
            } catch (err: unknown) {
              return {
                cafeDbId: cafe.id, cafeName: cafe.name, cafeId: cafe.cafeId,
                totalCash: 0, profit: 0, salesTotal: 0, topups: 0,
                salesCount: 0, topupCount: 0, refundTotal: 0, refundCount: 0, expense: 0, expenseItems: [], products: [],
                topupsByStaff: [],
                shifts: [],
                success: false, error: err instanceof Error ? err.message : 'Unknown error',
              };
            }
          })
        );
        return { date: dateStr, cafes: results };
      }),

      yesterdayRevenue: protectedProcedure
      .query(async ({ ctx }) => {
        const allCafes = await getAllUserCafesWithKeys(ctx.user.id);
        // Use business-day logic: boundary at 06:00 AM Philippine time (UTC+8)
        const BUSINESS_DAY_START_HOUR = 6;
        const PH_OFFSET_MS = 8 * 60 * 60 * 1000; // UTC+8
        const nowUtc = new Date();
        const nowPH = new Date(nowUtc.getTime() + PH_OFFSET_MS);
        const currentHourPH = nowPH.getUTCHours();
        const businessDate = new Date(Date.UTC(
          nowPH.getUTCFullYear(),
          nowPH.getUTCMonth(),
          nowPH.getUTCDate()
        ));
        if (currentHourPH < BUSINESS_DAY_START_HOUR) {
          businessDate.setUTCDate(businessDate.getUTCDate() - 1);
        }
        // ✅ SHIFT ONE MORE DAY BACK
        businessDate.setUTCDate(businessDate.getUTCDate() - 1);
        
        const fmtUTC = (d: Date) => `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
        const dateStr = fmtUTC(businessDate);
        const nextDay = new Date(businessDate);
        nextDay.setUTCDate(nextDay.getUTCDate() + 1);
        const nextDayStr = fmtUTC(nextDay);

        // Helper: extract report stats from reportData response
        const extractStats = (reportData: any) => {
          const totalCash = Number(reportData?.report?.cash || 0);
          const profit = Number(reportData?.report?.profit || 0);
          const salesTotal = Number(reportData?.sale?.total || 0);
          const topups = Number(reportData?.topup?.amount || 0);
          const salesCount = Number(reportData?.sale?.product?.number || 0);
          const topupCount = Number(reportData?.topup?.number || 0);
          const refundTopup = reportData?.refund?.topup || {};
          let refundTotal = 0;
          let refundCount = 0;
          for (const key of Object.keys(refundTopup)) {
            const val = refundTopup[key];
            if (val && typeof val === 'object' && 'amount' in val) {
              refundTotal += Number(val.amount || 0);
              refundCount += Number(val.number || 0);
            }
          }
          const refundProduct = reportData?.refund?.product;
          if (refundProduct && typeof refundProduct === 'object') {
            refundTotal += Number(refundProduct.amount || refundProduct.total || 0);
            refundCount += Number(refundProduct.number || refundProduct.count || 0);
          }
          const topMembers =
          reportData?.top_five_members_topup || [];

          // Expense = Cash - Product Cost - Tax - Profit (derived from iCafeCloud formula)
          //const productCost = Number(reportData?.sale?.product?.cost || 0);
          //const tax = Number(reportData?.sale?.product?.tax || 0);          
          //const expense = Math.max(0, totalCash - productCost - tax - profit);
          // Expense comes from shift data, not report
          return {
            totalCash,
            profit,
            salesTotal,
            topups,
            salesCount,
            topupCount,
            refundTotal,
            refundCount,
            expense: 0,
            expenseItems: [],
            topMembers,
          };
        };

        const results = await Promise.all(
          allCafes.map(async (cafe) => {
            try {
              // Step 1: Fetch shifts for the business day
              const shiftsData = await icafe.getShiftList(
                { cafeId: cafe.cafeId, apiKey: cafe.apiKey },
                { date_start: dateStr, date_end: nextDayStr, time_start: '00:00', time_end: '05:59' }
                //CHAD{ date_start: dateStr, date_end: nextDayStr, time_start: '06:00', time_end: '05:59' }
              );
              const shiftList = Array.isArray((shiftsData as any)?.data)
                ? (shiftsData as any).data
                : (shiftsData as any)?.data?.shift_list || (shiftsData as any)?.data?.shifts || [];

              // Filter shifts that belong to this business day
              // Include shifts where start OR end time falls within the business day window
              const businessDayShifts = shiftList.filter((s: any) => {
                const startTime = s.shift_start_time || '';
                const endTime = s.shift_end_time || '';
                
                // Check start time
                let startInRange = false;
                if (startTime && startTime !== '-') {
                  const [datePart, timePart] = startTime.split(' ');
                  const hour = parseInt((timePart || '').split(':')[0] || '0', 10);
                  // Shift starts within business day if:
                  // - starts on dateStr at or after 06:00, OR
                  // - starts on nextDayStr before 06:00 (graveyard)
                  if (datePart === dateStr && hour >= BUSINESS_DAY_START_HOUR) startInRange = true;
                  if (datePart === nextDayStr && hour < BUSINESS_DAY_START_HOUR) startInRange = true;
                }
                
                // Check end time
                let endInRange = false;
                if (endTime && endTime !== '-') {
                  const [datePart, timePart] = endTime.split(' ');
                  const hour = parseInt((timePart || '').split(':')[0] || '0', 10);
                  // Shift ends within business day if:
                  // - ends on dateStr at or after 06:00, OR
                  // - ends on nextDayStr before 06:00
                  if (datePart === dateStr && hour >= BUSINESS_DAY_START_HOUR) endInRange = true;
                  if (datePart === nextDayStr && hour < BUSINESS_DAY_START_HOUR) endInRange = true;
                }
                
                // Include shift if start OR end falls within the business day
                return startInRange || endInRange;
              });

              // Sum expenses from shifts
              const shiftExpenseResults = await Promise.all(
                businessDayShifts.map(async (shift: any) => {
                  try {
                    const detail = await icafe.getShiftDetail(
                      { cafeId: cafe.cafeId, apiKey: cafe.apiKey },
                      shift.shift_id
                    );
              
                    const data = (detail as any)?.data || {};
              
                    const expenseTotal = Math.abs(
                      Number(data.center_expenses || 0)
                    );
              
                    const items = (data.center_expenses_items || []).map((item: any) => ({
                      amount: Math.abs(Number(item.log_money || 0)),
                      details: item.log_details || "",
                      shiftId: shift.shift_id,
                      staff: shift.shift_staff_name || "Unknown",
                    }));
              
                    return { expenseTotal, items };
                  } catch {
                    return { expenseTotal: 0, items: [] };
                  }
                })
              );
              
              const totalShiftExpense = shiftExpenseResults.reduce(
                (sum, r) => sum + r.expenseTotal,
                0
              );
              
              const expenseItems = shiftExpenseResults.flatMap(r => r.items);
              
              
              
              

              if (businessDayShifts.length === 0) {
                // No shifts today — return zeros
                return {
                  cafeDbId: cafe.id, cafeName: cafe.name, cafeId: cafe.cafeId,
                  totalCash: 0, profit: 0, salesTotal: 0, topups: 0,
                  salesCount: 0, topupCount: 0, refundTotal: 0, refundCount: 0, expense: 0,expenseItems: [],
                  success: true, error: undefined,
                };
              }

              // Step 2: For each shift, query reportData with the shift's actual time range + staff name
              const shiftResults = await Promise.all(
                businessDayShifts.map(async (shift: any) => {
                  const startTime = shift.shift_start_time || '';
                  const endTime = shift.shift_end_time || '';
                  const staffName = shift.shift_staff_name || '';
                  const startParts = startTime.split(' ');
                  const startDate = startParts[0] || dateStr;
                  const startTimePart = startParts[1] ? startParts[1].substring(0, 5) : '06:00';
                  let endDate = startDate;
                  let endTimePart = '23:59';
                  if (endTime && endTime !== '-') {
                    const endParts = endTime.split(' ');
                    endDate = endParts[0] || startDate;
                    endTimePart = endParts[1] ? endParts[1].substring(0, 5) : '23:59';
                  }
                  try {
                    const data = await icafe.getReportData(
                      { cafeId: cafe.cafeId, apiKey: cafe.apiKey },
                      { date_start: startDate, date_end: endDate, time_start: startTimePart, time_end: endTimePart, log_staff_name: staffName }
                    );
                    return extractStats((data as any)?.data);
                  } catch {
                    return { totalCash: 0, profit: 0, salesTotal: 0, topups: 0, salesCount: 0, topupCount: 0, refundTotal: 0, refundCount: 0, expense: 0, expenseItems: [], };
                  }
                })
              );

              shiftResults.sort((a: any, b: any) => {
                const aActive = !a.endTime || a.endTime === "-";
                const bActive = !b.endTime || b.endTime === "-";
              
                if (aActive && !bActive) return -1;
                if (!aActive && bActive) return 1;
              
                // fallback: latest shift first
                return new Date(b.startTime).getTime() -
                       new Date(a.startTime).getTime();
              });
              

              // Step 3: Sum all shift results
              /*const combined = { totalCash: 0, profit: 0, salesTotal: 0, topups: 0, salesCount: 0, topupCount: 0, refundTotal: 0, refundCount: 0, expense: 0 };
              for (const sr of shiftResults) {
                combined.totalCash += sr.totalCash;
                combined.profit += sr.profit;
                combined.salesTotal += sr.salesTotal;
                combined.topups += sr.topups;
                combined.salesCount += sr.salesCount;
                combined.topupCount += sr.topupCount;
                combined.refundTotal += sr.refundTotal;
                combined.refundCount += sr.refundCount;
                combined.expense += sr.expense;
              }*/
                const combined = {
                  totalCash: 0,
                  profit: 0,
                  salesTotal: 0,
                  topups: 0,
                  salesCount: 0,
                  topupCount: 0,
                  refundTotal: 0,
                  refundCount: 0,
                  expense: totalShiftExpense,
                  expenseItems,
                };
                
                for (const sr of shiftResults) {
                  combined.totalCash += sr.totalCash;
                  combined.profit += sr.profit;
                  combined.salesTotal += sr.salesTotal;
                  combined.topups += sr.topups;
                  combined.salesCount += sr.salesCount;
                  combined.topupCount += sr.topupCount;
                  combined.refundTotal += sr.refundTotal;
                  combined.refundCount += sr.refundCount;
                }

              return {
                cafeDbId: cafe.id, cafeName: cafe.name, cafeId: cafe.cafeId,
                ...combined,
                success: true, error: undefined,
              };
            } catch (err: unknown) {
              return {
                cafeDbId: cafe.id, cafeName: cafe.name, cafeId: cafe.cafeId,
                totalCash: 0, profit: 0, salesTotal: 0, topups: 0,
                salesCount: 0, topupCount: 0, refundTotal: 0, refundCount: 0, expense: 0, expenseItems: [],
                success: false, error: err instanceof Error ? err.message : 'Unknown error',
              };
            }
          })
        );
        return { date: dateStr, cafes: results };
      }),

      // Separate endpoint for fetching refund logs - runs independently to avoid blocking todayRevenue
      // Returns refund logs for all user cafes for the current business day
      // Business day is defined as 6:00 AM to 5:59 AM the next day (Philippine time, UTC+8)
      todayRefundLogs: protectedProcedure
      .query(async ({ ctx }) => {
        const allCafes = await getAllUserCafesWithKeys(ctx.user.id);
        const BUSINESS_DAY_START_HOUR = 6;
        const PH_OFFSET_MS = 8 * 60 * 60 * 1000;
        const nowUtc = new Date();
        const nowPH = new Date(nowUtc.getTime() + PH_OFFSET_MS);
        const currentHourPH = nowPH.getUTCHours();
        const businessDate = new Date(Date.UTC(
          nowPH.getUTCFullYear(),
          nowPH.getUTCMonth(),
          nowPH.getUTCDate()
        ));
        if (currentHourPH < BUSINESS_DAY_START_HOUR) {
          businessDate.setUTCDate(businessDate.getUTCDate() - 1);
        }
        const fmtUTC = (d: Date) => `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
        const dateStr = fmtUTC(businessDate);
        const nextDay = new Date(businessDate);
        nextDay.setUTCDate(nextDay.getUTCDate() + 1);
        const nextDayStr = fmtUTC(nextDay);

        const businessStart = `${dateStr} 00:00:00`;
        const businessEnd = `${nextDayStr} 05:59:59`;

        const results = await Promise.all(
          allCafes.map(async (cafe) => {
            try {
              let refundLogs: any[] = [];
              let page = 1;
              let allLogs: any[] = [];

              while (true) {
                const billing = await icafe.getBillingLogs(
                  { cafeId: cafe.cafeId, apiKey: cafe.apiKey },
                  {
                    date_start: businessStart,
                    date_end: businessEnd,
                    page,
                    limit: 100,
                    event: 'TOPUP',
                  }
                );

                const logs = billing?.data?.log_list || [];
                const pagingInfo = billing?.data?.paging_info;

                if (logs.length === 0) break;

                allLogs.push(...logs);

                if (pagingInfo && page >= Number(pagingInfo.pages)) {
                  break;
                }

                if (!pagingInfo && logs.length < 100) break;

                page++;
              }

              refundLogs = allLogs
                .filter((log: any) => {
                  const details = (log.log_details || "").toLowerCase();
                  const money = Number(log.log_money || 0);
                  return details.includes("comment:") && money < 0;
                })
                .map((log: any) => ({
                  member: log.log_member_account,
                  amount: Number(log.log_money || 0),
                  reason: log.log_details || "",
                  staff: log.log_staff_name,
                  time: log.log_date_local,
                  event: log.log_event,
                }));

              return {
                cafeDbId: cafe.id,
                cafeName: cafe.name,
                cafeId: cafe.cafeId,
                refundLogs,
                success: true,
              };
            } catch (err) {
              console.error(`[${cafe.name}] Refund log fetch failed:`, err);
              return {
                cafeDbId: cafe.id,
                cafeName: cafe.name,
                cafeId: cafe.cafeId,
                refundLogs: [],
                success: false,
                error: err instanceof Error ? err.message : 'Unknown error',
              };
            }
          })
        );

        return { date: dateStr, cafes: results };
      }),

      // Shift-aggregated report: fetches each shift individually and sums results
    // This avoids the bug where querying a raw date range includes non-shift transactions
    shiftAggregated: protectedProcedure
    .input(
      z.object({
        cafeDbId: z.number(),
        dateStart: z.string(),
        dateEnd: z.string(),
        timeStart: z.string().optional(),
        timeEnd: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const cafe = await getCafeById(input.cafeDbId, ctx.user.id);
      if (!cafe) return { code: 404, message: "Cafe not found", data: null };

      try {
        // Step 1: Fetch all shifts in the date range
        const shiftsData = await icafe.getShiftList(
          { cafeId: cafe.cafeId, apiKey: cafe.apiKey },
          { date_start: input.dateStart, date_end: input.dateEnd, time_start: input.timeStart, time_end: input.timeEnd }
        );
        const shiftList = Array.isArray((shiftsData as any)?.data)
          ? (shiftsData as any).data
          : (shiftsData as any)?.data?.shift_list || (shiftsData as any)?.data?.shifts || [];

        if (shiftList.length === 0) {
          // No shifts — return empty data in the expected structure
          return {
            code: 200,
            message: "OK",
            data: {
              report: { cash: 0, profit: 0, report_start: input.dateStart, report_end: input.dateEnd },
              sale: { total: 0, product: { number: 0, total: 0 }, cash: { number: 0, total: 0 }, by_balance: { number: 0, total: 0 }, credit_card: { number: 0, total: 0 }, offer_member: { number: 0, total: 0 }, coin: { number: 0, total: 0 } },
              topup: { amount: 0, number: 0, member: { amount: 0, number: 0 }, cash: { amount: 0, number: 0 }, credit_card: { amount: 0, number: 0 }, qr: { amount: 0, number: 0 } },
              refund: { topup: { total: { amount: 0, number: 0 }, member: { amount: 0, number: 0 }, cash: { amount: 0, number: 0 }, credit_card: { amount: 0, number: 0 }, prepaid: { amount: 0, number: 0 }, bonus: { amount: 0, number: 0 } }, sale: { total: { amount: 0, number: 0 } } },
              product_sales_items: [],
              top_five_members_topup: [],
              top_five_pc_spend: [],
            },
          };
        }

        // Step 2: Query reportData for each shift individually
        const shiftResults = await Promise.all(
          shiftList.map(async (shift: any) => {
            const startTime = shift.shift_start_time || '';
            const endTime = shift.shift_end_time || '';
            const staffName = shift.shift_staff_name || '';

            const startParts = startTime.split(' ');
            const startDate = startParts[0] || input.dateStart;
            const startTimePart = startParts[1] ? startParts[1].substring(0, 5) : '00:00';

            let endDate = startDate;
            let endTimePart = '23:59';
            if (endTime && endTime !== '-') {
              const endParts = endTime.split(' ');
              endDate = endParts[0] || startDate;
              endTimePart = endParts[1] ? endParts[1].substring(0, 5) : '23:59';
            }

            try {
              const data = await icafe.getReportData(
                { cafeId: cafe.cafeId, apiKey: cafe.apiKey },
                { date_start: startDate, date_end: endDate, time_start: startTimePart, time_end: endTimePart, log_staff_name: staffName }
              );
              return (data as any)?.data || null;
            } catch {
              return null;
            }
          })
        );

        // Step 3: Sum all shift results into a single aggregated structure
        const sumNum = (vals: (number | undefined | null)[]) => vals.reduce((a, v) => (a || 0) + (Number(v) || 0), 0);

        const aggregated = {
          report: {
            cash: sumNum(shiftResults.map(r => r?.report?.cash)),
            profit: sumNum(shiftResults.map(r => r?.report?.profit)),
            report_start: input.dateStart,
            report_end: input.dateEnd,
          },
          sale: {
            total: sumNum(shiftResults.map(r => r?.sale?.total)),
            product: {
              number: sumNum(shiftResults.map(r => r?.sale?.product?.number)),
              total: sumNum(shiftResults.map(r => r?.sale?.product?.total)),
            },
            cash: {
              number: sumNum(shiftResults.map(r => r?.sale?.cash?.number)),
              total: sumNum(shiftResults.map(r => r?.sale?.cash?.total)),
            },
            by_balance: {
              number: sumNum(shiftResults.map(r => r?.sale?.by_balance?.number)),
              total: sumNum(shiftResults.map(r => r?.sale?.by_balance?.total)),
            },
            credit_card: {
              number: sumNum(shiftResults.map(r => r?.sale?.credit_card?.number)),
              total: sumNum(shiftResults.map(r => r?.sale?.credit_card?.total)),
            },
            offer_member: {
              number: sumNum(shiftResults.map(r => r?.sale?.offer_member?.number)),
              total: sumNum(shiftResults.map(r => r?.sale?.offer_member?.total)),
            },
            coin: {
              number: sumNum(shiftResults.map(r => r?.sale?.coin?.number)),
              total: sumNum(shiftResults.map(r => r?.sale?.coin?.total)),
            },
          },
          topup: {
            amount: sumNum(shiftResults.map(r => r?.topup?.amount)),
            number: sumNum(shiftResults.map(r => r?.topup?.number)),
            member: {
              amount: sumNum(shiftResults.map(r => r?.topup?.member?.amount)),
              number: sumNum(shiftResults.map(r => r?.topup?.member?.number)),
            },
            cash: {
              amount: sumNum(shiftResults.map(r => r?.topup?.cash?.amount)),
              number: sumNum(shiftResults.map(r => r?.topup?.cash?.number)),
            },
            credit_card: {
              amount: sumNum(shiftResults.map(r => r?.topup?.credit_card?.amount)),
              number: sumNum(shiftResults.map(r => r?.topup?.credit_card?.number)),
            },
            qr: {
              amount: sumNum(shiftResults.map(r => r?.topup?.qr?.amount)),
              number: sumNum(shiftResults.map(r => r?.topup?.qr?.number)),
            },
          },
          refund: {
            topup: {
              total: {
                amount: sumNum(shiftResults.map(r => r?.refund?.topup?.total?.amount)),
                number: sumNum(shiftResults.map(r => r?.refund?.topup?.total?.number)),
              },
              member: {
                amount: sumNum(shiftResults.map(r => r?.refund?.topup?.member?.amount)),
                number: sumNum(shiftResults.map(r => r?.refund?.topup?.member?.number)),
              },
              cash: {
                amount: sumNum(shiftResults.map(r => r?.refund?.topup?.cash?.amount)),
                number: sumNum(shiftResults.map(r => r?.refund?.topup?.cash?.number)),
              },
              credit_card: {
                amount: sumNum(shiftResults.map(r => r?.refund?.topup?.credit_card?.amount)),
                number: sumNum(shiftResults.map(r => r?.refund?.topup?.credit_card?.number)),
              },
              prepaid: {
                amount: sumNum(shiftResults.map(r => r?.refund?.topup?.prepaid?.amount)),
                number: sumNum(shiftResults.map(r => r?.refund?.topup?.prepaid?.number)),
              },
              bonus: {
                amount: sumNum(shiftResults.map(r => r?.refund?.topup?.bonus?.amount)),
                number: sumNum(shiftResults.map(r => r?.refund?.topup?.bonus?.number)),
              },
            },
            sale: {
              total: {
                amount: sumNum(shiftResults.map(r => r?.refund?.sale?.total?.amount)),
                number: sumNum(shiftResults.map(r => r?.refund?.sale?.total?.number)),
              },
            },
          },
          // Merge product_sales_items across shifts (combine by product name)
          product_sales_items: (() => {
            const itemMap = new Map<string, any>();
            for (const r of shiftResults) {
              if (!r?.product_sales_items) continue;
              for (const item of r.product_sales_items) {
                const key = item.product_name || item.name || 'unknown';
                if (itemMap.has(key)) {
                  const existing = itemMap.get(key);
                  existing.order_number = (existing.order_number || 0) + (item.order_number || 0);
                  existing.order_total = (existing.order_total || 0) + (item.order_total || 0);
                  existing.order_refunded = (existing.order_refunded || 0) + (item.order_refunded || 0);
                } else {
                  itemMap.set(key, { ...item });
                }
              }
            }
            return Array.from(itemMap.values());
          })(),
          // Merge top members (combine by member name, take top 5)
          top_five_members_topup: (() => {
            const memberMap = new Map<string, any>();
            for (const r of shiftResults) {
              if (!r?.top_five_members_topup) continue;
              for (const m of r.top_five_members_topup) {
                const key = m.member || 'unknown';
                if (memberMap.has(key)) {
                  memberMap.get(key).amount = (memberMap.get(key).amount || 0) + (m.amount || 0);
                } else {
                  memberMap.set(key, { ...m });
                }
              }
            }
            return Array.from(memberMap.values()).sort((a, b) => (b.amount || 0) - (a.amount || 0)).slice(0, 5);
          })(),
          // Merge top PCs (combine by pc_name, take top 5)
          top_five_pc_spend: (() => {
            const pcMap = new Map<string, any>();
            for (const r of shiftResults) {
              if (!r?.top_five_pc_spend) continue;
              for (const pc of r.top_five_pc_spend) {
                const key = pc.pc_name || 'unknown';
                if (pcMap.has(key)) {
                  pcMap.get(key).total_spend = (pcMap.get(key).total_spend || 0) + (pc.total_spend || 0);
                } else {
                  pcMap.set(key, { ...pc });
                }
              }
            }
            return Array.from(pcMap.values()).sort((a, b) => (b.total_spend || 0) - (a.total_spend || 0)).slice(0, 5);
          })(),
        };

        return { code: 200, message: "OK", data: aggregated };
      } catch (err: unknown) {
        return { code: 500, message: err instanceof Error ? err.message : 'Unknown error', data: null };
      }
    }),

  // Shift-aggregated combined report for all cafes
  shiftAggregatedCombined: protectedProcedure
    .input(
      z.object({
        dateStart: z.string(),
        dateEnd: z.string(),
        timeStart: z.string().optional(),
        timeEnd: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const allCafes = await getAllUserCafesWithKeys(ctx.user.id);
      const results = await Promise.all(
        allCafes.map(async (cafe) => {
          // Re-use the same shift-aggregation logic per cafe
          try {
            const shiftsData = await icafe.getShiftList(
              { cafeId: cafe.cafeId, apiKey: cafe.apiKey },
              { date_start: input.dateStart, date_end: input.dateEnd, time_start: input.timeStart, time_end: input.timeEnd }
            );
            const shiftList = Array.isArray((shiftsData as any)?.data)
              ? (shiftsData as any).data
              : (shiftsData as any)?.data?.shift_list || (shiftsData as any)?.data?.shifts || [];

            if (shiftList.length === 0) {
              return {
                cafeDbId: cafe.id, cafeName: cafe.name, cafeId: cafe.cafeId,
                data: null, code: 200,
              };
            }

            const shiftResults = await Promise.all(
              shiftList.map(async (shift: any) => {
                const startTime = shift.shift_start_time || '';
                const endTime = shift.shift_end_time || '';
                const staffName = shift.shift_staff_name || '';
                const startParts = startTime.split(' ');
                const startDate = startParts[0] || input.dateStart;
                const startTimePart = startParts[1] ? startParts[1].substring(0, 5) : '00:00';
                let endDate = startDate;
                let endTimePart = '23:59';
                if (endTime && endTime !== '-') {
                  const endParts = endTime.split(' ');
                  endDate = endParts[0] || startDate;
                  endTimePart = endParts[1] ? endParts[1].substring(0, 5) : '23:59';
                }
                try {
                  const data = await icafe.getReportData(
                    { cafeId: cafe.cafeId, apiKey: cafe.apiKey },
                    { date_start: startDate, date_end: endDate, time_start: startTimePart, time_end: endTimePart, log_staff_name: staffName }
                  );
                  return (data as any)?.data || null;
                } catch {
                  return null;
                }
              })
            );

            // Sum shift results
            const sumNum = (vals: (number | undefined | null)[]) => vals.reduce((a, v) => (a || 0) + (Number(v) || 0), 0);
            const aggregated = {
              report: {
                cash: sumNum(shiftResults.map(r => r?.report?.cash)),
                profit: sumNum(shiftResults.map(r => r?.report?.profit)),
                report_start: input.dateStart,
                report_end: input.dateEnd,
              },
              sale: {
                total: sumNum(shiftResults.map(r => r?.sale?.total)),
                product: { number: sumNum(shiftResults.map(r => r?.sale?.product?.number)), total: sumNum(shiftResults.map(r => r?.sale?.product?.total)) },
                cash: { number: sumNum(shiftResults.map(r => r?.sale?.cash?.number)), total: sumNum(shiftResults.map(r => r?.sale?.cash?.total)) },
                by_balance: { number: sumNum(shiftResults.map(r => r?.sale?.by_balance?.number)), total: sumNum(shiftResults.map(r => r?.sale?.by_balance?.total)) },
                credit_card: { number: sumNum(shiftResults.map(r => r?.sale?.credit_card?.number)), total: sumNum(shiftResults.map(r => r?.sale?.credit_card?.total)) },
                offer_member: { number: sumNum(shiftResults.map(r => r?.sale?.offer_member?.number)), total: sumNum(shiftResults.map(r => r?.sale?.offer_member?.total)) },
                coin: { number: sumNum(shiftResults.map(r => r?.sale?.coin?.number)), total: sumNum(shiftResults.map(r => r?.sale?.coin?.total)) },
              },
              topup: {
                amount: sumNum(shiftResults.map(r => r?.topup?.amount)),
                number: sumNum(shiftResults.map(r => r?.topup?.number)),
                member: { amount: sumNum(shiftResults.map(r => r?.topup?.member?.amount)), number: sumNum(shiftResults.map(r => r?.topup?.member?.number)) },
                cash: { amount: sumNum(shiftResults.map(r => r?.topup?.cash?.amount)), number: sumNum(shiftResults.map(r => r?.topup?.cash?.number)) },
                credit_card: { amount: sumNum(shiftResults.map(r => r?.topup?.credit_card?.amount)), number: sumNum(shiftResults.map(r => r?.topup?.credit_card?.number)) },
                qr: { amount: sumNum(shiftResults.map(r => r?.topup?.qr?.amount)), number: sumNum(shiftResults.map(r => r?.topup?.qr?.number)) },
              },
              refund: {
                topup: {
                  total: { amount: sumNum(shiftResults.map(r => r?.refund?.topup?.total?.amount)), number: sumNum(shiftResults.map(r => r?.refund?.topup?.total?.number)) },
                  member: { amount: sumNum(shiftResults.map(r => r?.refund?.topup?.member?.amount)), number: sumNum(shiftResults.map(r => r?.refund?.topup?.member?.number)) },
                  cash: { amount: sumNum(shiftResults.map(r => r?.refund?.topup?.cash?.amount)), number: sumNum(shiftResults.map(r => r?.refund?.topup?.cash?.number)) },
                  credit_card: { amount: sumNum(shiftResults.map(r => r?.refund?.topup?.credit_card?.amount)), number: sumNum(shiftResults.map(r => r?.refund?.topup?.credit_card?.number)) },
                  prepaid: { amount: sumNum(shiftResults.map(r => r?.refund?.topup?.prepaid?.amount)), number: sumNum(shiftResults.map(r => r?.refund?.topup?.prepaid?.number)) },
                  bonus: { amount: sumNum(shiftResults.map(r => r?.refund?.topup?.bonus?.amount)), number: sumNum(shiftResults.map(r => r?.refund?.topup?.bonus?.number)) },
                },
                sale: {
                  total: { amount: sumNum(shiftResults.map(r => r?.refund?.sale?.total?.amount)), number: sumNum(shiftResults.map(r => r?.refund?.sale?.total?.number)) },
                },
              },
              product_sales_items: (() => {
                const itemMap = new Map<string, any>();
                for (const r of shiftResults) {
                  if (!r?.product_sales_items) continue;
                  for (const item of r.product_sales_items) {
                    const key = item.product_name || item.name || 'unknown';
                    if (itemMap.has(key)) {
                      const existing = itemMap.get(key);
                      existing.order_number = (existing.order_number || 0) + (item.order_number || 0);
                      existing.order_total = (existing.order_total || 0) + (item.order_total || 0);
                      existing.order_refunded = (existing.order_refunded || 0) + (item.order_refunded || 0);
                    } else {
                      itemMap.set(key, { ...item });
                    }
                  }
                }
                return Array.from(itemMap.values());
              })(),
              top_five_members_topup: (() => {
                const memberMap = new Map<string, any>();
                for (const r of shiftResults) {
                  if (!r?.top_five_members_topup) continue;
                  for (const m of r.top_five_members_topup) {
                    const key = m.member || 'unknown';
                    if (memberMap.has(key)) { memberMap.get(key).amount = (memberMap.get(key).amount || 0) + (m.amount || 0); }
                    else { memberMap.set(key, { ...m }); }
                  }
                }
                return Array.from(memberMap.values()).sort((a, b) => (b.amount || 0) - (a.amount || 0)).slice(0, 5);
              })(),
              top_five_pc_spend: (() => {
                const pcMap = new Map<string, any>();
                for (const r of shiftResults) {
                  if (!r?.top_five_pc_spend) continue;
                  for (const pc of r.top_five_pc_spend) {
                    const key = pc.pc_name || 'unknown';
                    if (pcMap.has(key)) { pcMap.get(key).total_spend = (pcMap.get(key).total_spend || 0) + (pc.total_spend || 0); }
                    else { pcMap.set(key, { ...pc }); }
                  }
                }
                return Array.from(pcMap.values()).sort((a, b) => (b.total_spend || 0) - (a.total_spend || 0)).slice(0, 5);
              })(),
            };

            return {
              cafeDbId: cafe.id, cafeName: cafe.name, cafeId: cafe.cafeId,
              data: aggregated, code: 200,
            };
          } catch {
            return {
              cafeDbId: cafe.id, cafeName: cafe.name, cafeId: cafe.cafeId,
              data: null, code: 500,
            };
          }
        })
      );
      return results;
    }),

      


      
        

    combined: protectedProcedure
      .input(
        z.object({
          dateStart: z.string(),
          dateEnd: z.string(),
          timeStart: z.string().optional(),
          timeEnd: z.string().optional(),
        })
      )
      .query(async ({ ctx, input }) => {
        const allCafes = await getAllUserCafesWithKeys(ctx.user.id);
        const results = await Promise.all(
          allCafes.map(async (cafe) => {
            const data = await icafe.getReportData(
              { cafeId: cafe.cafeId, apiKey: cafe.apiKey },
              { date_start: input.dateStart, date_end: input.dateEnd, time_start: input.timeStart, time_end: input.timeEnd }
            );
            return {
              cafeDbId: cafe.id,
              cafeName: cafe.name,
              cafeId: cafe.cafeId,
              data: data.data,
              code: data.code,
            };
          })
        );
        return results;
      }),
  }),

  // === Orders & Billing ===
  orders: router({
    list: protectedProcedure
      .input(z.object({ cafeDbId: z.number() }))
      .query(async ({ ctx, input }) => {
        const cafe = await getCafeById(input.cafeDbId, ctx.user.id);
        if (!cafe) return { code: 404, message: "Cafe not found", data: [] };
        return icafe.getOrders({ cafeId: cafe.cafeId, apiKey: cafe.apiKey });
      }),
  }),

  billing: router({
    logs: protectedProcedure
      .input(z.object({ cafeDbId: z.number() }))
      .query(async ({ ctx, input }) => {
        const cafe = await getCafeById(input.cafeDbId, ctx.user.id);
        if (!cafe) return { code: 404, message: "Cafe not found", data: [] };
        return icafe.getBillingLogs({
          cafeId: cafe.cafeId,
          apiKey: cafe.apiKey,
        });
      }),
  }),

  // === Prices ===
  prices: router({
    list: protectedProcedure
      .input(z.object({ cafeDbId: z.number() }))
      .query(async ({ ctx, input }) => {
        const cafe = await getCafeById(input.cafeDbId, ctx.user.id);
        if (!cafe) return { code: 404, message: "Cafe not found", data: [] };
        return icafe.getPrices({ cafeId: cafe.cafeId, apiKey: cafe.apiKey });
      }),
  }),  
  
  // === QuickBooks Integration ===
  quickbooks: router({
    status: adminProcedure.query(async ({ ctx }) => {
      const { getQbToken } = await import("./db");
      const token = await getQbToken(ctx.user.id);
      if (!token) {
        return { connected: false };
      }
      // Check if access token is expired
      const now = new Date();
      const isAccessTokenExpired = now >= token.accessTokenExpiresAt;
      const isRefreshTokenExpired = now >= token.refreshTokenExpiresAt;
      return {
        connected: true,
        companyName: token.companyName,
        realmId: token.realmId,
        isAccessTokenExpired,
        isRefreshTokenExpired,
        needsReconnect: isRefreshTokenExpired,
      };
    }),

    disconnect: adminProcedure.mutation(async ({ ctx }) => {
      const { getQbToken, deleteQbToken } = await import("./db");
      const { revokeToken } = await import("./quickbooks-api");
      
      const token = await getQbToken(ctx.user.id);
      if (token) {
        try {
          await revokeToken(token.refreshToken);
        } catch (error) {
          console.warn("[QuickBooks] Failed to revoke token:", error);
        }
        await deleteQbToken(ctx.user.id);
      }
      return { success: true };
    }),

    sendReport: adminProcedure
      .input(
        z.object({
          cafeDbId: z.number(),
          businessDate: z.string(), // YYYY-MM-DD
          cashAccountId: z.string().optional(), // QuickBooks account ID for cash
          revenueAccountId: z.string().optional(), // QuickBooks account ID for revenue
        })
      )
      .mutation(async ({ ctx, input }) => {
        const { getQbToken, getCafeById, addQbReportLog, getQbReportLogByDate } = await import("./db");
        const { refreshAccessToken, createJournalEntry } = await import("./quickbooks-api");
        const { generateDailyReport } = await import("./quickbooks-report");

        // Check if already sent for this date
        const existingLog = await getQbReportLogByDate(ctx.user.id, input.cafeDbId, input.businessDate);
        if (existingLog) {
          throw new Error(`Report for ${input.businessDate} has already been sent to QuickBooks (Journal Entry ID: ${existingLog.journalEntryId})`);
        }

        // Get QuickBooks token
        const token = await getQbToken(ctx.user.id);
        if (!token) {
          throw new Error("QuickBooks not connected. Please connect your QuickBooks account first.");
        }

        // Check if access token is expired and refresh if needed
        let accessToken = token.accessToken;
        const now = new Date();
        if (now >= token.accessTokenExpiresAt) {
          console.log("[QuickBooks] Access token expired, refreshing...");
          const refreshed = await refreshAccessToken(token.refreshToken);
          accessToken = refreshed.accessToken;
          // Update token in database
          const { upsertQbToken } = await import("./db");
          await upsertQbToken(ctx.user.id, {
            realmId: token.realmId,
            accessToken: refreshed.accessToken,
            refreshToken: refreshed.refreshToken,
            accessTokenExpiresAt: new Date(now.getTime() + refreshed.accessTokenExpiresIn * 1000),
            refreshTokenExpiresAt: new Date(now.getTime() + refreshed.refreshTokenExpiresIn * 1000),
            companyName: token.companyName ?? undefined,
          });
        }
        
        // 🔎 DEBUG: Fetch QuickBooks Accounts
        const { getAccounts } = await import("./quickbooks-api");

      const accounts = await getAccounts(accessToken, token.realmId);

      console.log("QB ACCOUNTS:", accounts.map((a: any) => ({
        Id: a.Id,
        Name: a.Name,
        AccountType: a.AccountType,
      })));

      


        // Get cafe details
        const cafe = await getCafeById(input.cafeDbId, ctx.user.id);
        if (!cafe) {
          throw new Error("Cafe not found");
        }

        // Generate daily report
        const report = await generateDailyReport({
          cafeId: cafe.cafeId,
          apiKey: cafe.apiKey,
          cafeName: cafe.name,
          businessDate: input.businessDate,
        });

        // Build journal entry lines
        const lines: Array<{
          description: string;
          amount: number;
          postingType: "Debit" | "Credit";
          accountRef: { name: string; value: string };
        }> = [];

        // Use default accounts if not provided (user should configure these in settings)
        const cashAccountId = input.cashAccountId || "202"; // Default to first account (user should configure)
        const revenueAccountId = input.revenueAccountId || "206"; // Default to second account (user should configure)
        /*if (!input.cashAccountId || !input.revenueAccountId) {
          throw new Error(
            "QuickBooks account IDs not configured. Please configure Cash and Revenue accounts."
          );
        }
        
        const cashAccountId = input.cashAccountId;
        const revenueAccountId = input.revenueAccountId;*/
        
        
        // Add shift breakdown lines
        report.shifts.forEach((shift) => {
          console.log("QB SHIFTS:", report.shifts);

          const timeRange =
          shift.startTime && shift.endTime
            ? `${shift.startTime} - ${shift.endTime}`
            : "Unknown";

          // Debit: Cash (asset increases)
          lines.push({
            description: `${cafe.name} - ${shift.staffName ?? "Unknown"} (${timeRange}) - Cash`,
            amount: shift.cash,
            postingType: "Debit",
            accountRef: { name: "Cash", value: cashAccountId },
          });

          // Credit: Revenue (income increases)
          lines.push({
            description: `${cafe.name} - ${shift.staffName ?? "Unknown"} (${timeRange}) - Revenue`,
            amount: shift.cash,
            postingType: "Credit",
            accountRef: { name: "Revenue", value: revenueAccountId },
          });
        });

        // Create journal entry
        try {
          const journalEntry = await createJournalEntry(accessToken, token.realmId, {
            txnDate: input.businessDate,
            //docNumber: `ICAFE-${cafe.name.replace(/\s+/g, "").toUpperCase()}-${input.businessDate}`,
            docNumber: (`G${input.cafeDbId}-${input.businessDate.replace(/-/g, "")}`).substring(0, 21),
            privateNote: `Daily iCafe report for ${cafe.name}\nBusiness Date: ${input.businessDate}\nShifts: ${report.shiftCount}\nTotal Cash: ₱${report.totals.cash.toLocaleString()}`,
            lines,
          });

          // Log the successful send
          await addQbReportLog({
            userId: ctx.user.id,
            cafeId: input.cafeDbId,
            cafeName: cafe.name,
            businessDate: input.businessDate,
            journalEntryId: journalEntry.Id,
            totalCash: report.totals.cash,
            shiftCount: report.shiftCount,
            status: "success",
            errorMessage: null,
          });

          return {
            success: true,
            journalEntryId: journalEntry.Id,
            totalCash: report.totals.cash,
            shiftCount: report.shiftCount,
          };
        } catch (error) {
          // Log the failed send
          await addQbReportLog({
            userId: ctx.user.id,
            cafeId: input.cafeDbId,
            cafeName: cafe.name,
            businessDate: input.businessDate,
            journalEntryId: null,
            totalCash: report.totals.cash,
            shiftCount: report.shiftCount,
            status: "failed",
            errorMessage: error instanceof Error ? error.message : String(error),
          });
          throw error;
        }
      }),
      

    logs: adminProcedure.query(async ({ ctx }) => {
      const { getQbReportLogs } = await import("./db");
      return getQbReportLogs(ctx.user.id, 50);
    }),

    getAutoSendSetting: protectedProcedure
      .input(z.object({ cafeDbId: z.number() }))
      .query(async ({ ctx, input }) => {
        const { getQbAutoSendSetting } = await import("./db");
        return getQbAutoSendSetting(ctx.user.id, input.cafeDbId);
      }),

    updateAutoSendSetting: protectedProcedure
      .input(
        z.object({
          cafeDbId: z.number(),
          enabled: z.boolean(),
          mode: z.enum(["daily_time", "business_day_end", "last_shift"]),
          scheduleTime: z.string().optional(), // HH:MM format
        })
      )
      .mutation(async ({ ctx, input }) => {
        const { upsertQbAutoSendSetting } = await import("./db");
        await upsertQbAutoSendSetting({
          userId: ctx.user.id,
          cafeId: input.cafeDbId,
          enabled: input.enabled ? 1 : 0,
          mode: input.mode,
          scheduleTime: input.scheduleTime,
        });
        return { success: true };
      }),
  
  }),

  

  // === User Management ===
  users: router({
    list: adminProcedure
      .input(z.void())
      .query(async () => {
        return getAllUsers();
      }),

    get: adminProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return getUserById(input.id);
      }),

    create: adminProcedure
      .input(
        z.object({
          username: z.string().min(1),
          password: z.string().min(6),
          name: z.string().optional(),
          email: z.string().email().optional(),
          role: z.enum(["user", "admin"]).optional(),
        })
      )
      .mutation(async ({ input }) => {
        return createLocalUser(input);
      }),

    update: adminProcedure
      .input(
        z.object({
          id: z.number(),
          name: z.string().optional(),
          email: z.string().email().optional(),
          role: z.enum(["user", "admin"]).optional(),
          password: z.string().min(6).optional(),
        })
      )
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        return updateUser(id, data);
      }),

    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        return deleteUser(input.id, ctx.user.id);
      }),
  }),

  // === Feedback Management ===
  feedbacks: router({
    list: protectedProcedure
      .input(
        z.object({
          cafeDbId: z.number(),
          read: z.number().optional(),
          page: z.number().optional(),
          limit: z.number().optional(),
        })
      )
      .query(async ({ ctx, input }) => {
        const cafe = await getCafeById(input.cafeDbId, ctx.user.id);
        if (!cafe) {
          return { code: 404, message: "Cafe not found", data: [] };
        }

        const response = await icafe.getFeedbackLogs(
          {
            cafeId: cafe.cafeId,
            apiKey: cafe.apiKey,
          },
          {
            read: input.read,
            page: input.page,
            limit: input.limit,
          }
        );

        return response;
      }),

    allCafes: protectedProcedure
      .input(
        z.object({
          // Limit per cafe to prevent performance issues with large feedback volumes
          limit: z.number().min(1).max(MAX_FEEDBACK_LIMIT).default(DEFAULT_FEEDBACK_LIMIT),
        })
      )
      .query(async ({ ctx, input }) => {
        const cafes = await getUserCafes(ctx.user.id);
        
        const feedbackPromises = cafes.map(async (cafe) => {
          const response = await icafe.getFeedbackLogs(
            {
              cafeId: cafe.cafeId,
              apiKey: cafe.apiKey,
            },
            {
              read: FEEDBACK_READ_STATUS_ALL, // Get all feedbacks
              page: 1,
              limit: input.limit,
            }
          );

          return {
            cafeDbId: cafe.id,
            cafeName: cafe.name,
            cafeId: cafe.cafeId,
            feedbacks: response.data || [],
          };
        });

        // Use Promise.allSettled to handle partial failures gracefully
        const results = await Promise.allSettled(feedbackPromises);
        
        // Return only successful results, filtering out failed cafe requests
        return results
          .filter((result): result is PromiseFulfilledResult<{
            cafeDbId: number;
            cafeName: string;
            cafeId: string;
            feedbacks: any[];
          }> => result.status === 'fulfilled')
          .map(result => result.value);
      }),

    markAsRead: protectedProcedure
      .input(
        z.object({
          cafeDbId: z.number(),
          logId: z.number(),
          isRead: z.boolean(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const { setFeedbackReadStatus } = await import("./db");
        await setFeedbackReadStatus(
          ctx.user.id,
          input.cafeDbId,
          input.logId,
          input.isRead
        );
        return { success: true };
      }),

    getReadStatuses: protectedProcedure.query(async ({ ctx }) => {
      const { getUserFeedbackReadStatuses } = await import("./db");
      return getUserFeedbackReadStatuses(ctx.user.id);
    }),
  }),
});

export type AppRouter = typeof appRouter;
