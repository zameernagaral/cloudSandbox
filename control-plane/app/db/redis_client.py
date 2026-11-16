"""In-memory async Redis-compatible client for meters, scrollback, rate limits, and pub/sub."""

from __future__ import annotations

import asyncio
from collections import defaultdict
from typing import Any


class _InMemoryPipeline:
    def __init__(self, client: "InMemoryRedis") -> None:
        self._client = client
        self._ops: list[Any] = []

    def zremrangebyscore(self, key: str, min_score: float, max_score: float) -> "_InMemoryPipeline":
        self._ops.append(("zremrangebyscore", key, min_score, max_score))
        return self

    def zadd(self, key: str, mapping: dict[str, float]) -> "_InMemoryPipeline":
        self._ops.append(("zadd", key, mapping))
        return self

    def zcard(self, key: str) -> "_InMemoryPipeline":
        self._ops.append(("zcard", key))
        return self

    def expire(self, key: str, seconds: int) -> "_InMemoryPipeline":
        self._ops.append(("expire", key, seconds))
        return self

    def hincrbyfloat(self, key: str, field: str, amount: float) -> "_InMemoryPipeline":
        self._ops.append(("hincrbyfloat", key, field, amount))
        return self

    def hincrby(self, key: str, field: str, amount: int) -> "_InMemoryPipeline":
        self._ops.append(("hincrby", key, field, amount))
        return self

    async def execute(self) -> list[Any]:
        results: list[Any] = []
        for op in self._ops:
            cmd = op[0]
            if cmd == "zremrangebyscore":
                results.append(await self._client.zremrangebyscore(op[1], op[2], op[3]))
            elif cmd == "zadd":
                results.append(await self._client.zadd(op[1], op[2]))
            elif cmd == "zcard":
                results.append(await self._client.zcard(op[1]))
            elif cmd == "expire":
                results.append(True)
            elif cmd == "hincrbyfloat":
                results.append(await self._client.hincrbyfloat(op[1], op[2], op[3]))
            elif cmd == "hincrby":
                results.append(await self._client.hincrby(op[1], op[2], op[3]))
        self._ops.clear()
        return results


class _InMemoryPubSub:
    def __init__(self, client: "InMemoryRedis") -> None:
        self._client = client
        self._queue: asyncio.Queue[tuple[str, str]] = asyncio.Queue()
        self._channels: set[str] = set()

    async def subscribe(self, channel: str) -> None:
        self._channels.add(channel)
        self._client._subscribers[channel].add(self._queue)

    async def unsubscribe(self, channel: str) -> None:
        self._channels.discard(channel)
        self._client._subscribers[channel].discard(self._queue)

    async def listen(self):
        while self._channels:
            channel, data = await self._queue.get()
            yield {"type": "message", "channel": channel, "data": data}


