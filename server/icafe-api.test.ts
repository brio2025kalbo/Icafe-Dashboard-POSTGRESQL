import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import axios from "axios";

// Mock axios before importing the module
vi.mock("axios");

describe("iCafe API Error Handling", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should handle 401 error in HTTP 200 response body", async () => {
    // Mock axios to return HTTP 200 with error in body
    const mockedAxios = vi.mocked(axios);
    mockedAxios.mockResolvedValueOnce({
      status: 200,
      data: {
        code: 401,
        message: "Unauthenticated.",
      },
    });

    // Import after mocking
    const { getFeedbackLogs } = await import("./icafe-api");

    const result = await getFeedbackLogs(
      {
        cafeId: "12345",
        apiKey: "invalid-key",
      },
      {
        read: -1,
        page: 1,
        limit: 100,
      }
    );

    // Should return error response
    expect(result).toEqual({
      code: 401,
      message: "Unauthenticated.",
    });
  });

  it("should handle successful response with data", async () => {
    // Mock axios to return HTTP 200 with success data
    const mockedAxios = vi.mocked(axios);
    mockedAxios.mockResolvedValueOnce({
      status: 200,
      data: {
        code: 200,
        message: "Success",
        data: [
          {
            log_id: 1,
            log_pc_name: "PC-01",
            subject: "Test Feedback",
            message: "This is a test",
          },
        ],
      },
    });

    // Import after mocking
    const { getFeedbackLogs } = await import("./icafe-api");

    const result = await getFeedbackLogs(
      {
        cafeId: "12345",
        apiKey: "valid-key",
      },
      {
        read: -1,
        page: 1,
        limit: 100,
      }
    );

    // Should return success response
    expect(result).toHaveProperty("code", 200);
    expect(result).toHaveProperty("data");
    expect(result.data).toBeInstanceOf(Array);
  });

  it("should handle HTTP error status codes", async () => {
    // Mock axios to throw an error
    const mockedAxios = vi.mocked(axios);
    mockedAxios.mockRejectedValueOnce({
      isAxiosError: true,
      response: {
        status: 500,
        data: "Internal Server Error",
      },
    });

    // Import after mocking
    const { getFeedbackLogs } = await import("./icafe-api");

    const result = await getFeedbackLogs(
      {
        cafeId: "12345",
        apiKey: "valid-key",
      },
      {
        read: -1,
        page: 1,
        limit: 100,
      }
    );

    // Should return error response
    expect(result).toHaveProperty("code", 500);
    expect(result).toHaveProperty("message");
  });
});
