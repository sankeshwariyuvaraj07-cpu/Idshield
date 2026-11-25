import hmac
import os
import re
from io import BytesIO
from urllib.parse import urlsplit

import cv2
import numpy as np
import pytesseract
from fastapi import FastAPI, File, Header, HTTPException, UploadFile
from PIL import Image, UnidentifiedImageError

MAX_FILE_SIZE = 8 * 1024 * 1024
MAX_IMAGE_PIXELS = 25_000_000
INFERENCE_API_TOKEN = os.getenv("FASTAPI_AUTH_TOKEN") or os.getenv("INFERENCE_API_TOKEN", "")
TESSERACT_CMD = os.getenv("TESSERACT_CMD")
SUPPORTED_OCR_LANGUAGES = {"eng", "hin", "kan"}


def parse_ocr_languages(value):
    languages = value.split("+")
    if not languages or any(language not in SUPPORTED_OCR_LANGUAGES for language in languages):
        raise ValueError("TESSERACT_LANGUAGES must contain eng, hin, and/or kan.")
    if len(set(languages)) != len(languages):
        raise ValueError("TESSERACT_LANGUAGES cannot contain duplicate language codes.")
    return "+".join(languages)


OCR_LANGUAGES = parse_ocr_languages(os.getenv("TESSERACT_LANGUAGES", "eng"))
if TESSERACT_CMD:
    pytesseract.pytesseract.tesseract_cmd = TESSERACT_CMD

app = FastAPI(title="IDShield OCR service", docs_url=None, redoc_url=None)


def decode_image(contents):
    try:
        image = Image.open(BytesIO(contents))
        if image.width * image.height > MAX_IMAGE_PIXELS:
            raise HTTPException(status_code=413, detail="Image dimensions exceed the processing limit.")
        image.verify()
        decoded = cv2.imdecode(np.frombuffer(contents, dtype=np.uint8), cv2.IMREAD_COLOR)
    except HTTPException:
        raise
    except (UnidentifiedImageError, OSError, cv2.error, ValueError):
        raise HTTPException(status_code=415, detail="The uploaded bytes are not a supported image.")

    if decoded is None:
        raise HTTPException(status_code=415, detail="The uploaded bytes are not a supported image.")
    return decoded


def visual_ela(decoded):
    height, width = decoded.shape[:2]
    scale = min(500 / width, 500 / height, 1)
    if scale < 1:
        resized = cv2.resize(
            decoded,
            (max(1, round(width * scale)), max(1, round(height * scale))),
            interpolation=cv2.INTER_AREA,
        )
    else:
        resized = decoded

    encoded, compressed = cv2.imencode(
        ".jpg",
        resized,
        [int(cv2.IMWRITE_JPEG_QUALITY), 90],
    )
    if not encoded:
        raise HTTPException(status_code=422, detail="Unable to calculate the image compression signal.")

    recompressed = cv2.imdecode(compressed, cv2.IMREAD_COLOR)
    if recompressed is None:
        raise HTTPException(status_code=422, detail="Unable to calculate the image compression signal.")

    score = float(np.mean(cv2.absdiff(resized, recompressed)))
    return round(score, 2), score > 18.0


def extract_document_metadata(text):
    pan_match = re.search(r"\b[A-Z]{5}[0-9]{4}[A-Z]\b", text, re.IGNORECASE)
    if pan_match:
        number = pan_match.group(0).upper()
        return {
            "detectedDocumentType": "PAN",
            "maskedIdentifier": f"*****{number[-4:]}",
        }

    aadhaar_match = re.search(
        r"\b[2-9][0-9]{3}\s?[0-9]{4}\s?[0-9]{4}\b",
        text,
    )
    if aadhaar_match:
        number = re.sub(r"\s", "", aadhaar_match.group(0))
        return {
            "detectedDocumentType": "AADHAAR",
            "maskedIdentifier": f"********{number[-4:]}",
        }

    return {
        "detectedDocumentType": "UNKNOWN",
        "maskedIdentifier": None,
    }


def classify_qr_payload(payload, detected=False):
    if not payload:
        return {
            "status": "unreadable" if detected else "not_found",
            "payloadReturned": False,
        }

    try:
        parsed = urlsplit(payload)
    except ValueError:
        return {
            "status": "suspicious_scheme",
            "payloadReturned": False,
        }
    if parsed.scheme.lower() == "http" and parsed.hostname:
        status = "insecure_http"
    elif parsed.scheme.lower() == "https" and parsed.hostname:
        status = "unverified_url"
    elif parsed.scheme:
        status = "suspicious_scheme"
    else:
        status = "decoded_unverified"

    return {
        "status": status,
        "payloadReturned": False,
    }


def inspect_qr(decoded):
    detector = cv2.QRCodeDetector()
    try:
        payload, points, _ = detector.detectAndDecode(decoded)
    except cv2.error:
        return {
            "status": "unavailable",
            "payloadReturned": False,
        }
    return classify_qr_payload(payload, points is not None)


@app.get("/healthz")
def health():
    return {"status": "ok", "forgery_model": "not_configured"}


