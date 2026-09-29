from fastapi import APIRouter
from app.api import health, auth, animals, observations, symptoms, expert, escalations, admin, metrics

api_router = APIRouter()

api_router.include_router(health.router, tags=["Health"])
api_router.include_router(auth.router, prefix="/auth", tags=["Auth"])
api_router.include_router(animals.router, prefix="/animals", tags=["Animals"])
api_router.include_router(observations.router, prefix="/observations", tags=["Observations"])
api_router.include_router(symptoms.router, prefix="/symptoms", tags=["Symptoms"])
api_router.include_router(expert.router, prefix="/expert", tags=["Expert"])
api_router.include_router(escalations.router, prefix="/escalations", tags=["Escalations"])
api_router.include_router(admin.router, prefix="/admin", tags=["Admin"])
api_router.include_router(metrics.router, prefix="/metrics", tags=["Metrics"])
