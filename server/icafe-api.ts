import axios, { AxiosError } from "axios";
import { Agent as HttpAgent } from "http";
import { Agent as HttpsAgent } from "https";

// iCafe Cloud uses regional servers. Examples:
// - as1.icafecloud.com = Asia Server 1
// - api.icafecloud.com = Global/default
// Configure via ICAFE_BASE_URL environment variable if needed
const ICAFE_BASE_URL = process.env.ICAFE_BASE_URL || "https://as1.icafecloud.com";

// Force IPv4 for iCafeCloud API requests to avoid IPv6 whitelist issues
const httpsAgent = new HttpsAgent({
  family: 4, // Force IPv4
  keepAlive: true,
});

interface IcafeApiOptions {
  cafeId: string;
  apiKey: string;
}

interface IcafeResponse<T = unknown> {
  code: number;
  message: string;
  data?: T;
}

async function icafeRequest<T = unknown>(
  method: "GET" | "POST" | "PUT" | "DELETE",
  path: string,
  options: IcafeApiOptions,
  body?: Record<string, unknown>,
  queryParams?: Record<string, string>
): Promise<IcafeResponse<T>> {
  const url = `${ICAFE_BASE_URL}/api/v2/cafe/${options.cafeId}${path}`;
  console.log(`[iCafe API] ${method} ${url}`, queryParams ? `params: ${JSON.stringify(queryParams)}` : '');
  
  // Ensure API key is trimmed to avoid whitespace issues
  const apiKey = options.apiKey.trim();
  
  // Debug: Log the length and first/last few characters of the API key (for debugging without exposing full key)
  console.log(`[iCafe API] API Key length: ${apiKey.length}, starts with: ${apiKey.substring(0, 4)}...`);

  try {
    const response = await axios({
      method,
      url,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      data: body,
      params: queryParams,
      timeout: 15000,
      httpsAgent, // Use IPv4-only agent
    });
    console.log(`[iCafe API] Response ${response.status}:`, JSON.stringify(response.data).substring(0, 2000));
    
    // iCafeCloud API returns HTTP 200 with error codes in the JSON body
    // Check if the response contains an error code (400+)
    const responseData = response.data;
    if (responseData && typeof responseData === 'object' && 'code' in responseData) {
      const errorCode = responseData.code as number;
      if (errorCode >= 400) {
        const errorMessage = ('message' in responseData && typeof responseData.message === 'string')
          ? responseData.message
          : 'Unknown error';
        console.error(`[iCafe API] Error code ${errorCode} in response body: ${errorMessage}`);
        return { code: errorCode, message: errorMessage };
      }
    }
    
    return response.data;
  } catch (error) {
    if (error instanceof AxiosError) {
      const status = error.response?.status || 500;
      console.error(`[iCafe API] Error ${status}:`, error.response?.data ? JSON.stringify(error.response.data).substring(0, 300) : error.message);
      // iCafeCloud returns JSON errors like {"code":401,"message":"Unauthorization from IP"}
      // or HTML 500 errors when the server is unreachable
      const responseData = error.response?.data;
      let message = error.message;
      if (responseData) {
        if (typeof responseData === 'string' && responseData.includes('<html')) {
          message = `iCafeCloud API returned HTTP ${status}. The API server may be temporarily unavailable.`;
        } else if (typeof responseData === 'object' && responseData.message) {
          message = responseData.message;
        } else if (typeof responseData === 'string') {
          message = responseData;
        }
      }
      return { code: status, message };
    }
    return { code: 500, message: "Unknown error connecting to iCafeCloud API" };
  }
}

// === PC APIs ===
export function getPcsList(opts: IcafeApiOptions) {
  return icafeRequest("GET", "/pcs/action/getPcsList", opts, undefined, {
    pc_name: "",
    pc_console_type: "",
  });
}

export function getPcs(opts: IcafeApiOptions) {
  return icafeRequest("GET", "/pcs", opts);
}

