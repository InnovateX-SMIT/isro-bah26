import os
import logging
import numpy as np

logger = logging.getLogger("reconstruction_model")

# Soft imports to support modular fallback if PyTorch or ONNX Runtime is not installed
TORCH_AVAILABLE = False
ONNX_AVAILABLE = False

try:
    import torch
    import torch.nn as nn
    import torch.optim as optim
    TORCH_AVAILABLE = True
except ImportError:
    torch = None
    nn = None
    optim = None

try:
    import onnxruntime as ort
    ONNX_AVAILABLE = True
except ImportError:
    ort = None


if TORCH_AVAILABLE:
    class LISS4ReconstructionNet(nn.Module):
        """
        Generative AI Reconstruction U-Net architecture for LISS-IV Satellite Imagery.
        Fuses:
        - Masked input bands B2, B3, B4 (3 channels)
        - Binary reconstruction mask (1 channel)
        - Temporal guidance composite (3 channels)
        Total input channels = 7. Outputs restored bands (3 channels).
        Uses skip connections to preserve edge boundaries, road continuity, and river networks.
        """
        def __init__(self, in_channels: int = 7, out_channels: int = 3):
            super(LISS4ReconstructionNet, self).__init__()
            
            # Encoder
            self.enc1 = nn.Sequential(
                nn.Conv2d(in_channels, 32, kernel_size=3, padding=1),
                nn.BatchNorm2d(32),
                nn.ReLU(inplace=True)
            )
            self.enc2 = nn.Sequential(
                nn.Conv2d(32, 64, kernel_size=3, stride=2, padding=1),  # H/2, W/2
                nn.BatchNorm2d(64),
                nn.ReLU(inplace=True)
            )
            self.enc3 = nn.Sequential(
                nn.Conv2d(64, 128, kernel_size=3, stride=2, padding=1), # H/4, W/4
                nn.BatchNorm2d(128),
                nn.ReLU(inplace=True)
            )
            
            # Decoder
            self.up2 = nn.Upsample(scale_factor=2, mode='bilinear', align_corners=True)
            self.dec2 = nn.Sequential(
                nn.Conv2d(128 + 64, 64, kernel_size=3, padding=1), # Concats enc2
                nn.BatchNorm2d(64),
                nn.ReLU(inplace=True)
            )
            
            self.up1 = nn.Upsample(scale_factor=2, mode='bilinear', align_corners=True)
            self.dec1 = nn.Sequential(
                nn.Conv2d(64 + 32, 32, kernel_size=3, padding=1), # Concats enc1
                nn.BatchNorm2d(32),
                nn.ReLU(inplace=True)
            )
            
            self.out_conv = nn.Sequential(
                nn.Conv2d(32, out_channels, kernel_size=3, padding=1),
                nn.Sigmoid() # Restores values to [0, 1]
            )

        def forward(self, x):
            e1 = self.enc1(x)
            e2 = self.enc2(e1)
            e3 = self.enc3(e2)
            
            u2 = self.up2(e3)
            # Match dimensions if odd padding issues exist
            if u2.shape[2:] != e2.shape[2:]:
                u2 = nn.functional.interpolate(u2, size=e2.shape[2:], mode='bilinear', align_corners=True)
            fuse2 = torch.cat([u2, e2], dim=1)
            d2 = self.dec2(fuse2)
            
            u1 = self.up1(d2)
            if u1.shape[2:] != e1.shape[2:]:
                u1 = nn.functional.interpolate(u1, size=e1.shape[2:], mode='bilinear', align_corners=True)
            fuse1 = torch.cat([u1, e1], dim=1)
            d1 = self.dec1(fuse1)
            
            out = self.out_conv(d1)
            return out


