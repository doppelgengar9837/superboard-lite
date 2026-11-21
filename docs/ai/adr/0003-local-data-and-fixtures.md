# 0003 Local data and fixture sources

Date: 2026-11-21. Status: accepted.

- Data lives in the browser (IndexedDB) behind repository interfaces. No backend, accounts or hosted database.
- Widget sources are built-in fixture pages whose content is a pure function of (source id, clock time). A widget is a snapshot of a region; refreshing recomputes from the current clock and adds a version only when content changed.
- Real websites are never part of the verification loop (unstable, anti-bot, terms of service).
- Schema changes and migrations are Tier 2.
