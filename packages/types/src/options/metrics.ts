export type MetricsOptions = {
  enable: boolean;
  host: string;
  port: number;
};

export const defaultMetricsOptions: MetricsOptions = {
  enable: false,
  host: "127.0.0.1",
  port: 8008,
};