export function setOutOfOrder(
  opts: IcafeApiOptions,
  pcNames: string[],
  outOfOrder: number
) {
  return icafeRequest("POST", "/pcs/action/setOutOfOrder", opts, {
    pc_name: pcNames,
    out_of_order: outOfOrder,
  });
}

export function getRooms(opts: IcafeApiOptions) {
  return icafeRequest("GET", "/pcs/action/rooms", opts);
}

// === PC Session APIs ===
export function sendWssCommand(
  opts: IcafeApiOptions,
  command: Record<string, unknown>
) {
  return icafeRequest("POST", "/pcSessions/sendWssCommand", opts, command);
}

export function getPaymentInfo(opts: IcafeApiOptions, pcName: string) {
  return icafeRequest("POST", "/pcSessions/paymentInfo", opts, {
    pc_name: pcName,
  });
}

export function checkoutSession(
  opts: IcafeApiOptions,
  data: Record<string, unknown>
) {
  return icafeRequest("POST", "/pcSessions/checkout", opts, data);
}

export function pushClientStatus(opts: IcafeApiOptions, pcName: string) {
  return icafeRequest("POST", "/pcSessions/pushClientStatus", opts, {
    pc_name: pcName,
  });
}

// === Member APIs ===
export function getMembers(
  opts: IcafeApiOptions,
  params?: { search_text?: string; page?: number; limit?: number; sort?: string }
) {
  const qp: Record<string, string> = {};
  if (params?.search_text) qp.search_text = params.search_text;
  if (params?.page) qp.page = String(params.page);
  if (params?.limit) qp.limit = String(params.limit);
  if (params?.sort) qp.sort = params.sort;
  return icafeRequest("GET", "/members", opts, undefined, qp);
}

export function getMemberDetails(opts: IcafeApiOptions, memberId: number) {
  return icafeRequest("GET", `/members/${memberId}`, opts);
}

export function getMemberBalanceHistory(
  opts: IcafeApiOptions,
  memberId: number
) {
  return icafeRequest("GET", `/members/${memberId}/balanceHistory`, opts);
}

export function getMemberOrders(opts: IcafeApiOptions, memberId: number) {
  return icafeRequest("GET", `/members/${memberId}/orders`, opts);
}

export function searchMembers(opts: IcafeApiOptions, searchText: string) {
  return icafeRequest(
    "GET",
    "/members/action/suggestMembers",
    opts,
    undefined,
    { search_text: searchText }
  );
}

export function topupMember(
  opts: IcafeApiOptions,
  data: Record<string, unknown>
) {
  return icafeRequest("POST", "/members/action/topup", opts, data);
}

// === Product APIs ===
export function getProducts(
  opts: IcafeApiOptions,
  params?: { sort?: string; page?: number; product_group_id?: string; search_text?: string }
) {
  const qp: Record<string, string> = {};
  if (params?.sort) qp.sort = params.sort;
  if (params?.page) qp.page = String(params.page);
  if (params?.product_group_id) qp.product_group_id = params.product_group_id;
  if (params?.search_text) qp.search_text = params.search_text;
  return icafeRequest("GET", "/products", opts, undefined, qp);
}

export function getProductGroups(opts: IcafeApiOptions) {
  return icafeRequest("GET", "/productGroups", opts);
}

export function addProduct(
  opts: IcafeApiOptions,
  data: Record<string, unknown>
) {
  return icafeRequest("POST", "/products", opts, data);
}

export function updateProduct(
  opts: IcafeApiOptions,
  productId: number,
  data: Record<string, unknown>
) {
  return icafeRequest("PUT", `/products/${productId}`, opts, data);
}

export function deleteProduct(opts: IcafeApiOptions, productId: number) {
  return icafeRequest("DELETE", `/products/${productId}`, opts);
}

