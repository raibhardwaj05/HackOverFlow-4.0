import os
import logging
from ultralytics import YOLO

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

model = None

def load_model():
    global model
    if model is None:
        try:
            backend_dir = os.path.abspath(os.path.dirname(os.path.dirname(__file__)))
            root_dir = os.path.dirname(backend_dir)
            model_path = os.path.join(root_dir, 'model', 'best.pt')

            if not os.path.exists(model_path):
                logger.error(f"YOLO model not found at {model_path}")
                return

            logger.info(f"Loading YOLO model from {model_path}...")
            model = YOLO(model_path)
            logger.info("YOLO model loaded successfully.")
        except Exception as e:
            logger.error(f"Error loading YOLO model: {e}")
            model = None

def detect_damage(image_path):
    global model
    if model is None:
        load_model()

    if model is None:
        logger.warning("Detection failed: Model is not loaded.")
        return "Model Error", 0.0

    try:
        if not os.path.exists(image_path):
            logger.error(f"Image not found: {image_path}")
            return "Image Not Found", 0.0

        results = model(image_path)

        best_class = "No Damage"
        best_conf = 0.0

        for r in results:
            if hasattr(r, 'boxes') and r.boxes:
                for box in r.boxes:
                    conf = float(box.conf[0])
                    cls_id = int(box.cls[0])
                    class_name = model.names[cls_id]

                    if conf > best_conf:
                        best_conf = conf
                        best_class = class_name

        return best_class, best_conf
    except Exception as e:
        logger.error(f"Error during damage detection: {e}")
        return "Detection Error", 0.0


def detect_damage_with_image(image_path):
    """
    Runs YOLO detection and returns:
      - damage_type (str)
      - confidence (float)
      - annotated_image_b64 (str): base64-encoded JPEG of the annotated image
    """
    import base64
    import cv2
    import numpy as np

    global model
    if model is None:
        load_model()

    if model is None:
        logger.warning("Detection failed: Model is not loaded.")
        return "Model Error", 0.0, None

    try:
        if not os.path.exists(image_path):
            logger.error(f"Image not found: {image_path}")
            return "Image Not Found", 0.0, None

        results = model(image_path)

        best_class = "No Damage"
        best_conf = 0.0

        # Get annotated image from YOLO's built-in plot()
        annotated_b64 = None
        for r in results:
            if hasattr(r, 'boxes') and r.boxes:
                for box in r.boxes:
                    conf = float(box.conf[0])
                    cls_id = int(box.cls[0])
                    class_name = model.names[cls_id]
                    if conf > best_conf:
                        best_conf = conf
                        best_class = class_name

            # plot() returns a BGR numpy array with boxes drawn
            annotated_bgr = r.plot()
            _, buf = cv2.imencode('.jpg', annotated_bgr, [cv2.IMWRITE_JPEG_QUALITY, 85])
            annotated_b64 = base64.b64encode(buf).decode('utf-8')

        return best_class, best_conf, annotated_b64

    except Exception as e:
        logger.error(f"Error during damage detection with image: {e}")
        return "Detection Error", 0.0, None


