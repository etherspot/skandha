import fastify, {
  FastifyError,
  FastifyInstance,
  FastifyReply,
  FastifyRequest,
} from "fastify";
import cors from "@fastify/cors";
import websocket from "@fastify/websocket";
import RpcError from "types/lib/api/errors/rpc-error";
import { ServerConfig } from "types/lib/api/interfaces";
import logger from "./logger";
import { HttpStatus } from "./constants";
import { JsonRpcRequest } from "./interface";

export class Server {
  constructor(
    public http: FastifyInstanceAny,
    public ws: FastifyInstanceAny | null,
    private config: ServerConfig
  ) {}

  static async init(config: ServerConfig): Promise<Server> {
    let ws: FastifyInstanceAny | null = null;
    const app = fastify({
      logger,
      disableRequestLogging: !config.enableRequestLogging,
      ignoreTrailingSlash: true,
    });

    await app.register(cors, {
      origin: config.cors,
    });

    if (config.ws) {
      if (config.wsPort == config.port) {
        await app.register(websocket);
        ws = app;
      } else {
        ws = fastify({
          logger,
          disableRequestLogging: !config.enableRequestLogging,
          ignoreTrailingSlash: true,
        });
      }
    }

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

    return new Server(app, ws, config);
  }

  async listen(): Promise<void> {
    const errorHandler = (
      err: FastifyError,
      req: FastifyRequest,
      res: FastifyReply
    ): FastifyReply => {
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
    };

    this.http.setErrorHandler(errorHandler);
    this.http.listen(
      {
        port: this.config.port,
        host: this.config.host,
        listenTextResolver: (address) =>
          `HTTP server listening at ${address}/rpc`,
      },
      (err) => {
        if (err) throw err;
        if (this.http.websocketServer != null) {
          this.http.log.info(
            `Websocket server listening at ws://${this.config.host}:${this.config.port}/rpc`
          );
        }
      }
    );

    if (this.config.ws && this.config.wsPort != this.config.port) {
      this.ws?.setErrorHandler(errorHandler);
      this.ws?.listen(
        {
          port: this.config.wsPort,
          host: this.config.host,
          listenTextResolver: () =>
            `Websocket server listening at ws://${this.config.host}:${this.config.wsPort}/rpc`,
        },
        (err) => {
          if (err) throw err;
        }
      );
    }
  }
}

/// @note to address the bug in fastify types, will be removed in future
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type FastifyInstanceAny = FastifyInstance<any, any, any, any, any>;
