"""
GS1 Check Digit Validator and Barcode Normalizer for FMCG Catalogue Expansion.
Supports GTIN-8, GTIN-12 (UPC-A), GTIN-13 (EAN-13), and GTIN-14.
"""

def calculate_gs1_check_digit(digits_str: str) -> int:
    """
    Calculates the GS1 modulo-10 check digit for a string of digits (excluding the check digit).
    For any GTIN (8, 12, 13, 14): moving from right to left from the digit immediately
    preceding the check digit, the weights alternate: 3, 1, 3, 1, 3...
    """
    if not digits_str.isdigit():
        raise ValueError(f"Payload must contain only digits, got: '{digits_str}'")
    
    total = 0
    # From right to left: weight 3, 1, 3, 1...
    for i, char in enumerate(reversed(digits_str)):
        weight = 3 if (i % 2 == 0) else 1
        total += int(char) * weight
    
    remainder = total % 10
    return 0 if remainder == 0 else (10 - remainder)


def validate_gs1_barcode(barcode: str):
    """
    Validates a GTIN barcode (GTIN-8, GTIN-12, GTIN-13, GTIN-14).
    Returns a dict:
    {
        'is_valid': bool,
        'length': int,
        'standard': str ('EAN-8', 'UPC-A', 'EAN-13', 'GTIN-14', or 'UNKNOWN'),
        'expected_check_digit': int or None,
        'actual_check_digit': int or None,
        'reason': str
    }
    """
    if not barcode:
        return {
            'is_valid': False,
            'length': 0,
            'standard': 'EMPTY',
            'expected_check_digit': None,
            'actual_check_digit': None,
            'reason': 'Barcode is empty or null'
        }
    
    clean_code = str(barcode).strip()
    if not clean_code.isdigit():
        return {
            'is_valid': False,
            'length': len(clean_code),
            'standard': 'NON_NUMERIC',
            'expected_check_digit': None,
            'actual_check_digit': None,
            'reason': 'Barcode contains non-digit characters'
        }
    
    length = len(clean_code)
    standards_map = {8: 'EAN-8', 12: 'UPC-A', 13: 'EAN-13', 14: 'GTIN-14'}
    if length not in standards_map:
        return {
            'is_valid': False,
            'length': length,
            'standard': 'NON_STANDARD_LENGTH',
            'expected_check_digit': None,
            'actual_check_digit': None,
            'reason': f'Length {length} is not standard GS1 (must be 8, 12, 13, or 14)'
        }
    
    payload = clean_code[:-1]
    actual_check_digit = int(clean_code[-1])
    expected_check_digit = calculate_gs1_check_digit(payload)
    
    is_valid = (actual_check_digit == expected_check_digit)
    return {
        'is_valid': is_valid,
        'length': length,
        'standard': standards_map[length],
        'expected_check_digit': expected_check_digit,
        'actual_check_digit': actual_check_digit,
        'reason': 'Valid GS1 Check Digit' if is_valid else f'Check digit mismatch (expected {expected_check_digit}, got {actual_check_digit})'
    }


if __name__ == '__main__':
    # Unit tests with official GS1 reference vectors
    test_cases = [
        # (barcode, expected_valid, standard)
        ("4006381333931", True, "EAN-13"),   # Official GS1 example (STABILO point 88)
        ("96385074", True, "EAN-8"),         # Official GS1 GTIN-8
        ("012345678905", True, "UPC-A"),     # Official GS1 GTIN-12
        ("10012345678902", True, "GTIN-14"), # Official GS1 GTIN-14
        ("8901719101038", True, "EAN-13"),   # Parle-G 800g (Valid check digit 8)
        ("8901719101037", False, "EAN-13"),  # Corrupted check digit (7 instead of 8)
        ("8901719", False, "NON_STANDARD_LENGTH"),
        ("890171910103A", False, "NON_NUMERIC"),
    ]
    
    print("Running GS1 Validator Unit Tests:")
    all_passed = True
    for bc, exp_val, exp_std in test_cases:
        res = validate_gs1_barcode(bc)
        status = "PASS" if (res['is_valid'] == exp_val) else "FAIL"
        if status == "FAIL":
            all_passed = False
        print(f"[{status}] Barcode: {bc:<16} => Valid: {res['is_valid']} ({res['reason']})")
    
    if all_passed:
        print("\nAll GS1 unit tests PASSED successfully!")
    else:
        print("\nSome tests FAILED!")
        exit(1)
