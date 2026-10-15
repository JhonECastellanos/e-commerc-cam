import asyncio
from weakref import WeakValueDictionary

# Only conversations with an active handler retain a lock; provider I/O for
# one customer does not serialize unrelated customers or grow this map forever.
_locks = WeakValueDictionary()


def conversation_lock(ident):
    lock = _locks.get(ident)
    if lock is None:
        lock = asyncio.Lock()
        _locks[ident] = lock
    return lock
