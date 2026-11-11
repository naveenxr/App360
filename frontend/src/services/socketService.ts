import { io, Socket } from 'socket.io-client';
import { CLIENT_EVENTS } from '../constants/socketEvents';
import { SOCKET_BASE_URL } from '../config/api';

const BACKEND_URL = SOCKET_BASE_URL;

export type SocketConnectionState = 'connected' | 'connecting' | 'disconnected' | 'reconnecting';

class SocketService {
  private socket: Socket | null = null;
  private currentToken: string | null = null;
  private stateChangeListeners: Set<(state: SocketConnectionState, lastConnected: Date | null) => void> = new Set();
  private currentState: SocketConnectionState = 'disconnected';
  private lastConnectedAt: Date | null = null;
  private activeRooms: Set<string> = new Set();

  /**
   * Initializes or returns the existing Socket.IO connection.
   * Prevents duplicate connections if already connected with the same valid JWT token.
   * 
   * @param token - Bearer JWT authentication token
   */
  public connect(token: string): Socket | null {
    if (typeof window === 'undefined') {
      return null;
    }

    if (!token) {
      this.disconnect();
      return null;
    }

    // Reuse existing healthy socket if token has not changed
    if (this.socket && this.currentToken === token) {
      if (this.socket.connected) {
        return this.socket;
      }
      if (this.currentState === 'connecting' || this.currentState === 'reconnecting') {
        return this.socket;
      }
    }

    // Clean up previous socket if token changed
    if (this.socket) {
      this.disconnect();
    }

    this.currentToken = token;
    this.updateState('connecting');

    if (!BACKEND_URL) {
      console.error('❌ Socket.IO backend URL is not configured (set NEXT_PUBLIC_API_URL).');
      this.updateState('disconnected');
      return null;
    }

    try {
      this.socket = io(BACKEND_URL, {
        auth: { token },
        withCredentials: true,
        reconnection: true,
        reconnectionAttempts: 10,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        randomizationFactor: 0.5,
        timeout: 10000,
        transports: ['websocket', 'polling'],
        autoConnect: true
      });

      this.setupLifecycleListeners();
      return this.socket;
    } catch (err) {
      console.error('💥 Failed to initialize Socket.IO client:', err);
      this.updateState('disconnected');
      return null;
    }
  }

  private setupLifecycleListeners() {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      this.lastConnectedAt = new Date();
      this.updateState('connected');
      // Automatically resubscribe to all active rooms on connect / reconnect
      this.activeRooms.forEach((room) => {
        this.socket?.emit(CLIENT_EVENTS.SUBSCRIBE, { room });
      });
    });

    this.socket.on('disconnect', (reason) => {
      if (reason === 'io server disconnect' || reason === 'io client disconnect') {
        this.updateState('disconnected');
      } else {
        // Socket will attempt automatic reconnect
        this.updateState('reconnecting');
      }
    });

    this.socket.on('connect_error', (error) => {
      const authCodes = ['AUTHENTICATION_REQUIRED', 'INVALID_TOKEN', 'TOKEN_EXPIRED', 'ACCOUNT_DEACTIVATED'];
      const errData = (error as { data?: { code?: string } }).data;

      if (errData?.code && authCodes.includes(errData.code)) {
        console.warn(`🔒 Socket authentication rejected by server: [${errData.code}]`);
        this.disconnect();
      } else {
        this.updateState('reconnecting');
      }
    });

    this.socket.io.on('reconnect_attempt', () => {
      this.updateState('reconnecting');
    });

    this.socket.io.on('reconnect', () => {
      this.lastConnectedAt = new Date();
      this.updateState('connected');
    });

    this.socket.io.on('reconnect_failed', () => {
      this.updateState('disconnected');
    });
  }

  /**
   * Disconnects the socket gracefully and clears active state.
   */
  public disconnect() {
    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
    }
    this.currentToken = null;
    this.activeRooms.clear();
    this.updateState('disconnected');
  }

  /**
   * Subscribes to a validated monitoring or identity room.
   */
  public subscribe(room: string, callback?: (res: { success: boolean; error?: string; message?: string }) => void) {
    if (room) {
      this.activeRooms.add(room);
    }
    if (!this.socket || !this.socket.connected) {
      if (callback) callback({ success: false, error: 'NOT_CONNECTED', message: 'Socket is not connected' });
      return;
    }
    this.socket.emit(CLIENT_EVENTS.SUBSCRIBE, { room }, callback);
  }

  /**
   * Unsubscribes from a room.
   */
  public unsubscribe(room: string, callback?: (res: { success: boolean; error?: string; message?: string }) => void) {
    if (room) {
      this.activeRooms.delete(room);
    }
    if (!this.socket || !this.socket.connected) {
      if (callback) callback({ success: false, error: 'NOT_CONNECTED', message: 'Socket is not connected' });
      return;
    }
    this.socket.emit(CLIENT_EVENTS.UNSUBSCRIBE, { room }, callback);
  }

  /**
   * Sends heartbeat ping to server and receives latency round-trip.
   */
  public sendHeartbeat(callback?: (data: { receivedAt: number; serverTime: string; serverTimestamp: number }) => void) {
    if (!this.socket || !this.socket.connected) return;
    this.socket.emit(CLIENT_EVENTS.HEARTBEAT, { timestamp: Date.now() }, callback);
  }

  public getSocket(): Socket | null {
    return this.socket;
  }

  public getState(): SocketConnectionState {
    return this.currentState;
  }

  public getLastConnected(): Date | null {
    return this.lastConnectedAt;
  }

  public onStateChange(listener: (state: SocketConnectionState, lastConnected: Date | null) => void): () => void {
    this.stateChangeListeners.add(listener);
    listener(this.currentState, this.lastConnectedAt);
    return () => {
      this.stateChangeListeners.delete(listener);
    };
  }

  private updateState(newState: SocketConnectionState) {
    this.currentState = newState;
    this.stateChangeListeners.forEach((listener) => listener(this.currentState, this.lastConnectedAt));
  }
}

export const socketService = new SocketService();
export default socketService;
