"""
AI Service entrypoint.

FastAPI composition root: wires up the app and includes routers. All
business logic lives under `app/` (services, models, utils) so this
file stays a thin entrypoint. `POST /api/analyze` (see
`app.api.analyze_router`) and `POST /api/candidate/identify` (see
`app.api.candidate_router`) are the integration points consumed by the
Node.js backend's reusable AI client; the other routers remain
available for exercising the pipeline in isolation.
"""

from dotenv import load_dotenv

load_dotenv()

from fastapi import FastAPI

from app.api.analyze_router import router as analyze_router
from app.api.candidate_router import router as candidate_router
from app.api.confidence_router import router as confidence_router
from app.api.features_router import router as features_router

app = FastAPI(
    title="Sherlock AI Service",
    description="AI microservice for the Sherlock Internship Challenge.",
    version="0.5.0",
)


@app.get("/health")
def health_check():
    """Basic liveness check."""
    return {"status": "ok", "service": "sherlock-ai-service"}


app.include_router(features_router)
app.include_router(confidence_router)
app.include_router(analyze_router)
app.include_router(candidate_router)
