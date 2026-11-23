import unittest

from app import classify_qr_payload, extract_document_metadata


class DocumentMetadataTests(unittest.TestCase):
    def test_pan_number_is_masked_in_screening_metadata(self):
        result = extract_document_metadata("PAN ABCDE1234F")

        self.assertEqual(result["detectedDocumentType"], "PAN")
        self.assertEqual(result["maskedIdentifier"], "*****234F")
        self.assertNotIn("ABCDE1234F", str(result))

    def test_aadhaar_number_is_masked_in_screening_metadata(self):
        result = extract_document_metadata("Aadhaar 2345 6789 0123")

        self.assertEqual(result["detectedDocumentType"], "AADHAAR")
        self.assertEqual(result["maskedIdentifier"], "********0123")
        self.assertNotIn("234567890123", str(result))

    def test_unknown_document_does_not_return_an_identifier(self):
        result = extract_document_metadata("No recognized identifier")

        self.assertEqual(result["detectedDocumentType"], "UNKNOWN")
        self.assertIsNone(result["maskedIdentifier"])

    def test_qr_http_destination_is_flagged_without_returning_payload(self):
        result = classify_qr_payload("http://example.test/verify")

        self.assertEqual(result["status"], "insecure_http")
        self.assertFalse(result["payloadReturned"])
        self.assertNotIn("example.test", str(result))

    def test_qr_https_destination_remains_unverified_without_returning_payload(self):
        result = classify_qr_payload("https://example.test/verify")

        self.assertEqual(result["status"], "unverified_url")
        self.assertFalse(result["payloadReturned"])
        self.assertNotIn("example.test", str(result))

    def test_non_web_qr_scheme_is_flagged(self):
        result = classify_qr_payload("javascript:alert(1)")

        self.assertEqual(result["status"], "suspicious_scheme")
        self.assertFalse(result["payloadReturned"])

    def test_qr_detection_distinguishes_missing_and_unreadable_codes(self):
        self.assertEqual(classify_qr_payload(""), {
            "status": "not_found",
            "payloadReturned": False,
        })
        self.assertEqual(classify_qr_payload("", detected=True), {
            "status": "unreadable",
            "payloadReturned": False,
        })


if __name__ == "__main__":
    unittest.main()
