import EventEmitter from "node:events";
import { WebSocket } from "ws";
import { ethers } from "ethers";
import StrictEventEmitter from "strict-event-emitter-types";
import { Logger } from "types/lib";
import { deepHexlify } from "utils/lib/hexlify";
import { MempoolEntry } from "../entities/MempoolEntry";

export enum ExecutorEvent {
  pendingUserOps = "pendingUserOps",
  submittedUserOps = "submittedUserOps",
  ping = "ping",
}

export type ExecutorEvents = {
  [ExecutorEvent.pendingUserOps]: (entry: MempoolEntry) => void;
  [ExecutorEvent.submittedUserOps]: (entry: MempoolEntry) => void;
  [ExecutorEvent.ping]: () => void;
};

export type IExecutorEventBus = StrictEventEmitter<
  EventEmitter,
  ExecutorEvents
>;

export class ExecutorEventBus extends (EventEmitter as {
  new (): IExecutorEventBus;
}) {}

export class SubscriptionService {
  constructor(private eventBus: ExecutorEventBus, private logger: Logger) {
    this.eventBus.on(
      ExecutorEvent.pendingUserOps,
      this.onPendingUserOps.bind(this)
    );
    this.eventBus.on(
      ExecutorEvent.submittedUserOps,
      this.onSubmittedUserOps.bind(this)
    );
  }

  private events: {
    [event in ExecutorEvent]: Set<string>;
  } = {
    [ExecutorEvent.pendingUserOps]: new Set(),
    [ExecutorEvent.submittedUserOps]: new Set(),
    [ExecutorEvent.ping]: new Set(),
  };
  private listeners: { [id: string]: WebSocket } = {};

  listenPendingUserOps(socket: WebSocket): string {
    return this.listen(socket, ExecutorEvent.pendingUserOps);
  }

  listenSubmittedUserOps(socket: WebSocket): string {
    return this.listen(socket, ExecutorEvent.submittedUserOps);
  }

  listenPing(socket: WebSocket): string {
    return this.listen(socket, ExecutorEvent.ping);
  }

  unsubscribe(socket: WebSocket, id: string): void {
    delete this.listeners[id];
    for (const event in ExecutorEvent) {
      this.events[event as ExecutorEvent].delete(id);
    }
    this.logger.debug(`${id} unsubscribed`);
  }

  onPendingUserOps(entry: MempoolEntry): void {
    const { userOp, userOpHash, entryPoint, prefund, submittedTime } = entry;
    this.propagate(ExecutorEvent.pendingUserOps, {
      userOp,
      userOpHash,
      entryPoint,
      prefund,
      submittedTime,
    });
  }

  onSubmittedUserOps(entry: MempoolEntry): void {
    const { userOp, userOpHash, entryPoint, prefund, transaction } = entry;
    this.propagate(ExecutorEvent.submittedUserOps, {
      userOp,
      userOpHash,
      entryPoint,
      prefund,
      transaction,
    });
  }

  onPing(): void {
    this.propagate(ExecutorEvent.ping);
  }

  private listen(socket: WebSocket, event: ExecutorEvent): string {
    const id = this.generateEventId();
    this.listeners[id] = socket;
    this.events[event].add(id);
    this.logger.debug(`${id} subscribed for ${event}`);
    return id;
  }

  private propagate(event: ExecutorEvent, data?: object): void {
    if (data != undefined) {
      data = deepHexlify(data);
    }
    for (const id of this.events[event]) {
      const response: object = {
        jsonrpc: "2.0",
        method: "eth_subscription",
        params: {
          subscription: id,
          result: data,
        },
      };
      try {
        const socket = this.listeners[id];
        if (
          socket.readyState === WebSocket.CLOSED ||
          socket.readyState === WebSocket.CLOSING
        ) {
          this.unsubscribe(socket, id);
          return;
        }
        this.listeners[id].send(JSON.stringify(response));
      } catch (err) {
        this.logger.error(err, `Could not send event. Id: ${id}`);
      }
    }
  }

  private generateEventId(): string {
    const id = ethers.utils.hexlify(ethers.utils.randomBytes(16));
    for (const event in ExecutorEvent) {
      if (this.events[event as ExecutorEvent].has(id)) {
        // retry if id already exists
        return this.generateEventId();
      }
    }
    return id;
  }
}
