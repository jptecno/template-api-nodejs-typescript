export interface HttpServerConfiguration {
  bodyLimitBytes: number;
  connectionTimeoutMilliseconds: number;
  keepAliveTimeoutMilliseconds: number;
  requestTimeoutMilliseconds: number;
}