def detect_video_full(video_path):
    """
    Runs YOLO detection on EVERY frame of the video using GPU batch inference.
    Returns summary stats + best annotated frame as base64.
    (Kept for backward compatibility)
    """
    import base64
    import cv2

    global model
    if model is None:
        load_model()

    if model is None:
        raise RuntimeError("YOLO model is not loaded.")

    if not os.path.exists(video_path):
        raise FileNotFoundError(f"Video not found: {video_path}")

    frame_results = []
    best_annotated_b64 = None
    best_detection_conf = 0.0
    total_frames = 0

    BAD_LABELS = {"No Damage", "Model Error", "Detection Error", "Image Not Found"}

    try:
        for r in model(video_path, stream=True, verbose=False):
            total_frames += 1

            best_class = "No Damage"
            best_conf = 0.0

            if hasattr(r, 'boxes') and r.boxes is not None and len(r.boxes):
                for box in r.boxes:
                    conf = float(box.conf[0])
                    cls_id = int(box.cls[0])
                    class_name = model.names[cls_id]
                    if conf > best_conf:
                        best_conf = conf
                        best_class = class_name

            frame_results.append({
                "frame": total_frames - 1,
                "damage_type": best_class,
                "confidence": round(best_conf, 3)
            })

            if best_class not in BAD_LABELS and best_conf > best_detection_conf:
                best_detection_conf = best_conf
                annotated_bgr = r.plot()
                _, buf = cv2.imencode('.jpg', annotated_bgr, [cv2.IMWRITE_JPEG_QUALITY, 85])
                best_annotated_b64 = base64.b64encode(buf).decode('utf-8')

    except Exception as e:
        logger.error(f"Error during full video detection: {e}")
        raise

    damage_counts = {}
    damage_conf_sum = {}
    for r in frame_results:
        dt = r['damage_type']
        if dt in BAD_LABELS:
            continue
        damage_counts[dt] = damage_counts.get(dt, 0) + 1
        damage_conf_sum[dt] = damage_conf_sum.get(dt, 0.0) + r['confidence']

    summary = [
        {
            "damage_type": dt,
            "count": damage_counts[dt],
            "avg_confidence": round(damage_conf_sum[dt] / damage_counts[dt], 3)
        }
        for dt in sorted(damage_counts, key=lambda x: -damage_counts[x])
    ]

    return {
        "total_frames": total_frames,
        "detections_found": sum(damage_counts.values()),
        "summary": summary,
        "top_damage": summary[0]['damage_type'] if summary else "No Damage",
        "best_annotated_frame": best_annotated_b64
    }


def detect_video_to_file(video_path, output_path):
    """
    Runs YOLO detection on EVERY frame of the video using GPU batch inference
    and writes a fully annotated output video file.

    Args:
        video_path  (str): Path to the input video file.
        output_path (str): Path where the annotated output MP4 will be saved.

    Returns:
        dict with:
          - total_frames (int)
          - detections_found (int)
          - summary (list)
          - top_damage (str)
    """
    import cv2

    global model
    if model is None:
        load_model()

    if model is None:
        raise RuntimeError("YOLO model is not loaded.")

    if not os.path.exists(video_path):
        raise FileNotFoundError(f"Video not found: {video_path}")

    # ── Read video properties first ──────────────────────────────────────────
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        raise RuntimeError("Could not open video file.")

    fps    = cap.get(cv2.CAP_PROP_FPS) or 25.0
    width  = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    cap.release()

    # ── Set up VideoWriter ───────────────────────────────────────────────────
    fourcc = cv2.VideoWriter_fourcc(*'mp4v')
    writer = cv2.VideoWriter(output_path, fourcc, fps, (width, height))

    if not writer.isOpened():
        raise RuntimeError("Could not open VideoWriter for output path.")

    # ── Stream YOLO inference on every frame ─────────────────────────────────
    BAD_LABELS = {"No Damage", "Model Error", "Detection Error", "Image Not Found"}
    frame_results = []
    total_frames  = 0

    try:
        for r in model(video_path, stream=True, verbose=False):
            total_frames += 1

            best_class = "No Damage"
            best_conf  = 0.0

            if hasattr(r, 'boxes') and r.boxes is not None and len(r.boxes):
                for box in r.boxes:
                    conf      = float(box.conf[0])
                    cls_id    = int(box.cls[0])
                    class_name = model.names[cls_id]
                    if conf > best_conf:
                        best_conf  = conf
                        best_class = class_name

            frame_results.append({
                "frame":       total_frames - 1,
                "damage_type": best_class,
                "confidence":  round(best_conf, 3)
            })

            # r.plot() returns a BGR numpy array with boxes drawn
            annotated_bgr = r.plot()

            # Ensure frame matches expected output dimensions
            if annotated_bgr.shape[1] != width or annotated_bgr.shape[0] != height:
                annotated_bgr = cv2.resize(annotated_bgr, (width, height))

            writer.write(annotated_bgr)

    finally:
        writer.release()

    # ── Build summary ─────────────────────────────────────────────────────────
    damage_counts   = {}
    damage_conf_sum = {}
    for r in frame_results:
        dt = r['damage_type']
        if dt in BAD_LABELS:
            continue
        damage_counts[dt]   = damage_counts.get(dt, 0) + 1
        damage_conf_sum[dt] = damage_conf_sum.get(dt, 0.0) + r['confidence']

    summary = [
        {
            "damage_type":    dt,
            "count":          damage_counts[dt],
            "avg_confidence": round(damage_conf_sum[dt] / damage_counts[dt], 3)
        }
        for dt in sorted(damage_counts, key=lambda x: -damage_counts[x])
    ]

    return {
        "total_frames":    total_frames,
        "detections_found": sum(damage_counts.values()),
        "summary":         summary,
        "top_damage":      summary[0]['damage_type'] if summary else "No Damage",
    }


