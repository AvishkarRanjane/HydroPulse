"""
AquaWatch - Urban Water Leakage & Loss Detection System
FastAPI Backend Application Entrypoint
"""

import os
import asyncio
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from models.database import engine, Base, SessionLocal
from core.websocket_manager import ws_manager
from api.auth import router as auth_router
from api.zones import router as zones_router
from api.ingestion import router as ingestion_router, simulate_tick
from api.anomalies import router as anomalies_router
from api.maintenance import router as maintenance_router
from api.citizen_reports import router as citizen_router
from db.seed_data import seed_database

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("aquawatch.main")

# Background simulation runner task
simulation_task = None
SIMULATION_ACTIVE = True
SIMULATION_INTERVAL_SECONDS = 15 # Periodically tick telemetry to keep dashboard alive


async def background_telemetry_loop():
    """Background coroutine that periodically ticks the water network simulation."""
    logger.info("Starting background telemetry simulation loop...")
    while SIMULATION_ACTIVE:
        try:
            await asyncio.sleep(SIMULATION_INTERVAL_SECONDS)
            db = SessionLocal()
            try:
                # Run tick in background
                from fastapi import BackgroundTasks
                bg = BackgroundTasks()
                await simulate_tick(bg, db)
                # Execute any scheduled background tasks (like ws broadcasts)
                for task in bg.tasks:
                    await task()
            finally:
                db.close()
        except asyncio.CancelledError:
            logger.info("Background simulation loop cancelled.")
            break
        except Exception as e:
            logger.warning(f"Simulation tick error: {e}")
            await asyncio.sleep(5)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan context manager for startup and shutdown events."""
    logger.info("Starting AquaWatch Backend Engine...")
    Base.metadata.create_all(bind=engine)
    
    # Auto-seed database if empty
    db = SessionLocal()
    from models.models import Zone
    if db.query(Zone).count() == 0:
        logger.info("Database empty, running initial seed...")
        seed_database()
    db.close()

    # Start background telemetry generator if not in testing mode
    global simulation_task
    if os.getenv("TESTING") != "true":
        simulation_task = asyncio.create_task(background_telemetry_loop())

    yield

    # Shutdown
    logger.info("Shutting down AquaWatch Backend...")
    if simulation_task:
        simulation_task.cancel()


app = FastAPI(
    title="AquaWatch API",
    description="Urban Water Leakage & Loss Detection System Backend",
    version="1.0.0",
    lifespan=lifespan
)

# Enable CORS for Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Uploads directory
uploads_path = os.path.join(os.path.dirname(__file__), "uploads")
os.makedirs(uploads_path, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=uploads_path), name="uploads")

# Mount API Routers
app.include_router(auth_router)
app.include_router(zones_router)
app.include_router(ingestion_router)
app.include_router(anomalies_router)
app.include_router(maintenance_router)
app.include_router(citizen_router)


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """
    Live WebSocket pub/sub stream endpoint for real-time dashboard telemetry,
    anomaly alert notifications, and ticket updates.
    """
    await ws_manager.connect(websocket)
    try:
        # Send initial handshake message
        await websocket.send_json({
            "event": "connected",
            "message": "Connected to AquaWatch Real-Time Telemetry Stream",
            "system_time": asyncio.get_event_loop().time()
        })
        while True:
            # Keep socket alive and receive client messages / pings
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_json({"event": "pong"})
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)
    except Exception as e:
        logger.warning(f"WebSocket client error: {e}")
        ws_manager.disconnect(websocket)


@app.get("/")
def root():
    return {
        "system": "AquaWatch Urban Water Leakage & Loss Detection System",
        "status": "Online",
        "docs_url": "/docs",
        "version": "1.0.0"
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
