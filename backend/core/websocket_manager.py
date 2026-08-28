"""
AquaWatch - Real-time WebSocket Connection Manager
Handles bi-directional real-time telemetry streaming, live anomaly broadcast alerts,
and maintenance ticket state synchronization across connected clients.
"""

from typing import List, Dict, Any
import json
import logging
from fastapi import WebSocket

logger = logging.getLogger("aquawatch.ws")


class ConnectionManager:
    def __init__(self):
        # Active connected WebSocket clients
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        """Accepts and registers a new WebSocket connection."""
        await websocket.accept()
        self.active_connections.append(websocket)
        logger.info(f"WebSocket client connected. Total clients: {len(self.active_connections)}")

    def disconnect(self, websocket: WebSocket):
        """Removes a disconnected client."""
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
            logger.info(f"WebSocket client disconnected. Total clients: {len(self.active_connections)}")

    async def broadcast_json(self, message: Dict[str, Any]):
        """Broadcasts a JSON message payload to all currently connected dashboard clients."""
        if not self.active_connections:
            return

        dead_connections = []
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except Exception as e:
                logger.warning(f"Error sending message to websocket client: {e}")
                dead_connections.append(connection)

        # Clean up dead sockets
        for dead in dead_connections:
            self.disconnect(dead)

    async def send_personal_message(self, message: Dict[str, Any], websocket: WebSocket):
        """Sends a direct message to a specific connection."""
        try:
            await websocket.send_json(message)
        except Exception as e:
            logger.warning(f"Error sending personal message: {e}")
            self.disconnect(websocket)


# Global WebSocket connection manager singleton
ws_manager = ConnectionManager()
