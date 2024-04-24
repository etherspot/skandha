import fastify, { FastifyInstance } from "fastify";
import cors from "@fastify/cors";
import ws from "@fastify/websocket";
import RpcError from "types/lib/api/errors/rpc-error";
import { ServerConfig } from "types/lib/api/interfaces";
import logger from "./logger";
import { HttpStatus } from "./constants";
import { JsonRpcRequest } from "./interface";

export class Server {
  constructor(private app: FastifyInstanceAny, private config: ServerConfig) {}

  static async init(config: ServerConfig): Promise<Server> {
    const app = fastify({
      logger,
      disableRequestLogging: !config.enableRequestLogging,
      ignoreTrailingSlash: true,
    });

    await app.register(cors, {
      origin: config.cors,
    });

    await app.register(ws);

    app.addHook("preHandler", (req, reply, done) => {
      if (req.method === "POST") {
        req.log.info(
          {
            method: req.method,
            url: req.url,
            body: req.body,
          },
          "REQUEST ::"
        );
      } else {
        req.log.info(
          {
            method: req.method,
            url: req.url,
          },
          "REQUEST ::"
        );
      }
      done();
    });
    // RESPONSE LOG
    app.addHook("preSerialization", (request, reply, payload, done) => {
      if (payload) {
        request.log.info({ body: payload }, "RESPONSE ::");
      }
      done();
    });

    return new Server(app, config);
  }

  async listen(): Promise<void> {
    this.app.setErrorHandler((err, req, res) => {
      // eslint-disable-next-line no-console
      logger.error(err);

      if (err instanceof RpcError) {
        const body = req.body as JsonRpcRequest;
        const error = {
          message: err.message,
          data: err.data,
          code: err.code,
        };
        return res.status(HttpStatus.OK).send({
          jsonrpc: body.jsonrpc,
          id: body.id,
          error,
        });
      }

      return res
        .status(err.statusCode ?? HttpStatus.INTERNAL_SERVER_ERROR)
        .send({
          error: "Unexpected behaviour",
        });
    });

    await this.app.listen({
      port: this.config.port,
      host: this.config.host,
    });
  }

  get application(): FastifyInstance {
    return this.app;
  }
}

/// @note to address the bug in fastify types, will be removed in future
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type FastifyInstanceAny = FastifyInstance<any, any, any, any, any>;
