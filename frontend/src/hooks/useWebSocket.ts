/**
 * HydroPulse - Real-time WebSocket hook
 * Subscribes to live telemetry streams, anomaly alerts, and ticket updates.
 */

import { useEffect, useRef, useState, useCallback } from "react";

export interface WebSocketMessage {
  event: string;
  [key: string]: any;
}

export function useWebSocket(customUrl?: string) {
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const getWsUrl = useCallback(() => {
    if (customUrl) return customUrl;
    if (process.env.NEXT_PUBLIC_WS_URL) return process.env.NEXT_PUBLIC_WS_URL;
    if (typeof window !== "undefined") {
      const isHttps = window.location.protocol === "https:";
      const host = window.location.hostname;
      if (host === "localhost" || host === "127.0.0.1") {
        return "ws://127.0.0.1:8000/ws";
      }
      return `${isHttps ? "wss:" : "ws:"}//${window.location.host}/ws`;
    }
    return "ws://127.0.0.1:8000/ws";
  }, [customUrl]);

  const connect = useCallback(() => {
    if (typeof window === "undefined") return;

    try {
      if (socketRef.current) {
        socketRef.current.close();
      }

      const wsUrl = getWsUrl();
      const ws = new WebSocket(wsUrl);
      socketRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
        console.log("[HydroPulse WS] Connected to live telemetry stream");
      };

      ws.onmessage = (event) => {
        try {
          const data: WebSocketMessage = JSON.parse(event.data);
          setLastMessage(data);
        } catch (e) {
          // ignore non-json ping/pong
        }
      };

      ws.onclose = () => {
        setIsConnected(false);
        reconnectTimeoutRef.current = setTimeout(() => {
          connect();
        }, 3000);
      };

      ws.onerror = () => {
        ws.close();
      };
    } catch (e) {
      console.warn("[HydroPulse WS] Connection error:", e);
    }
  }, [getWsUrl]);

  useEffect(() => {
    connect();

    const pingInterval = setInterval(() => {
      if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
        socketRef.current.send("ping");
      }
    }, 15000);

    return () => {
      clearInterval(pingInterval);
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, [connect]);

  const sendMessage = useCallback((msg: any) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(typeof msg === "string" ? msg : JSON.stringify(msg));
    }
  }, []);

  return { isConnected, lastMessage, sendMessage };
}
