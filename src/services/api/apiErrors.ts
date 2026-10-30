export interface ApiErrorDetail {
  field?: string;
  message?: string;
  code?: string;
  [key: string]: unknown;
}

export interface ApiErrorPayload {
  error?: {
    code?: string;
    message?: string;
    details?: unknown; // Can be ApiErrorDetail[] or { request_ids?: string[] }
  };
  request_id?: string;
  message?: string;
  code?: string;
}

export class ApiError extends Error {
  status: number;
  code: string;
  details?: unknown;
  requestId?: string;
  retryAfterSeconds?: number;

  constructor(
    status: number,
    code: string,
    message: string,
    details?: unknown,
    requestId?: string,
    retryAfterSeconds?: number,
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
    this.requestId = requestId;
    this.retryAfterSeconds = retryAfterSeconds;
  }

  /**
   * Helper to extract failed request IDs from bulk failure details (e.g. error.details.request_ids).
   */
  getFailedRequestIds(): string[] {
    if (this.details && typeof this.details === "object") {
      const detailsObj = this.details as Record<string, unknown>;
      if (Array.isArray(detailsObj.request_ids)) {
        return detailsObj.request_ids.map(String);
      }
    }
    return [];
  }

  static async fromResponse(response: Response): Promise<ApiError> {
    const status = response.status;
    let code = "UNKNOWN_ERROR";
    let message = `Request failed with status ${status}`;
    let details: unknown | undefined;
    let requestId: string | undefined;

    // Check Retry-After header for 429 Rate Limit
    let retryAfterSeconds: number | undefined;
    const retryAfterHeader = response.headers.get("Retry-After");
    if (retryAfterHeader) {
      const parsed = parseInt(retryAfterHeader, 10);
      if (!isNaN(parsed)) {
        retryAfterSeconds = parsed;
      }
    }

    try {
      const text = await response.text();
      if (text) {
        const body: ApiErrorPayload = JSON.parse(text);
        if (body.error) {
          code = body.error.code || code;
          message = body.error.message || message;
          details = body.error.details;
        } else if (body.message) {
          message = body.message;
          code = body.code || code;
        }
        if (body.request_id) {
          requestId = body.request_id;
        }
      }
    } catch {
      // Body was not JSON
    }

    // Assign standard default codes if server did not specify a code
    if (code === "UNKNOWN_ERROR") {
      switch (status) {
        case 400:
          code = "BAD_REQUEST";
          break;
        case 401:
          code = "UNAUTHORIZED";
          break;
        case 403:
          code = "FORBIDDEN";
          break;
        case 404:
          code = "NOT_FOUND";
          break;
        case 409:
          code = "CONFLICT";
          break;
        case 413:
          code = "PAYLOAD_TOO_LARGE";
          break;
        case 415:
          code = "UNSUPPORTED_MEDIA_TYPE";
          break;
        case 422:
          code = "VALIDATION_ERROR";
          break;
        case 429:
          code = "RATE_LIMITED";
          if (retryAfterSeconds) {
            message = `Rate limit exceeded. Please retry after ${retryAfterSeconds} seconds.`;
          }
          break;
        case 503:
          code = "SERVICE_UNAVAILABLE";
          break;
        default:
          if (status >= 500) {
            code = "SERVER_ERROR";
          }
      }
    }

    return new ApiError(status, code, message, details, requestId, retryAfterSeconds);
  }
}
