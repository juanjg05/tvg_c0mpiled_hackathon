"""
H3 spatial index: point → hex id, hex → boundary (GeoJSON).
"""
from __future__ import annotations

import geojson
import h3
from typing import List, Tuple

from config import H3_RESOLUTION


def lat_lon_to_h3(lat: float, lon: float, res: int | None = None) -> str:
    res = res or H3_RESOLUTION
    return h3.latlng_to_cell(lat, lon, res)


def h3_to_boundary(h3_id: str) -> List[Tuple[float, float]]:
    """Returns list of (lat, lon) vertices; close the ring for GeoJSON polygon."""
    boundary = h3.cell_to_boundary(h3_id)
    # GeoJSON: first and last point same
    return list(boundary) + [boundary[0]]


def h3_to_geojson_polygon(h3_id: str) -> dict:
    """GeoJSON Polygon for one hex (single ring)."""
    coords = h3_to_boundary(h3_id)
    # GeoJSON is [lon, lat]
    ring = [[lon, lat] for lat, lon in coords]
    return {"type": "Polygon", "coordinates": [ring]}


def h3_k_ring(h3_id: str, k: int = 1) -> List[str]:
    return list(h3.grid_disk(h3_id, k))


def h3_neighbors(h3_id: str) -> List[str]:
    return list(h3.grid_disk(h3_id, 1))  # includes self