// === Report APIs ===
export function getReportData(
  opts: IcafeApiOptions,
  params: { date_start: string; date_end: string; time_start?: string; time_end?: string; data_source?: string; log_staff_name?: string }
) {
  const qp: Record<string, string> = {
    date_start: params.date_start,
    date_end: params.date_end,
    time_start: params.time_start || "00:00",
    time_end: params.time_end || "23:59",
    data_source: params.data_source || "recent",
  };
  if (params.log_staff_name) qp.log_staff_name = params.log_staff_name;
  return icafeRequest("GET", "/reports/reportData", opts, undefined, qp);
}

export function getReportChart(
  opts: IcafeApiOptions,
  params: {
    date_start: string;
    date_end: string;
    chart_type?: string;
    log_staff_name?: string;
  }
) {
  return icafeRequest("GET", "/reports/reportChart", opts, undefined, {
    date_start: params.date_start,
    date_end: params.date_end,
    chart_type: params.chart_type || "income",
    log_staff_name: params.log_staff_name || "all",
    data_source: "recent",
  });
}

export function getShiftList(
  opts: IcafeApiOptions,
  params: { date_start: string; date_end: string; time_start?: string; time_end?: string; shift_staff_name?: string }
) {
  const qp: Record<string, string> = {
    date_start: params.date_start,
    date_end: params.date_end,
    shift_staff_name: params.shift_staff_name || "all",
  };
  if (params.time_start) qp.time_start = params.time_start;
  if (params.time_end) qp.time_end = params.time_end;
  return icafeRequest("GET", "/reports/shiftList", opts, undefined, qp);
}

export function getShiftDetail(
  opts: IcafeApiOptions,
  shiftId: string
) {
  return icafeRequest("GET", `/reports/shiftDetail/${shiftId}`, opts);
}

export function getCustomerAnalysis(
  opts: IcafeApiOptions,
  params: { date_start: string; date_end: string }
) {
  return icafeRequest("GET", "/reports/customerAnalysis", opts, undefined, {
    date_start: params.date_start,
    date_end: params.date_end,
  });
}

// === Order APIs ===
export function getOrders(opts: IcafeApiOptions) {
  return icafeRequest("GET", "/orders", opts);
}

// === Billing Log APIs ===
export function getBillingLogs(
  opts: IcafeApiOptions,
  params?: {
    date_start?: string;
    date_end?: string;
    page?: number;
    limit?: number;
    event?: string;
    staff?: string;
    member?: string;
    pc?: string;
    member_or_guest?: string;
    data_source?: string;
    log_type?: string;
  }
) {
  const qp: Record<string, string> = {};

  if (params?.date_start) qp.date_start = params.date_start;
  if (params?.date_end) qp.date_end = params.date_end;
  if (params?.page) qp.page = String(params.page);
  if (params?.limit) qp.limit = String(params.limit);
  if (params?.event) qp.event = params.event;
  if (params?.staff) qp.staff = params.staff;
  if (params?.member) qp.member = params.member;
  if (params?.pc) qp.pc = params.pc;
  if (params?.member_or_guest) qp.member_or_guest = params.member_or_guest;
  if (params?.data_source) qp.data_source = params.data_source;
  if (params?.log_type) qp.log_type = params.log_type;

  return icafeRequest("GET", "/billingLogs", opts, undefined, qp);
}

export function getFeedbackLogs(
  opts: IcafeApiOptions,
  params?: {
    read?: number;
    page?: number;
    limit?: number;
  }
) {
  const qp: Record<string, string> = {};
  
  if (params?.read !== undefined) qp.read = String(params.read);
  if (params?.page) qp.page = String(params.page);
  if (params?.limit) qp.limit = String(params.limit);

  return icafeRequest("GET", "/billingLogs/action/feedbackLogs", opts, undefined, qp);
}


// === Staff APIs ===
export function getStaffs(opts: IcafeApiOptions) {
  return icafeRequest("GET", "/staffs", opts);
}

// === Prices APIs ===
export function getPrices(opts: IcafeApiOptions) {
  return icafeRequest("GET", "/prices", opts);
}
