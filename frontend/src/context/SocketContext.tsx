'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';
import socketService, { SocketConnectionState } from '../services/socketService';

interface SocketContextType {
  socket: Socket | null;
  connectionState: SocketConnectionState;
  lastConnectedAt: Date | null;
  subscribe: (room: string, callback?: (res: { success: boolean; error?: string; message?: string }) => void) => void;
  unsubscribe: (room: string, callback?: (res: { success: boolean; error?: string; message?: string }) => void) => void;
  sendHeartbeat: (callback?: (data: { receivedAt: number; serverTime: string; serverTimestamp: number }) => void) => void;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const { token, isAuthenticated } = useAuth();
  const [connectionState, setConnectionState] = useState<SocketConnectionState>(socketService.getState());
  const [lastConnectedAt, setLastConnectedAt] = useState<Date | null>(socketService.getLastConnected());
  const [activeSocket, setActiveSocket] = useState<Socket | null>(socketService.getSocket());

  // Listen to socket connection state changes
  useEffect(() => {
    const unsubscribeState = socketService.onStateChange((state, lastConnected) => {
      setConnectionState(state);
      setLastConnectedAt(lastConnected);
      setActiveSocket(socketService.getSocket());
    });

    return () => {
      unsubscribeState();
    };
  }, []);

  // Connect or disconnect socket when authentication state changes
  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (isAuthenticated && token) {
      const sock = socketService.connect(token);
      setActiveSocket(sock);
    } else {
      socketService.disconnect();
      setActiveSocket(null);
    }
  }, [isAuthenticated, token]);

  const subscribe = useCallback((room: string, callback?: (res: { success: boolean; error?: string; message?: string }) => void) => {
    socketService.subscribe(room, callback);
  }, []);

  const unsubscribe = useCallback((room: string, callback?: (res: { success: boolean; error?: string; message?: string }) => void) => {
    socketService.unsubscribe(room, callback);
  }, []);

  const sendHeartbeat = useCallback((callback?: (data: { receivedAt: number; serverTime: string; serverTimestamp: number }) => void) => {
    socketService.sendHeartbeat(callback);
  }, []);

  return (
    <SocketContext.Provider
      value={{
        socket: activeSocket,
        connectionState,
        lastConnectedAt,
        subscribe,
        unsubscribe,
        sendHeartbeat
      }}
    >
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket(): SocketContextType {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
}
