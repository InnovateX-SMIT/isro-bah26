export interface Coordinate {
  lat: number;
  lon: number;
}

export interface Bounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

export interface GeospatialContext {
  dataset_id: string;
  center: Coordinate;
  bounds: Bounds;
  crs: string | null;
  epsg: number | null;
  projection: string | null;
  footprint: number[][];
}
