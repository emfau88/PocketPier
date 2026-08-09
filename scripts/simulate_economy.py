"""Deterministic Pocket Pier economy check.

The script reads the live balancing constants from the TypeScript sources and
reports the expected number of Sunny Pier trips for the first upgrade and the
boat. It is deliberately small enough to run during every balancing pass.
"""

from __future__ import annotations

import re
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def number_array(source: str, name: str) -> list[int]:
    match = re.search(rf"{name}=\[([^]]+)]", source)
    if not match:
        raise RuntimeError(f"Could not find {name}")
    return [int(value) for value in re.findall(r"\d+", match.group(1))]


def main() -> None:
    save_source = (ROOT / "src" / "core" / "SaveService.ts").read_text()
    fish_source = (ROOT / "src" / "gameplay" / "Fish.ts").read_text()
    equipment = number_array(save_source, "EQUIPMENT_COSTS")
    boat = number_array(save_source, "BOAT_REPAIR_COSTS")

    entries = re.findall(r"rarity:'(Common|Uncommon|Rare)',value:(\d+),xp:(\d+)", fish_source)
    pools: dict[str, list[tuple[int, int]]] = {rarity: [] for rarity in ("Common", "Uncommon", "Rare")}
    for rarity, coins, xp in entries:
        pools[rarity].append((int(coins), int(xp)))

    weights = {"Common": 0.55, "Uncommon": 0.34, "Rare": 0.11}
    coins_per_fish = sum(weights[rarity] * sum(coins for coins, _ in pool) / len(pool) for rarity, pool in pools.items())
    xp_per_fish = sum(weights[rarity] * sum(xp for _, xp in pool) / len(pool) for rarity, pool in pools.items())
    catches_per_trip = 4.0
    job_coins_per_trip = 27.5  # roughly one 55-coin claim every two trips
    expected_coins = coins_per_fish * catches_per_trip + job_coins_per_trip
    expected_xp = xp_per_fish * catches_per_trip + 8.0

    first_upgrade_trips = equipment[0] / expected_coins
    boat_trips = sum(boat) / expected_coins
    print(f"Expected Sunny Pier yield: {expected_coins:.1f} coins and {expected_xp:.1f} XP per trip")
    print(f"First upgrade: {equipment[0]} coins, about {first_upgrade_trips:.1f} trips")
    print(f"Full boat: {sum(boat)} coins, about {boat_trips:.1f} trips when prioritized")
    print(f"All tier-one upgrades plus boat: {sum(boat) + equipment[0] * 4} coins, about {(sum(boat) + equipment[0] * 4) / expected_coins:.1f} trips")

    if not 0.6 <= first_upgrade_trips <= 1.6:
        raise SystemExit("First upgrade is outside the 0.6-1.6 trip target")
    if not 4 <= boat_trips <= 7:
        raise SystemExit("Boat is outside the 4-7 trip target")


if __name__ == "__main__":
    main()