def detect_video_full(video_path):
    """
    Runs YOLO detection on EVERY frame of the video using GPU batch inference.
    YOLO accepts a video path directly and streams frames through the model
    efficiently using the GPU.

    Returns a dict with:
      - total_frames (int)
      - detections_found (int)
      - summary (list of {damage_type, count, avg_confidence})
      - top_damage (str)
      - best_annotated_frame (str|None): base64 JPEG of the frame with highest confidence detection
    """
    import base64
    import cv2

    global model
    if model is None:
        load_model()

    if model is None:
        raise RuntimeError("YOLO model is not loaded.")

    if not os.path.exists(video_path):
        raise FileNotFoundError(f"Video not found: {video_path}")

    # ---------------------------------------------------------------
    # Run YOLO on the video directly — it iterates every frame using
    # GPU batch inference internally (stream=True avoids OOM on long videos)
    # ---------------------------------------------------------------
    frame_results = []
    best_annotated_b64 = None
    best_detection_conf = 0.0
    total_frames = 0

    BAD_LABELS = {"No Damage", "Model Error", "Detection Error", "Image Not Found"}

    try:
        for r in model(video_path, stream=True, verbose=False):
            total_frames += 1

            best_class = "No Damage"
            best_conf = 0.0

            if hasattr(r, 'boxes') and r.boxes is not None and len(r.boxes):
                for box in r.boxes:
                    conf = float(box.conf[0])
                    cls_id = int(box.cls[0])
                    class_name = model.names[cls_id]
                    if conf > best_conf:
                        best_conf = conf
                        best_class = class_name

            frame_results.append({
                "frame": total_frames - 1,
                "damage_type": best_class,
                "confidence": round(best_conf, 3)
            })

            # Track the best annotated frame
            if best_class not in BAD_LABELS and best_conf > best_detection_conf:
                best_detection_conf = best_conf
                annotated_bgr = r.plot()
                _, buf = cv2.imencode('.jpg', annotated_bgr, [cv2.IMWRITE_JPEG_QUALITY, 85])
                best_annotated_b64 = base64.b64encode(buf).decode('utf-8')

    except Exception as e:
        logger.error(f"Error during full video detection: {e}")
        raise

    # Build summary
    damage_counts = {}
    damage_conf_sum = {}
    for r in frame_results:
        dt = r['damage_type']
        if dt in BAD_LABELS:
            continue
        damage_counts[dt] = damage_counts.get(dt, 0) + 1
        damage_conf_sum[dt] = damage_conf_sum.get(dt, 0.0) + r['confidence']

    summary = [
        {
            "damage_type": dt,
            "count": damage_counts[dt],
            "avg_confidence": round(damage_conf_sum[dt] / damage_counts[dt], 3)
        }
        for dt in sorted(damage_counts, key=lambda x: -damage_counts[x])
    ]

    detections_found = sum(damage_counts.values())
    top_damage = summary[0]['damage_type'] if summary else "No Damage"

    return {
        "total_frames": total_frames,
        "detections_found": detections_found,
        "summary": summary,
        "top_damage": top_damage,
        "best_annotated_frame": best_annotated_b64
    }
