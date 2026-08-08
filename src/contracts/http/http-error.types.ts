export const HttpErrorCode = {
  internalError: 'INTERNAL_ERROR',
  invalidRequest: 'INVALID_REQUEST',
  methodNotAllowed: 'METHOD_NOT_ALLOWED',
  payloadTooLarge: 'PAYLOAD_TOO_LARGE',
  routeNotFound: 'ROUTE_NOT_FOUND',
  serviceUnavailable: 'SERVICE_UNAVAILABLE',
} as const;

export type HttpErrorCode = (typeof HttpErrorCode)[keyof typeof HttpErrorCode];

export interface HttpErrorResponse {
  error: {
    code: HttpErrorCode;
    message: string;
  };
}
