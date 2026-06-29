import sys
import os
import sqlite3
import json
import numpy as np
import rasterio

def main():
    print("Starting verification of Batch B E2E Flow...")
    
    db_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend", "platform.db"))
    os.environ["SQLALCHEMY_DATABASE_URL"] = f"sqlite:///{db_path.replace(os.sep, '/')}"
    
    sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend")))
    
    from app.core.database import init_db, SessionLocal
    init_db()
    
    from app.models.temporal_candidate import TemporalCandidate
    from app.models.selected_reference import SelectedReference
    from app.models.temporal_context import TemporalContext
    from app.models.temporal_reference_stack import TemporalReferenceStack
    
    from app.services.temporal_service import TemporalService
    from app.services.reconstruction_service import ReconstructionService
    from app.api.v1.reconstruction import get_reconstruction_service
    
    db = SessionLocal()
    
    # 1. Query the dataset and active session ID dynamically
    conn = sqlite3.connect(db_path)
    sqlite_cursor = conn.cursor()
    sqlite_cursor.execute("SELECT dataset_id, analysis_session_id FROM datasets LIMIT 1")
    row = sqlite_cursor.fetchone()
    assert row is not None, "No datasets found in database"
    dataset_id, session_id = row
    print(f"[OK] Found dataset ID: {dataset_id}, Session ID: {session_id}")
    
    # 2. Test Historical Reference Viewer Preview End-to-End
    # Find active references
    sqlite_cursor.execute(
        "SELECT tc.id, tc.candidate_id FROM selected_references sr "
        "JOIN temporal_reference_stacks trs ON sr.reference_stack_id = trs.id "
        "JOIN temporal_candidates tc ON sr.candidate_id = tc.id "
        "WHERE trs.session_id = ? LIMIT 1", (session_id,)
    )
    cand_row = sqlite_cursor.fetchone()
    assert cand_row is not None, "No selected references found for session"
    candidate_db_id, candidate_str_id = cand_row
    print(f"[OK] Found selected reference candidate database ID: {candidate_db_id}, string ID: {candidate_str_id}")
    
    # Instantiate TemporalService and generate preview PNG
    temporal_service = TemporalService()
    candidate = db.query(TemporalCandidate).filter(TemporalCandidate.id == candidate_db_id).first()
    assert candidate is not None, "Candidate record not found in database"
    
    preview_png_path = temporal_service.get_candidate_preview_path(candidate)
    print(f"[OK] Dynamic reference preview generated at: {preview_png_path}")
    assert os.path.exists(preview_png_path), f"Preview PNG file does not exist: {preview_png_path}"
    
    # Read dynamic reference preview to assert not empty/black
    from PIL import Image
    img = Image.open(preview_png_path)
    img_data = np.array(img)
    assert img_data.shape[2] == 3, "Preview must be RGB image"
    assert np.max(img_data) > 10, "Preview image is completely black"
    print(f"[OK] Reference preview PNG is valid, RGB shape={img_data.shape}, max pixel value={np.max(img_data)}")
    
    # 3. Trigger Reconstruction Pipeline dynamically
    reconstruction_service = get_reconstruction_service(db)
    print("Running reconstruction pipeline orchestration...")
    recon_response = reconstruction_service.run_reconstruction_pipeline(session_id=session_id, strategy="DEFAULT")
    print(f"[OK] Reconstruction run completed with status: {recon_response.run.reconstruction_status}")
    
    # Assert generated output files exist
    recon_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "datasets", "reconstructions", dataset_id))
    expected_files = [
        "reconstructed_image.tif",
        "reconstruction_preview.png",
        "reconstruction_thumbnail.png",
        "reconstruction_metadata.json"
    ]
    for filename in expected_files:
        filepath = os.path.join(recon_dir, filename)
        assert os.path.exists(filepath), f"Expected reconstruction file {filename} not found at {filepath}"
    print(f"[OK] All expected reconstruction files exist on disk.")
    
    # 4. Measure reconstructed_image.tif pixel statistics
    tif_path = os.path.join(recon_dir, "reconstructed_image.tif")
    mask_file = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "datasets", "cloud_segmentations", dataset_id, "reconstruction_mask.tif"))
    
    with rasterio.open(mask_file) as src_mask:
        mask = src_mask.read(1)
        cloud_mask = (mask > 0)
        
    with rasterio.open(tif_path) as src_recon:
        data_recon = src_recon.read()
        print(f"[OK] Reconstructed raster shape: {data_recon.shape}, CRS: {src_recon.crs}, transform: {src_recon.transform}")
        
    # Analyze masked region
    masked_pixels = data_recon[:, cloud_mask]
    mean_val = np.mean(masked_pixels, axis=1)
    std_val = np.std(masked_pixels, axis=1)
    print(f"Masked region reconstructed pixel stats:")
    print(f"  Mean across bands (B2, B3, B4): {mean_val}")
    print(f"  Std across bands (B2, B3, B4):  {std_val}")
    
    # Assert pixels are not flat/black
    for b_idx in range(3):
        assert mean_val[b_idx] > 10.0, f"Band {b_idx+2} mean is too low ({mean_val[b_idx]:.4f}), collapsed to zero!"
        assert std_val[b_idx] > 5.0, f"Band {b_idx+2} standard deviation is too low ({std_val[b_idx]:.4f}), flat black patch!"
    print(f"[OK] Reconstructed image pixel stats are valid and non-degenerate.")
    
    # Assert preview PNG is not completely black
    preview_path = os.path.join(recon_dir, "reconstruction_preview.png")
    recon_img = Image.open(preview_path)
    recon_img_data = np.array(recon_img)
    print(f"Reconstruction preview max pixel value: {np.max(recon_img_data)}")
    assert np.max(recon_img_data) > 10, "Reconstruction preview PNG is completely black!"
    print(f"[OK] Reconstruction preview PNG is valid.")
    
    # 5. Run Post-Processing Optimization
    print("Running reconstruction optimization post-processing...")
    opt_response = reconstruction_service.run_reconstruction_optimization(session_id=session_id)
    print(f"[OK] Optimization run completed with status: {opt_response['run'].optimization_status}")
    
    # Assert optimized files exist
    optimized_expected_files = [
        "optimized_reconstruction.tif",
        "optimized_preview.png"
    ]
    for filename in optimized_expected_files:
        filepath = os.path.join(recon_dir, filename)
        assert os.path.exists(filepath), f"Expected optimized file {filename} not found at {filepath}"
    print(f"[OK] All expected optimized files exist on disk.")
    
    # Assert optimized preview PNG is not completely black
    opt_preview_path = os.path.join(recon_dir, "optimized_preview.png")
    opt_img = Image.open(opt_preview_path)
    opt_img_data = np.array(opt_img)
    print(f"Optimized preview max pixel value: {np.max(opt_img_data)}")
    assert np.max(opt_img_data) > 10, "Optimized preview PNG is completely black!"
    print(f"[OK] Optimized preview PNG is valid.")
    
    # 6. Score Normalization verification
    # Query database to assert that the score stored in SelectedReference table is within normal 0-100 range
    sqlite_cursor.execute("SELECT ranking_score FROM selected_references LIMIT 1")
    score_row = sqlite_cursor.fetchone()
    assert score_row is not None, "No score row found"
    score = score_row[0]
    print(f"[OK] Selected reference ranking score in DB: {score}")
    assert 0.0 <= score <= 100.0, f"Database score {score} is out of normal range [0, 100]"
    
    print("\nBATCH B E2E VERIFICATION STATUS: PASS")

if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        print(f"\nBATCH B E2E VERIFICATION STATUS: FAIL ({e})")
        import traceback
        traceback.print_exc()
        sys.exit(1)
