import ee
import datetime
import requests
import os
from typing import List, Dict, Any
from app.services.temporal.providers.base import TemporalProvider
from app.schemas.temporal import TemporalReferenceCandidate
from app.services.geospatial.utils import parse_date_safely

class GoogleEarthEngineProvider(TemporalProvider):
    """
    Google Earth Engine provider implementation for discovering and retrieving historical imagery context.
    Uses real ee package queries and downloads GEE image collections with fallback options.
    """

    @property
    def name(self) -> str:
        return "GoogleEarthEngine"

    @property
    def is_primary(self) -> bool:
        return True

    @property
    def description(self) -> str:
        return "Google Earth Engine multi-spectral historical imagery catalog provider"

    def health_check(self) -> bool:
        """
        Runs connection check to verify Earth Engine API service is reachable.
        """
        try:
            ee.Initialize(project='isro-bah26')
            return True
        except Exception:
            return False

    def search_imagery(
        self,
        coordinates: Dict[str, float],
        bounding_box: List[List[float]],
        acquisition_date: str
    ) -> List[TemporalReferenceCandidate]:
        """
        Query the GEE catalog dynamically for LISS-IV matching scenes.
        Uses progressive search windows and lowest-cloud fallbacks.
        """
        try:
            ee.Initialize(project='isro-bah26')
        except Exception as e:
            print(f"[Error] ee.Initialize failed in search_imagery: {e}")
            return []

        # Parse target date
        try:
            target_date = parse_date_safely(acquisition_date)
        except Exception as date_err:
            print(f"[Error] Date parsing failed for {acquisition_date}: {date_err}")
            return []

        min_lon, min_lat = bounding_box[0]
        max_lon, max_lat = bounding_box[1]
        geom = ee.Geometry.Rectangle(min_lon, min_lat, max_lon, max_lat)
        center_geom = ee.Geometry.Point(coordinates['lon'], coordinates['lat'])

        windows = [90, 180, 365]
        candidates = []
        
        # We will try to find scenes with cloud cover < 30% first in progressive windows
        found_good_scene = False
        for days in windows:
            start_date = (target_date - datetime.timedelta(days=days)).strftime('%Y-%m-%d')
            end_date = (target_date + datetime.timedelta(days=days)).strftime('%Y-%m-%d')
            
            # Query Landsat 8
            try:
                l8_coll = (
                    ee.ImageCollection('LANDSAT/LC08/C02/T1_L2')
                    .filterBounds(center_geom)
                    .filterDate(start_date, end_date)
                    .filter(ee.Filter.lt('CLOUD_COVER', 30))
                    .sort('CLOUD_COVER')
                )
                l8_list = l8_coll.limit(3).getInfo().get('features', [])
                if l8_list:
                    found_good_scene = True
                    for feat in l8_list:
                        cid = feat['id']
                        props = feat['properties']
                        t_ms = props.get('system:time_start')
                        acq = datetime.datetime.fromtimestamp(t_ms / 1000.0, datetime.UTC).strftime('%Y-%m-%d')
                        cc = float(props.get('CLOUD_COVER', 0.0))
                        candidates.append(
                            TemporalReferenceCandidate(
                                candidate_id=cid,
                                provider_name=self.name,
                                acquisition_date=acq,
                                cloud_cover=cc,
                                spatial_overlap=100.0,
                                preview_url=f"https://earthengine.googleapis.com/v1/{cid}/preview",
                                metadata={
                                    "sensor": "Landsat-8",
                                    "path_row": f"{props.get('WRS_PATH')}_{props.get('WRS_ROW')}",
                                    "cloud_pixels_percentage": cc,
                                    "usable_bands": ["SR_B4", "SR_B3", "SR_B2"],
                                    "expanded_bbox": bounding_box
                                }
                            )
                        )
            except Exception as e:
                print(f"[Warning] Landsat-8 query failed for ±{days} days: {e}")

            # Query Sentinel-2
            try:
                s2_coll = (
                    ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
                    .filterBounds(center_geom)
                    .filterDate(start_date, end_date)
                    .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 30))
                    .sort('CLOUDY_PIXEL_PERCENTAGE')
                )
                s2_list = s2_coll.limit(3).getInfo().get('features', [])
                if s2_list:
                    found_good_scene = True
                    for feat in s2_list:
                        cid = feat['id']
                        props = feat['properties']
                        t_ms = props.get('system:time_start')
                        acq = datetime.datetime.fromtimestamp(t_ms / 1000.0, datetime.UTC).strftime('%Y-%m-%d')
                        cc = float(props.get('CLOUDY_PIXEL_PERCENTAGE', 0.0))
                        candidates.append(
                            TemporalReferenceCandidate(
                                candidate_id=cid,
                                provider_name=self.name,
                                acquisition_date=acq,
                                cloud_cover=cc,
                                spatial_overlap=100.0,
                                preview_url=f"https://earthengine.googleapis.com/v1/{cid}/preview",
                                metadata={
                                    "sensor": "Sentinel-2",
                                    "tile_id": props.get('MGRS_TILE', ''),
                                    "cloud_pixels_percentage": cc,
                                    "usable_bands": ["B4", "B3", "B2"],
                                    "expanded_bbox": bounding_box
                                }
                            )
                        )
            except Exception as e:
                print(f"[Warning] Sentinel-2 query failed for ±{days} days: {e}")
            
            if found_good_scene:
                break

        # Absolute fallback: if no scene was found under 30% cloud cover across all windows,
        # fetch the absolute lowest cloud cover image in the widest ±365 days window.
        if not candidates:
            print("[Warning] No scene found under 30% cloud cover. Running absolute fallback...")
            start_date_fb = (target_date - datetime.timedelta(days=365)).strftime('%Y-%m-%d')
            end_date_fb = (target_date + datetime.timedelta(days=365)).strftime('%Y-%m-%d')
            
            # Try Landsat-8 lowest cloud cover scene
            try:
                l8_coll_fb = (
                    ee.ImageCollection('LANDSAT/LC08/C02/T1_L2')
                    .filterBounds(center_geom)
                    .filterDate(start_date_fb, end_date_fb)
                    .sort('CLOUD_COVER')
                )
                l8_list_fb = l8_coll_fb.limit(1).getInfo().get('features', [])
                if l8_list_fb:
                    feat = l8_list_fb[0]
                    cid = feat['id']
                    props = feat['properties']
                    t_ms = props.get('system:time_start')
                    acq = datetime.datetime.fromtimestamp(t_ms / 1000.0, datetime.UTC).strftime('%Y-%m-%d')
                    cc = float(props.get('CLOUD_COVER', 0.0))
                    candidates.append(
                        TemporalReferenceCandidate(
                            candidate_id=cid,
                            provider_name=self.name,
                            acquisition_date=acq,
                            cloud_cover=cc,
                            spatial_overlap=100.0,
                            preview_url=f"https://earthengine.googleapis.com/v1/{cid}/preview",
                            metadata={
                                "sensor": "Landsat-8",
                                "path_row": f"{props.get('WRS_PATH')}_{props.get('WRS_ROW')}",
                                "cloud_pixels_percentage": cc,
                                "usable_bands": ["SR_B4", "SR_B3", "SR_B2"],
                                "expanded_bbox": bounding_box
                            }
                        )
                    )
            except Exception as e:
                print(f"[Error] Fallback Landsat-8 search failed: {e}")

            # Try Sentinel-2 lowest cloud cover scene
            try:
                s2_coll_fb = (
                    ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
                    .filterBounds(center_geom)
                    .filterDate(start_date_fb, end_date_fb)
                    .sort('CLOUDY_PIXEL_PERCENTAGE')
                )
                s2_list_fb = s2_coll_fb.limit(1).getInfo().get('features', [])
                if s2_list_fb:
                    feat = s2_list_fb[0]
                    cid = feat['id']
                    props = feat['properties']
                    t_ms = props.get('system:time_start')
                    acq = datetime.datetime.fromtimestamp(t_ms / 1000.0, datetime.UTC).strftime('%Y-%m-%d')
                    cc = float(props.get('CLOUDY_PIXEL_PERCENTAGE', 0.0))
                    candidates.append(
                        TemporalReferenceCandidate(
                            candidate_id=cid,
                            provider_name=self.name,
                            acquisition_date=acq,
                            cloud_cover=cc,
                            spatial_overlap=100.0,
                            preview_url=f"https://earthengine.googleapis.com/v1/{cid}/preview",
                            metadata={
                                "sensor": "Sentinel-2",
                                "tile_id": props.get('MGRS_TILE', ''),
                                "cloud_pixels_percentage": cc,
                                "usable_bands": ["B4", "B3", "B2"],
                                "expanded_bbox": bounding_box
                            }
                        )
                    )
            except Exception as e:
                print(f"[Error] Fallback Sentinel-2 search failed: {e}")

        # Sort candidates by cloud cover
        candidates.sort(key=lambda x: x.cloud_cover)
        return candidates

    def get_reference(self, candidate_id: str) -> Dict[str, Any]:
        """
        Retrieves specific reference context details for a candidate scene ID.
        """
        return {
            "candidate_id": candidate_id,
            "provider_name": self.name,
            "status": "retrieved",
            "download_url": f"https://earthengine.googleapis.com/v1/assets/{candidate_id}/download",
            "metadata": {
                "sensor_type": "optical",
                "projection": "EPSG:4326"
            }
        }

    def download_image(self, candidate_id: str, dest_path: str, bounding_box: List[List[float]]) -> None:
        """
        Fetches Red, Green, Blue bands for candidate ID, applies proper Surface Reflectance scaling,
        and downloads the visual composite GeoTIFF locally.
        """
        try:
            ee.Initialize(project='isro-bah26')
        except Exception as e:
            raise RuntimeError(f"ee.Initialize failed in download_image: {e}")

        min_lon, min_lat = bounding_box[0]
        max_lon, max_lat = bounding_box[1]
        geom = ee.Geometry.Rectangle(min_lon, min_lat, max_lon, max_lat)

        img = ee.Image(candidate_id)
        acq_date = ee.Date(img.get('system:time_start'))
        start_date = acq_date.advance(-15, 'day')
        end_date = acq_date.advance(15, 'day')

        if "LANDSAT" in candidate_id:
            # Landsat-8 Level 2 Surface Reflectance bands: SR_B4 (Red), SR_B3 (Green), SR_B2 (Blue)
            coll = (
                ee.ImageCollection('LANDSAT/LC08/C02/T1_L2')
                .filterBounds(geom)
                .filterDate(start_date, end_date)
                .filter(ee.Filter.lt('CLOUD_COVER', 30))
            )
            coll_sorted = coll.sort('CLOUD_COVER', False)
            img_rgb_coll = coll_sorted.select(['SR_B4', 'SR_B3', 'SR_B2'])
            img_mosaic = img_rgb_coll.mosaic()
            mask = img_mosaic.gt(0)
            img_final = img_mosaic.multiply(0.0000275).subtract(0.2).updateMask(mask)
        else:
            # Sentinel-2 Surface Reflectance bands: B4 (Red), B3 (Green), B2 (Blue)
            coll = (
                ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
                .filterBounds(geom)
                .filterDate(start_date, end_date)
                .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 30))
            )
            coll_sorted = coll.sort('CLOUDY_PIXEL_PERCENTAGE', False)
            img_rgb_coll = coll_sorted.select(['B4', 'B3', 'B2'])
            img_mosaic = img_rgb_coll.mosaic()
            mask = img_mosaic.gt(0)
            img_final = img_mosaic.multiply(0.0001).updateMask(mask)

        # Scale set to 200m for fast download and to stay within Earth Engine's payload limits
        url = img_final.getDownloadURL({
            'scale': 200,
            'crs': 'EPSG:4326',
            'region': geom,
            'format': 'GEO_TIFF'
        })

        res = requests.get(url, timeout=120)
        if res.status_code != 200:
            raise RuntimeError(f"GEE download request failed with status {res.status_code}: {res.text}")

        # Ensure directory structure exists
        os.makedirs(os.path.dirname(os.path.abspath(dest_path)), exist_ok=True)
        with open(dest_path, "wb") as f:
            f.write(res.content)
        print(f"GEE image successfully saved to {dest_path}")
