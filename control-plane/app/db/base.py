"""Lightweight database session dependency stub for FastAPI routes and tests."""

from __future__ import annotations

from typing import AsyncIterator


class Base:
    pass


class _DummySession:
    async def commit(self) -> None:
        pass

    async def rollback(self) -> None:
        pass

    async def flush(self) -> None:
        pass

    async def __aenter__(self) -> "_DummySession":
        return self

    async def __aexit__(self, *args: object) -> None:
        pass


def AsyncSessionLocal() -> _DummySession:
    return _DummySession()


async def get_db() -> AsyncIterator[_DummySession]:
    yield _DummySession()
