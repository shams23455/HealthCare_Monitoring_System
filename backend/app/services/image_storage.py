import os
import uuid
import io
from pathlib import Path
from typing import Tuple, Dict, Any, Optional
from PIL import Image as PILImage, ImageFilter, ImageStat

ALLOWED_IMAGE_TYPES = {
    "image/jpeg": ".jpg",
    "image/jpg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
}
MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024  # 5 MB

class ImageStorageService:
    """
    Abstract image storage layer.
    Safely stores livestock observation photos, validates constraints,
    evaluates visual quality, and removes EXIF metadata to protect farmer privacy.
    """

    def __init__(self, upload_dir: Optional[str] = None):
        if upload_dir is None:
            # Default to backend/uploads/observations
            base_dir = Path(__file__).resolve().parent.parent.parent
            self.upload_dir = base_dir / "uploads" / "observations"
        else:
            self.upload_dir = Path(upload_dir)
        
        self.upload_dir.mkdir(parents=True, exist_ok=True)

    def validate_image_bytes(self, content: bytes, content_type: str) -> None:
        """Validates format and size constraints."""
        if len(content) > MAX_FILE_SIZE_BYTES:
            raise ValueError(f"Image size exceeds the 5 MB limit ({len(content) / (1024*1024):.1f} MB).")

        normalized_type = content_type.lower()
        if normalized_type not in ALLOWED_IMAGE_TYPES:
            raise ValueError("Unsupported image format. Please upload a JPEG, PNG, or WEBP image.")

    def evaluate_image_quality(self, pil_img: PILImage.Image, file_size: int) -> Tuple[str, str]:
        """
        Assesses basic photo quality using resolution, aspect ratio, file size,
        and edge sharpness approximation. Returns (quality_status, notes).
        Statuses: GOOD, ACCEPTABLE, POOR.
        """
        width, height = pil_img.size

        # 1. Extreme low resolution
        if width < 300 or height < 300:
            return "POOR", "Resolution below 300px; clinical details may be obscured."

        # 2. File size too small (extreme lossy compression)
        if file_size < 10 * 1024:
            return "POOR", "Image file size is too low (< 10 KB); high compression artifacts likely."

        # 3. Blur / detail approximation via edge filter variance
        try:
            gray = pil_img.convert("L")
            edges = gray.filter(ImageFilter.FIND_EDGES)
            stat = ImageStat.Stat(edges)
            edge_std_dev = stat.stddev[0]
            if edge_std_dev < 10.0:
                return "POOR", "Image lacks edge contrast or appears significantly blurred."
        except Exception:
            pass

        # 4. Adequate or High Quality check
        if width >= 800 and height >= 600 and file_size >= 40 * 1024:
            return "GOOD", "Clear resolution and acceptable contrast for clinical review."

        return "ACCEPTABLE", "Adequate resolution for triage."

    def process_and_save(
        self,
        file_bytes: bytes,
        original_filename: str,
        content_type: str
    ) -> Dict[str, Any]:
        """
        Validates image, strips EXIF data for farmer privacy, assesses quality,
        extracts dimensions, and saves file to the local storage path.
        """
        self.validate_image_bytes(file_bytes, content_type)

        try:
            pil_img = PILImage.open(io.BytesIO(file_bytes))
            pil_img.verify()
            # Reopen after verify
            pil_img = PILImage.open(io.BytesIO(file_bytes))
        except Exception:
            raise ValueError("Invalid or corrupted image file.")

        width, height = pil_img.size
        quality_status, quality_notes = self.evaluate_image_quality(pil_img, len(file_bytes))

        # Strip EXIF metadata to ensure farmer privacy
        image_without_exif = PILImage.new(pil_img.mode, pil_img.size)
        image_without_exif.paste(pil_img)

        ext = ALLOWED_IMAGE_TYPES.get(content_type.lower(), ".jpg")
        unique_name = f"{uuid.uuid4().hex}_{Path(original_filename).stem[:30]}{ext}"
        destination_path = self.upload_dir / unique_name

        # Save stripped image
        save_format = "JPEG" if ext in [".jpg", ".jpeg"] else ("PNG" if ext == ".png" else "WEBP")
        if save_format == "JPEG" and image_without_exif.mode in ("RGBA", "P"):
            image_without_exif = image_without_exif.convert("RGB")

        image_without_exif.save(destination_path, format=save_format, quality=88, optimize=True)

        stored_file_size = destination_path.stat().st_size
        relative_storage_path = f"/uploads/observations/{unique_name}"

        return {
            "storage_path": relative_storage_path,
            "original_filename": original_filename,
            "file_size": stored_file_size,
            "width": width,
            "height": height,
            "upload_status": "UPLOADED",
            "image_quality": quality_status,
            "quality_notes": quality_notes
        }

    def delete_image(self, storage_path: str) -> bool:
        """Deletes an image file from storage if present."""
        filename = Path(storage_path).name
        full_path = self.upload_dir / filename
        if full_path.exists():
            try:
                full_path.unlink()
                return True
            except OSError:
                return False
        return False

# Global storage service instance
image_storage_service = ImageStorageService()
