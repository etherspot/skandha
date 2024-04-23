import { WebSocket } from "ws";
import { ethers } from "ethers";
import { MempoolEntry } from "../entities/MempoolEntry";
import StrictEventEmitter from "strict-event-emitter-types";
import EventEmitter from "node:events";

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
  constructor(private eventBus: ExecutorEventBus) {
    this.eventBus.on(ExecutorEvent.pendingUserOps, this.onPendingUserOps);
    this.eventBus.on(ExecutorEvent.submittedUserOps, this.onSubmittedUserOps);
  }

  private events: {
    [event in ExecutorEvent]: Set<string>;
  } = {
    [ExecutorEvent.pendingUserOps]: new Set(),
    [ExecutorEvent.submittedUserOps]: new Set(),
    [ExecutorEvent.ping]: new Set(),
  };
  private listeners: {[id: string]: WebSocket} = {};

  listenPendingUserOps(socket: WebSocket): string {
    return this.listen(socket, ExecutorEvent.pendingUserOps);
  }

  listenSubmittedUserOps(socket: WebSocket): string {
    return this.listen(socket, ExecutorEvent.submittedUserOps);
  }

  listenPing(socket: WebSocket): string {
    return this.listen(socket, ExecutorEvent.ping);
  }

  unsubscribe(socket: WebSocket, id?: string) {
    if (id != undefined) {
      delete this.listeners[id];
      for (const event in ExecutorEvent) {
        this.events[event as ExecutorEvent].delete(id)
      }
    } else {
      // TODO: unsubscribe from all events 
    }
  }

  onPendingUserOps(entry: MempoolEntry): void {
    this.propagate(ExecutorEvent.pendingUserOps, {
      userOp: entry.userOp,
      userOpHash: entry.userOpHash,
      entryPoint: entry.entryPoint,
      prefund: entry.prefund,
      submittedTime: entry.submittedTime,
    });
  }

  onSubmittedUserOps(entry: MempoolEntry): void {
    this.propagate(ExecutorEvent.submittedUserOps, {
      userOp: entry.userOp,
      userOpHash: entry.userOpHash,
      entryPoint: entry.entryPoint,
      prefund: entry.prefund,
      transaction: entry.transaction,
    });
  }

  onPing(): void {
    this.propagate(ExecutorEvent.ping, {});
  }

  private listen(socket: WebSocket, event: ExecutorEvent): string {
    const id = this.generateEventId();
    this.listeners[id] = socket;
    this.events[event].add(id);
    return id;
  }

  private propagate(event: ExecutorEvent, data: any) {
    for (const id of this.events[event]) {
      const response = {
        jsonrpc: "2.0",
        method: "eth_subscription",
        params: {
          subscription: id,
          result: {
            ...data
          }
        }
      }
      this.listeners[id].send(response);
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
