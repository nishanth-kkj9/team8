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
    details?: ApiErrorDetail[];
  };
  request_id?: string;
  message?: string;
  code?: string;
}

export class ApiError extends Error {
  status: number;
  code: string;
  details?: ApiErrorDetail[];
  requestId?: string;

  constructor(
    status: number,
    code: string,
    message: string,
    details?: ApiErrorDetail[],
    requestId?: string,
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
    this.requestId = requestId;
  }

  static async fromResponse(response: Response): Promise<ApiError> {
    const status = response.status;
    let code = "UNKNOWN_ERROR";
    let message = `Request failed with status ${status}`;
    let details: ApiErrorDetail[] | undefined;
    let requestId: string | undefined;

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
      // Body wasn't valid JSON
    }

    if (status === 401 && code === "UNKNOWN_ERROR") {
      code = "UNAUTHORIZED";
    } else if (status === 403 && code === "UNKNOWN_ERROR") {
      code = "FORBIDDEN";
    } else if (status === 404 && code === "UNKNOWN_ERROR") {
      code = "NOT_FOUND";
    } else if (status === 429 && code === "UNKNOWN_ERROR") {
      code = "RATE_LIMITED";
    }

    return new ApiError(status, code, message, details, requestId);
  }
}
