export interface ReadinessCheckPort {
  check(): Promise<void>;
}
