import logging

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from psycopg.errors import UniqueViolation

logger = logging.getLogger("friendsup")


class AppError(Exception):
    def __init__(self, status_code: int, message: str):
        super().__init__(message)
        self.status_code = status_code


def register_error_handlers(app: FastAPI) -> None:
    @app.exception_handler(AppError)
    async def app_error_handler(_request: Request, error: AppError) -> JSONResponse:
        return JSONResponse(
            status_code=error.status_code,
            content={"error": str(error)},
        )

    @app.exception_handler(RequestValidationError)
    async def validation_error_handler(
        _request: Request, error: RequestValidationError
    ) -> JSONResponse:
        details = [
            {
                "path": ".".join(str(part) for part in issue["loc"]),
                "message": issue["msg"],
            }
            for issue in error.errors()
        ]
        return JSONResponse(
            status_code=400,
            content={"error": "Invalid request", "details": details},
        )

    @app.exception_handler(UniqueViolation)
    async def unique_error_handler(
        _request: Request, _error: UniqueViolation
    ) -> JSONResponse:
        return JSONResponse(
            status_code=409,
            content={"error": "A record with those details already exists"},
        )

    @app.exception_handler(Exception)
    async def unhandled_error_handler(
        _request: Request, error: Exception
    ) -> JSONResponse:
        logger.error(
            "Unhandled request error",
            exc_info=(type(error), error, error.__traceback__),
        )
        return JSONResponse(
            status_code=500,
            content={"error": "Internal server error"},
        )
