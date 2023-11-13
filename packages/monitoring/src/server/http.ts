import http from "node:http";
import { AddressInfo } from "node:net";
import { Registry, Histogram } from "prom-client";
import { Logger } from "types/lib";
import { wrapError } from "../utils";

export type HttpMetricsServerOpts = {
  port: number;
  address?: string;
};

export type HttpMetricsServer = {
  close(): Promise<void>;
};

export async function getHttpMetricsServer(
  port: number,
  address: string,
  registry: Registry,
  logger: Logger
): Promise<HttpMetricsServer> {
  // New registry to metric the metrics. Using the same registry would deadlock the .metrics promise
  const httpServerRegistry = new Registry();

  const scrapeTimeMetric = new Histogram<"status">({
    name: "Skandha_metrics_scrape_seconds",
    help: "Skandha metrics server async time to scrape metrics",
    labelNames: ["status"],
    buckets: [0.1, 1, 10],
  });

  const server = http.createServer(async function onRequest(
    req: http.IncomingMessage,
    res: http.ServerResponse
  ): Promise<void> {
    if (req.method === "GET" && req.url && req.url.includes("/metrics")) {
      const timer = scrapeTimeMetric.startTimer();
      const metricsRes = await Promise.all([wrapError(registry.metrics())]);
      timer({ status: metricsRes[0].err ? "error" : "success" });

      // Ensure we only writeHead once
      if (metricsRes[0].err) {
        res
          .writeHead(500, { "content-type": "text/plain" })
          .end(metricsRes[0].err.stack);
      } else {
        // Get scrape time metrics
        const httpServerMetrics = await httpServerRegistry.metrics();
        const metricsStr = `${metricsRes[0].result}\n\n${httpServerMetrics}`;
        res
          .writeHead(200, { "content-type": registry.contentType })
          .end(metricsStr);
      }
    } else {
      res.writeHead(404).end();
    }
  });

  await new Promise<void>((resolve, reject) => {
    server.once("error", (err) => {
      logger.error(err, "Error starting metrics HTTP server");
      reject(err);
    });
    server.listen(port, address, () => {
      const { port, address: host, family } = server.address() as AddressInfo;
      const address = `http://${
        family === "IPv6" ? `[${host}]` : host
      }:${port}`;
      logger.info(
        { address, stats: `${address}/metrics` },
        "Started metrics HTTP server"
      );
      resolve();
    });
  });

  return {
    async close(): Promise<void> {
      await new Promise<void>((resolve, reject) => {
        server.close((err) => {
          if (err) reject(err);
          else resolve();
        });
      });

      logger.debug("Metrics HTTP server closed");
    },
  };
}
