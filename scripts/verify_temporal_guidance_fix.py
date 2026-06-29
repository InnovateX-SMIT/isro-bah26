import sys
import os
import sqlite3
import json
import shutil
import numpy as np
import rasterio

def main():
    print("Starting verification of temporal guidance fix...")
    
    # Set database URL to point to backend/platform.db
    db_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend", "platform.db"))
    os.environ["SQLALCHEMY_DATABASE_URL"] = f"sqlite:///{db_path.replace(os.sep, '/')}"
    
    # Add backend to Python path
    sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend")))
    
    # Import all models to configure registry
    from app.core.database import init_db, SessionLocal
    init_db()
    
    from app.models.temporal_candidate import TemporalCandidate
    from app.models.selected_reference import SelectedReference
    from app.models.temporal_context import TemporalContext
    from app.models.temporal_reference_stack import TemporalReferenceStack
    
    from app.services.reconstruction.reconstruction_engine import execute_reconstruction
    from app.repositories.temporal_context_repository import TemporalContextRepository
    from app.repositories.temporal_reference_stack_repository import TemporalReferenceStackRepository
    from app.repositories.selected_reference_repository import SelectedReferenceRepository

    session_id = "586cccf2-671b-415a-83d8-3ab5f038501a"
    dataset_id = "ffc758ff-2e67-4e5a-be63-e0cc431067d3"

    db = SessionLocal()
    temporal_context_repo = TemporalContextRepository(db)
    reference_stack_repo = TemporalReferenceStackRepository(db)
    selected_reference_repo = SelectedReferenceRepository(db)

    temporal_context = temporal_context_repo.get_by_dataset(dataset_id)
    assert temporal_context is not None, "Temporal context not found in DB"

    historical_reference_path = None
    ref_stack = None
    if temporal_context and getattr(temporal_context, 'reference_stack_id', None):
        ref_stack = reference_stack_repo.get_by_id(temporal_context.reference_stack_id)
    if not ref_stack:
        ref_stack = reference_stack_repo.get_latest_by_session(session_id)

    assert ref_stack is not None, "Reference stack not found in DB"
    selected_refs = selected_reference_repo.get_by_stack(ref_stack.id)
    assert selected_refs is not None and len(selected_refs) > 0, "No selected references in stack"

    sorted_refs = sorted(selected_refs, key=lambda x: (x.rank_position, -x.ranking_score))
    top_ref = sorted_refs[0]
    cand = top_ref.candidate
    assert cand is not None, "Top selected reference candidate is None"

    cand_metadata = {}
    if cand.metadata_json:
        cand_metadata = json.loads(cand.metadata_json)

    cached_file_path = None
    for key in ["cache_path", "local_path", "tif_path", "file_path"]:
        if key in cand_metadata:
            cached_file_path = cand_metadata[key]
            break
        if "metadata" in cand_metadata and isinstance(cand_metadata["metadata"], dict) and key in cand_metadata["metadata"]:
            cached_file_path = cand_metadata["metadata"][key]
            break

    if not cached_file_path and cand.candidate_id:
        cached_file_path = f"datasets/temporal_references/{cand.candidate_id}.tif"

    assert cached_file_path is not None, "Could not construct cached file path"

    if "var/cache/temporal" in cached_file_path or "var\\cache\\temporal" in cached_file_path:
        filename = os.path.basename(cached_file_path)
        cached_file_path = f"datasets/temporal_references/{filename}"

    if cached_file_path.startswith("/") or cached_file_path.startswith("\\"):
        cached_file_path = cached_file_path[1:]

    workspace_root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    candidate_abs_path = os.path.abspath(os.path.join(workspace_root, cached_file_path))

    # Assertion 1: resolved path is not None and exists
    assert candidate_abs_path is not None, "historical_reference_path is None"
    assert os.path.exists(candidate_abs_path), f"File does not exist: {candidate_abs_path}"
    print(f"[OK] Assertion 1 passed: resolved path is {candidate_abs_path} and exists on disk.")

    # Assertion 2: Open it with rasterio, assert band std > 1.0
    with rasterio.open(candidate_abs_path) as src_ref:
        band_data = src_ref.read(1)
        band_std = float(np.std(band_data))
        print(f"[OK] Assertion 2: Historical reference band 1 std is {band_std:.4f}")
        assert band_std > 1.0, f"Band std is too low ({band_std}), imagery might be degenerate"
    print("[OK] Assertion 2 passed.")

    # Assertion 3: Run execute_reconstruction twice
    output_dir_without = os.path.join(workspace_root, "datasets", "reconstructions_test_without")
    output_dir_with = os.path.join(workspace_root, "datasets", "reconstructions_test_with")
    
    shutil.rmtree(output_dir_without, ignore_errors=True)
    shutil.rmtree(output_dir_with, ignore_errors=True)

    print("\nRunning reconstruction WITHOUT historical reference path...")
    execute_reconstruction(
        dataset_path=os.path.join(workspace_root, "datasets/demo/R2F12AUG2025074282009600051SSANSTUC00GTDD"),
        mask_path=os.path.join(workspace_root, "datasets/cloud_segmentations/ffc758ff-2e67-4e5a-be63-e0cc431067d3/reconstruction_mask.tif"),
        output_dir=output_dir_without,
        strategy="DEFAULT",
        temporal_relevance=85.0,
        provider_name="GoogleEarthEngine",
        historical_reference_path=None
    )

    print("\nRunning reconstruction WITH historical reference path...")
    execute_reconstruction(
        dataset_path=os.path.join(workspace_root, "datasets/demo/R2F12AUG2025074282009600051SSANSTUC00GTDD"),
        mask_path=os.path.join(workspace_root, "datasets/cloud_segmentations/ffc758ff-2e67-4e5a-be63-e0cc431067d3/reconstruction_mask.tif"),
        output_dir=output_dir_with,
        strategy="DEFAULT",
        temporal_relevance=85.0,
        provider_name="GoogleEarthEngine",
        historical_reference_path=candidate_abs_path
    )

    # Compare results inside the cloud mask region
    mask_file = os.path.join(workspace_root, "datasets/cloud_segmentations/ffc758ff-2e67-4e5a-be63-e0cc431067d3/reconstruction_mask.tif")
    with rasterio.open(mask_file) as src_mask:
        mask = src_mask.read(1)
        cloud_mask = (mask > 0)

    tif_without = os.path.join(output_dir_without, "reconstructed_image.tif")
    with rasterio.open(tif_without) as src_without:
        data_without = src_without.read()

    tif_with = os.path.join(output_dir_with, "reconstructed_image.tif")
    with rasterio.open(tif_with) as src_with:
        data_with = src_with.read()

    print("\nPixel analysis within the cloud-covered mask region:")
    print("-" * 50)
    
    masked_without = data_without[:, cloud_mask]
    mean_without = np.mean(masked_without, axis=1)
    std_without = np.std(masked_without, axis=1)
    print("WITHOUT historical reference:")
    print(f"  Mean across bands (B2, B3, B4): {mean_without}")
    print(f"  Std across bands (B2, B3, B4):  {std_without}")

    masked_with = data_with[:, cloud_mask]
    mean_with = np.mean(masked_with, axis=1)
    std_with = np.std(masked_with, axis=1)
    print("WITH historical reference:")
    print(f"  Mean across bands (B2, B3, B4): {mean_with}")
    print(f"  Std across bands (B2, B3, B4):  {std_with}")
    print("-" * 50)

    for b_idx in range(3):
        print(f"Band {b_idx+2} (1-based index {b_idx+1}): std without = {std_without[b_idx]:.4f}, std with = {std_with[b_idx]:.4f}")
        assert std_with[b_idx] > 1.0, f"Band {b_idx+2} 'with' std is too low ({std_with[b_idx]:.4f}), indicating a flat/degenerate patch!"

    print("\n[OK] Assertion 3 passed: 'with' run successfully injected real texture std > 1.0.")
    
    # Cleanup output dirs
    shutil.rmtree(output_dir_without, ignore_errors=True)
    shutil.rmtree(output_dir_with, ignore_errors=True)
    
    print("\nVERIFICATION STATUS: PASS")

if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        print(f"\nVERIFICATION STATUS: FAIL ({e})")
        import traceback
        traceback.print_exc()
        sys.exit(1)