def fit_model_on_unmasked_patches(
    model, 
    bands_normalized: list[np.ndarray], 
    mask: np.ndarray, 
    guidance_bands_normalized: list[np.ndarray],
    epochs: int = 25
):
    """
    Self-Supervised Local Adaption (Deep Image Prior style):
    Trains the model weights on clean unclouded patches of the current target image.
    This dynamically aligns reconstruction outputs with the local terrain, spectral bands, and textures.
    """
    if not TORCH_AVAILABLE:
        return
        
    model.train()
    optimizer = optim.Adam(model.parameters(), lr=0.01)
    criterion = nn.L1Loss()
    
    H, W = mask.shape
    # Extract clean patches (no cloud mask)
    patch_size = 128
    clean_patches = []
    
    # Simple grid search for 3-5 clean patches
    for y in range(0, H - patch_size, patch_size):
        for x in range(0, W - patch_size, patch_size):
            m_patch = mask[y:y+patch_size, x:x+patch_size]
            if np.sum(m_patch) == 0: # 100% clean patch
                clean_patches.append((y, x))
                if len(clean_patches) >= 4:
                    break
        if len(clean_patches) >= 4:
            break
            
    if not clean_patches:
        # Fall back to using whatever patches have the least mask presence
        clean_patches = [(0, 0)]
        
    # Format patch tensors
    logger.info(f"Dynamically fitting U-Net weights on {len(clean_patches)} local clean patches for texture alignment.")
    
    bands_stack = np.stack(bands_normalized, axis=0) # [3, H, W]
    guidance_stack = np.stack(guidance_bands_normalized, axis=0) # [3, H, W]
    
    for epoch in range(epochs):
        epoch_loss = 0.0
        for y, x in clean_patches:
            b_p = bands_stack[:, y:y+patch_size, x:x+patch_size]
            g_p = guidance_stack[:, y:y+patch_size, x:x+patch_size]
            
            # Create a synthetic mask in the center of the patch to simulate reconstruction task
            synthetic_mask = np.zeros((1, patch_size, patch_size), dtype=np.float32)
            synthetic_mask[:, 32:96, 32:96] = 1.0 # 64x64 block mask
            
            # Form masked input patch
            masked_b_p = b_p * (1.0 - synthetic_mask)
            
            # Assemble model input [B=1, C=7, H=128, W=128]
            input_p = np.concatenate([masked_b_p, synthetic_mask, g_p], axis=0)
            input_tensor = torch.from_numpy(input_p).unsqueeze(0).float()
            target_tensor = torch.from_numpy(b_p).unsqueeze(0).float()
            mask_tensor = torch.from_numpy(synthetic_mask).unsqueeze(0).float()
            
            optimizer.zero_grad()
            output = model(input_tensor)
            
            # Loss is calculated on the target reconstruction patch
            loss = criterion(output * mask_tensor, target_tensor * mask_tensor)
            
            # Add spatial gradient constraints for boundary continuity (edge loss)
            # Sobel-like simple 1st-order differences
            grad_out_x = torch.abs(output[:, :, :, 1:] - output[:, :, :, :-1])
            grad_tgt_x = torch.abs(target_tensor[:, :, :, 1:] - target_tensor[:, :, :, :-1])
            grad_out_y = torch.abs(output[:, :, 1:, :] - output[:, :, :-1, :])
            grad_tgt_y = torch.abs(target_tensor[:, :, 1:, :] - target_tensor[:, :, :-1, :])
            
            grad_loss = criterion(grad_out_x, grad_tgt_x) + criterion(grad_out_y, grad_tgt_y)
            total_loss = loss + 0.1 * grad_loss
            
            total_loss.backward()
            optimizer.step()
            epoch_loss += total_loss.item()
            
    model.eval()


def get_reconstruction_model(
    output_dir: str,
    bands_normalized: list[np.ndarray],
    mask: np.ndarray,
    guidance_bands_normalized: list[np.ndarray]
):
    """
    Returns an ONNX Session OR PyTorch Model for modular deep learning inference.
    If the model weights are not compiled, instantiates PyTorch LISS4ReconstructionNet,
    runs a rapid self-supervised fit on unmasked image sections to align textures,
    exports to ONNX and TorchScript, and saves them to disk.
    If packages are missing, returns None to trigger classical fallback.
    """
    if not TORCH_AVAILABLE:
        logger.warning("PyTorch is not available. Deep learning reconstruction model will fall back to classical workflow.")
        return None, None
        
    onnx_path = os.path.join(output_dir, "reconstruction_model.onnx")
    pt_path = os.path.join(output_dir, "reconstruction_model.pt")
    
    # Try using ONNX Runtime if available and ONNX file exists
    if ONNX_AVAILABLE and os.path.exists(onnx_path):
        try:
            logger.info(f"Loading compiled ONNX reconstruction model from {onnx_path}")
            session = ort.InferenceSession(onnx_path)
            return "ONNX", session
        except Exception as e:
            logger.error(f"Failed loading ONNX session from {onnx_path}: {e}")
            
    # Try using TorchScript if available and exists
    if os.path.exists(pt_path):
        try:
            logger.info(f"Loading compiled TorchScript reconstruction model from {pt_path}")
            model = torch.jit.load(pt_path)
            model.eval()
            return "TORCHSCRIPT", model
        except Exception as e:
            logger.error(f"Failed loading TorchScript model from {pt_path}: {e}")

    # Generate, fit, and export model on the fly
    try:
        model = LISS4ReconstructionNet(in_channels=7, out_channels=3)
        
        # Fit model dynamically to learn the spectral and edge profiles of this dataset
        fit_model_on_unmasked_patches(model, bands_normalized, mask, guidance_bands_normalized, epochs=20)
        
        # Save TorchScript
        try:
            example_input = torch.randn(1, 7, 128, 128)
            traced_model = torch.jit.trace(model, example_input)
            traced_model.save(pt_path)
            logger.info(f"Saved traced TorchScript model to {pt_path}")
        except Exception as e:
            logger.warning(f"Could not save TorchScript model: {e}")
            
        # Save ONNX
        if ONNX_AVAILABLE:
            try:
                example_input = torch.randn(1, 7, 128, 128)
                torch.onnx.export(
                    model, 
                    example_input, 
                    onnx_path, 
                    export_params=True,
                    opset_version=12,
                    do_constant_folding=True,
                    input_names=['input'],
                    output_names=['output'],
                    dynamic_axes={'input': {0: 'batch_size', 2: 'height', 3: 'width'},
                                  'output': {0: 'batch_size', 2: 'height', 3: 'width'}}
                )
                logger.info(f"Saved compiled ONNX model to {onnx_path}")
                session = ort.InferenceSession(onnx_path)
                return "ONNX", session
            except Exception as e:
                logger.warning(f"Could not export ONNX model: {e}")
                
        # Return raw PyTorch model as fallback
        model.eval()
        return "PYTORCH", model
        
    except Exception as e:
        logger.error(f"Failed to generate and compile Deep Learning model: {e}. Falling back to classical workflow.")
        return None, None
