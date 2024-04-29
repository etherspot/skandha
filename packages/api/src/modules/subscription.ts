import { WebSocket } from "ws";
import { SubscriptionService, ExecutorEvent } from "executor/lib/services";
import RpcError from "types/lib/api/errors/rpc-error";
import * as RpcErrorCodes from "types/lib/api/errors/rpc-error-codes";

export class SubscriptionApi {
  constructor(private subscriptionService: SubscriptionService) {}

  subscribe(socket: WebSocket, event: ExecutorEvent): string {
    switch (event) {
      case ExecutorEvent.pendingUserOps: {
        return this.subscriptionService.listenPendingUserOps(socket);
      }
      case ExecutorEvent.submittedUserOps: {
        return this.subscriptionService.listenSubmittedUserOps(socket);
      }
      case ExecutorEvent.onChainUserOps: {
        return this.subscriptionService.listenOnChainUserOps(socket);
      }
      case ExecutorEvent.ping: {
        return this.subscriptionService.listenPing(socket);
      }
      default: {
        throw new RpcError(
          `Event ${event} not supported`,
          RpcErrorCodes.METHOD_NOT_FOUND
        );
      }
    }
  }

  unsubscribe(socket: WebSocket, id: string): void {
    this.subscriptionService.unsubscribe(socket, id);
  }
}