class InMemoryRedis:
    def __init__(self) -> None:
        self._hashes: dict[str, dict[str, str]] = defaultdict(dict)
        self._lists: dict[str, list[str]] = defaultdict(list)
        self._zsets: dict[str, dict[str, float]] = defaultdict(dict)
        self._streams: dict[str, list[tuple[str, dict[str, str]]]] = defaultdict(list)
        self._subscribers: dict[str, set[asyncio.Queue[tuple[str, str]]]] = defaultdict(set)

    async def ping(self) -> bool:
        return True

    async def aclose(self) -> None:
        pass

    def pipeline(self) -> _InMemoryPipeline:
        return _InMemoryPipeline(self)

    def pubsub(self) -> _InMemoryPubSub:
        return _InMemoryPubSub(self)

    async def hgetall(self, key: str) -> dict[str, str]:
        return dict(self._hashes.get(key, {}))

    async def hset(self, key: str, mapping: dict[str, Any]) -> int:
        for k, v in mapping.items():
            self._hashes[key][k] = str(v)
        return len(mapping)

    async def hincrbyfloat(self, key: str, field: str, amount: float) -> float:
        cur = float(self._hashes[key].get(field, 0.0)) + amount
        self._hashes[key][field] = str(cur)
        return cur

    async def hincrby(self, key: str, field: str, amount: int) -> int:
        cur = int(float(self._hashes[key].get(field, 0))) + amount
        self._hashes[key][field] = str(cur)
        return cur

    async def delete(self, *keys: str) -> int:
        count = 0
        for key in keys:
            if key in self._hashes:
                del self._hashes[key]
                count += 1
            if key in self._lists:
                del self._lists[key]
                count += 1
            if key in self._zsets:
                del self._zsets[key]
                count += 1
        return count

    async def rpush(self, key: str, *values: str) -> int:
        for val in values:
            text = val.decode() if isinstance(val, bytes) else str(val)
            self._lists[key].append(text)
        return len(self._lists[key])

    async def lrange(self, key: str, start: int, end: int) -> list[str]:
        items = self._lists.get(key, [])
        if end == -1:
            return items[start:]
        return items[start : end + 1]

    async def ltrim(self, key: str, start: int, end: int) -> bool:
        items = self._lists.get(key, [])
        if end == -1:
            self._lists[key] = items[start:]
        else:
            self._lists[key] = items[start : end + 1]
        return True

    async def zadd(self, key: str, mapping: dict[str, float]) -> int:
        for member, score in mapping.items():
            self._zsets[key][member] = float(score)
        return len(mapping)

    async def zremrangebyscore(self, key: str, min_score: float, max_score: float) -> int:
        z = self._zsets.get(key, {})
        to_del = [m for m, s in z.items() if min_score <= s <= max_score]
        for m in to_del:
            del z[m]
        return len(to_del)

    async def zrangebyscore(self, key: str, min_score: float, max_score: float) -> list[str]:
        z = self._zsets.get(key, {})
        return [m for m, s in z.items() if min_score <= s <= max_score]

    async def zcard(self, key: str) -> int:
        return len(self._zsets.get(key, {}))

    async def publish(self, channel: str, message: str) -> int:
        queues = list(self._subscribers.get(channel, set()))
        for q in queues:
            await q.put((channel, message))
        return len(queues)

    async def xadd(self, stream: str, fields: dict[str, str]) -> str:
        entry_id = f"{len(self._streams[stream]) + 1}-0"
        self._streams[stream].append((entry_id, fields))
        return entry_id

    async def xread(self, streams: dict[str, str], count: int = 100, block: int = 100):
        await asyncio.sleep(min(block / 1000.0, 0.2))
        out = []
        for s_name, last_id in streams.items():
            entries = self._streams.get(s_name, [])
            if last_id == "0":
                matched = entries[:count]
            else:
                try:
                    last_num = int(last_id.split("-")[0])
                except ValueError:
                    last_num = 0
                matched = [e for e in entries if int(e[0].split("-")[0]) > last_num][:count]
            if matched:
                out.append((s_name, matched))
        return out


_redis_client: InMemoryRedis | None = None


async def get_redis() -> InMemoryRedis:
    global _redis_client
    if _redis_client is None:
        _redis_client = InMemoryRedis()
    return _redis_client


async def close_redis() -> None:
    global _redis_client
    _redis_client = None


# ── Key namespaces ────────────────────────────────────────────────────────────

def sandbox_state_key(sandbox_id: str) -> str:
    return f"sandbox:state:{sandbox_id}"

def sandbox_meters_key(sandbox_id: str) -> str:
    return f"sandbox:meters:{sandbox_id}"

def sandbox_tpm_key(sandbox_id: str) -> str:
    return f"sandbox:tpm:{sandbox_id}"

def sandbox_rpm_key(sandbox_id: str) -> str:
    return f"sandbox:rpm:{sandbox_id}"

def sandbox_scrollback_key(sandbox_id: str) -> str:
    return f"sandbox:scrollback:{sandbox_id}"

def sandbox_pubsub_channel(sandbox_id: str) -> str:
    return f"sandbox:events:{sandbox_id}"

def user_rate_limit_key(user_id: str, endpoint: str) -> str:
    return f"rate:{user_id}:{endpoint}"

def host_heartbeat_key(host_id: str) -> str:
    return f"host:heartbeat:{host_id}"

def loop_detection_key(sandbox_id: str) -> str:
    return f"sandbox:loop:{sandbox_id}"
