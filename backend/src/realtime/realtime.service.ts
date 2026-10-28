import { Injectable } from '@nestjs/common';
import type { Server } from 'socket.io';
import type { AuthUser } from '../common/decorators/auth.decorators.js';
import { STAFF_ROOM, userRoom } from './realtime.events.js';

/**
 * Sends events to connected sockets. Other modules use this instead of the
 * gateway, so they don't depend on Socket.IO directly.
 *
 * Rooms live in this process's memory. Running more than one backend instance
 * needs the Socket.IO Redis adapter so emits reach sockets on other instances.
 */
@Injectable()
export class RealtimeService {
  private server: Server | null = null;
  private readonly pending = new Map<string, NodeJS.Timeout>();

  /** Called once by RealtimeGateway when the Socket.IO server is ready. */
  attach(server: Server): void {
    this.server = server;
  }

  /** Every connected socket, signed in as anyone. */
  emitToAll(event: string, payload: unknown): void {
    this.server?.emit(event, payload);
  }

  /**
   * emitToAll, at most once per `delayMs`: the last call wins. For changes that come
   * in bursts, e.g. saving an option group is several requests but one menu change.
   */
  emitToAllSoon(event: string, payload: () => unknown, delayMs = 500): void {
    clearTimeout(this.pending.get(event));
    this.pending.set(
      event,
      setTimeout(() => {
        this.pending.delete(event);
        this.emitToAll(event, payload());
      }, delayMs),
    );
  }

  emitToUser(userId: string, event: string, payload: unknown): void {
    this.server?.to(userRoom(userId)).emit(event, payload);
  }

  emitToStaff(event: string, payload: unknown): void {
    this.server?.to(STAFF_ROOM).emit(event, payload);
  }

  /** Emits once to the union of the user's room and the staff room (no duplicates for staff who are also that user). */
  emitToUserAndStaff(userId: string, event: string, payload: unknown): void {
    this.server?.to([userRoom(userId), STAFF_ROOM]).emit(event, payload);
  }

  async isUserOnline(userId: string): Promise<boolean> {
    if (!this.server) return false;
    const sockets = await this.server.in(userRoom(userId)).fetchSockets();
    return sockets.length > 0;
  }

  /** Ids of staff/admin users with at least one connected socket. */
  async onlineStaffIds(): Promise<Set<string>> {
    if (!this.server) return new Set();
    const sockets = await this.server.in(STAFF_ROOM).fetchSockets();
    return new Set(sockets.map((s) => (s.data as { user: AuthUser }).user.id));
  }
}