@app.post("/v1/transit/scan")
async def scan_transit_document(
    file: UploadFile = File(...),
    x_inference_token: str = Header(default=""),
):
    if not INFERENCE_API_TOKEN or not hmac.compare_digest(x_inference_token, INFERENCE_API_TOKEN):
        raise HTTPException(status_code=401, detail="Invalid inference service credentials.")

    contents = await file.read(MAX_FILE_SIZE + 1)
    if len(contents) > MAX_FILE_SIZE:
        raise HTTPException(status_code=413, detail="File exceeds the 8 MB processing limit.")
    if not contents:
        raise HTTPException(status_code=400, detail="File is empty.")

    decoded = decode_image(contents)
    detector = cv2.QRCodeDetector()
    qr_data, qr_points, _ = detector.detectAndDecode(decoded)
    qr_status = "decoded_unverified" if qr_data else "unreadable" if qr_points is not None else "not_found"

    gray = cv2.cvtColor(decoded, cv2.COLOR_BGR2GRAY)
    edges = cv2.Canny(gray, 50, 150)
    contours, _ = cv2.findContours(edges, cv2.RETR_LIST, cv2.CHAIN_APPROX_SIMPLE)
    image_area = decoded.shape[0] * decoded.shape[1]
    boundary_detected = False
    for contour in sorted(contours, key=cv2.contourArea, reverse=True)[:20]:
        perimeter = cv2.arcLength(contour, True)
        polygon = cv2.approxPolyDP(contour, 0.02 * perimeter, True)
        if len(polygon) == 4 and cv2.contourArea(contour) > image_area * 0.1:
            boundary_detected = True
            break

    ocr_status = "unavailable"
    word_count = 0
    confidence = None
    try:
        data = pytesseract.image_to_data(
            cv2.normalize(gray, None, 0, 255, cv2.NORM_MINMAX),
            output_type=pytesseract.Output.DICT,
            lang=OCR_LANGUAGES,
            timeout=20,
        )
        confidences = []
        for text, raw_confidence in zip(data["text"], data["conf"]):
            try:
                score = float(raw_confidence)
            except (TypeError, ValueError):
                continue
            if text.strip() and score >= 0:
                word_count += 1
                confidences.append(score)
        confidence = round(sum(confidences) / len(confidences) / 100, 4) if confidences else None
        ocr_status = "complete"
    except pytesseract.TesseractNotFoundError:
        ocr_status = "unavailable"
    except pytesseract.TesseractError:
        ocr_status = "unavailable"
    except RuntimeError:
        ocr_status = "timed_out"

    return {
        "mode": "assisted_scan",
        "finalStatus": "MANUAL_REVIEW_REQUIRED",
        "documentDetection": {
            "method": "opencv_contour_candidate",
            "candidateBoundaryDetected": boundary_detected,
            "yolo": "not_configured",
        },
        "qr": {
            "status": qr_status,
            "signatureVerification": "unavailable",
            "payloadReturned": False,
        },
        "ocr": {
            "status": ocr_status,
            "wordCount": word_count,
            "confidence": confidence,
            "languages": OCR_LANGUAGES.split("+"),
            "textReturned": False,
        },
        "documentIntegrity": "inconclusive",
        "eligibility": "not_established",
        "privacy": "Image processed in memory only; not stored by this endpoint.",
        "notice": "OCR, image boundaries, and QR decoding do not establish Aadhaar authenticity or scheme eligibility.",
    }


@app.post("/v1/ocr")
async def extract_text(
    file: UploadFile = File(...),
    x_inference_token: str = Header(default=""),
):
    if not INFERENCE_API_TOKEN or not hmac.compare_digest(x_inference_token, INFERENCE_API_TOKEN):
        raise HTTPException(status_code=401, detail="Invalid inference service credentials.")

    contents = await file.read(MAX_FILE_SIZE + 1)
    if len(contents) > MAX_FILE_SIZE:
        raise HTTPException(status_code=413, detail="File exceeds the 8 MB processing limit.")
    if not contents:
        raise HTTPException(status_code=400, detail="File is empty.")

    decoded = decode_image(contents)
    qr_safety = inspect_qr(decoded)

    try:
        gray = cv2.cvtColor(decoded, cv2.COLOR_BGR2GRAY)
        normalized = cv2.normalize(gray, None, 0, 255, cv2.NORM_MINMAX)
        data = pytesseract.image_to_data(
            normalized,
            output_type=pytesseract.Output.DICT,
            lang=OCR_LANGUAGES,
            timeout=20,
        )
    except pytesseract.TesseractNotFoundError:
        raise HTTPException(status_code=503, detail="Tesseract OCR is not installed on this service.")
    except pytesseract.TesseractError as error:
        raise HTTPException(
            status_code=503,
            detail="Tesseract language data for the configured OCR languages is not installed.",
        ) from error
    except RuntimeError as error:
        raise HTTPException(status_code=503, detail="OCR processing exceeded its time limit.") from error

    words = []
    confidences = []
    for text, raw_confidence in zip(data["text"], data["conf"]):
        cleaned = text.strip()
        try:
            confidence = float(raw_confidence)
        except (TypeError, ValueError):
            continue
        if cleaned and confidence >= 0:
            words.append(cleaned)
            confidences.append(confidence)

    text = " ".join(words)
    ela_score, visual_tamper_signal = visual_ela(decoded)
    document_metadata = extract_document_metadata(text)

    return {
        "status": "complete",
        "text": text,
        "wordCount": len(words),
        "confidence": round(sum(confidences) / len(confidences) / 100, 4) if confidences else None,
        "languages": OCR_LANGUAGES.split("+"),
        "screening": {
            "finalStatus": "MANUAL_REVIEW_REQUIRED",
            "qrSafety": qr_safety,
            "visualForensics": {
                "method": "jpeg_recompression_heuristic",
                "elaScore": ela_score,
                "visualTamperSignal": visual_tamper_signal,
                "interpretation": "A compression signal is not proof of manipulation.",
            },
            "ocrExtraction": document_metadata,
            "issuerVerification": {
                "status": "not_configured",
                "apiVerified": False,
                "reason": "No issuer verification endpoint is configured.",
            },
            "notice": "OCR and image-compression signals do not establish identity document authenticity.",
        },
    }
