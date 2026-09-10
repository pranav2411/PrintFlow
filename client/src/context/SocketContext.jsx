import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';

const SocketContext = createContext();

export function SocketProvider({ children }) {
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    // In production or dev, connect to window.location.origin (proxied by Vite)
    const socketInstance = io(window.location.origin, {
      transports: ['websocket', 'polling']
    });

    socketInstance.on('connect', () => {
      console.log('[Socket] Connected to server:', socketInstance.id);
      setConnected(true);
    });

    socketInstance.on('disconnect', () => {
      console.log('[Socket] Disconnected');
      setConnected(false);
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
    };
  }, []);

  const joinStore = (storeId) => {
    if (socket && storeId) {
      socket.emit('join_store', storeId);
    }
  };

  const joinOrder = (orderId) => {
    if (socket && orderId) {
      socket.emit('join_order', orderId);
    }
  };

  return (
    <SocketContext.Provider value={{ socket, connected, joinStore, joinOrder }}>
      {children}
    </SocketContext.Provider>
  );
}

export const useSocket = () => useContext(SocketContext);
