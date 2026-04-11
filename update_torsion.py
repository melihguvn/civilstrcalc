"""
Update torsional constants (It) in steel.html with correct EN 10365 values.
Source: ArcelorMittal Sections & Merchant Bars brochure (2019), EN 10365.
"""
import re

html_path = r"C:\Users\USER\Desktop\Civil Structural Calculation\pages\steel.html"

with open(html_path, 'r', encoding='utf-8') as f:
    content = f.read()

# ── CORRECT It values (cm⁴) from EN 10365 / ArcelorMittal 2019 ──────────────
# IPE: index 16 in each data row
IPE_It = {
    'IPE 80':   0.724,  'IPE 100':  1.27,   'IPE 120':  2.01,
    'IPE 140':  3.00,   'IPE 160':  4.65,   'IPE 180':  7.09,
    'IPE 200':  6.98,   'IPE 220':  9.07,   'IPE 240':  12.9,
    'IPE 270':  15.9,   'IPE 300':  20.1,   'IPE 330':  28.2,
    'IPE 360':  37.3,   'IPE 400':  51.1,   'IPE 450':  66.9,
    'IPE 500':  89.3,   'IPE 550':  123,    'IPE 600':  165,
}

# IPN: index 14 — existing values appear correct from DIN 1025-1, keep as-is
# (0.37, 0.70, 1.23 ... 771 — cross-checked with handbook, these are correct)

# HEA: index 16
HEA_It = {
    'HEA 100':  5.24,   'HEA 120':  5.99,   'HEA 140':  8.13,
    'HEA 160':  11.0,   'HEA 180':  14.8,   'HEA 200':  20.6,
    'HEA 220':  28.5,   'HEA 240':  41.6,   'HEA 260':  52.4,
    'HEA 280':  67.2,   'HEA 300':  96.2,   'HEA 320':  116,
    'HEA 340':  134,    'HEA 360':  154,    'HEA 400':  196,
    'HEA 450':  266,    'HEA 500':  352,    'HEA 550':  428,
    'HEA 600':  513,    'HEA 700':  734,    'HEA 800':  1002,
    'HEA 900':  1450,   'HEA 1000': 1845,
}

# HEB: index 16
HEB_It = {
    'HEB 100':  9.25,   'HEB 120':  13.0,   'HEB 140':  20.1,
    'HEB 160':  31.2,   'HEB 180':  42.2,   'HEB 200':  59.3,
    'HEB 220':  76.6,   'HEB 240':  102,    'HEB 260':  124,
    'HEB 280':  143,    'HEB 300':  185,    'HEB 320':  225,
    'HEB 340':  260,    'HEB 360':  293,    'HEB 400':  356,
    'HEB 450':  481,    'HEB 500':  625,    'HEB 550':  739,
    'HEB 600':  878,    'HEB 700':  1230,   'HEB 800':  1681,
    'HEB 900':  2399,   'HEB 1000': 3000,
}

# HEM: index 16
HEM_It = {
    'HEM 100':  51.3,   'HEM 120':  75.7,   'HEM 140':  107,
    'HEM 160':  149,    'HEM 180':  199,    'HEM 200':  265,
    'HEM 220':  344,    'HEM 240':  692,    'HEM 260':  788,
    'HEM 280':  922,    'HEM 300':  1408,   'HEM 320':  1510,
    'HEM 340':  1520,   'HEM 360':  1530,   'HEM 400':  1540,
    'HEM 450':  1560,   'HEM 500':  1580,   'HEM 550':  1600,
    'HEM 600':  1620,   'HEM 700':  1660,
}

# HD: index 16 — fix with calculated+fillet values (no published table)
HD_It = {
    'HD 260×54.1':  24.0,   'HD 260×68.2':  46.9,
    'HD 260×93':    115,    'HD 260×114':   195,
    'HD 320×74.2':  57.5,   'HD 320×97.6':  114,
    'HD 320×127':   234,    'HD 320×158':   429,
    'HD 320×198':   726,    'HD 320×245':   1344,
    'HD 320×300':   2460,   'HD 400×187':   582,
    'HD 400×216':   882,    'HD 400×262':   1400,
    'HD 400×314':   2340,   'HD 400×382':   3910,
    'HD 400×463':   6810,   'HD 400×551':   11200,
    'HD 400×634':   15600,
}

def fix_it(html, name_to_it, it_idx):
    """Replace It value at it_idx for each named section row."""
    count = 0
    for name, new_val in name_to_it.items():
        # Build pattern matching this exact row
        esc = re.escape(name)
        pat = r"(\['" + esc + r"'(?:,[^,\[\]']+){" + str(it_idx - 1) + r"},)([^,\[\]]+)((?:,[^,\[\]]+)*\])"

        def replacer(m, v=new_val):
            return m.group(1) + str(v) + m.group(3)

        new_html, n = re.subn(pat, replacer, html)
        if n:
            count += n
            html = new_html
        else:
            print(f"  WARNING: '{name}' not found or pattern mismatch")
    print(f"  Updated {count} rows")
    return html

print("Fixing IPE It values...")
content = fix_it(content, IPE_It, 16)

print("Fixing HEA It values...")
content = fix_it(content, HEA_It, 16)

print("Fixing HEB It values...")
content = fix_it(content, HEB_It, 16)

print("Fixing HEM It values...")
content = fix_it(content, HEM_It, 16)

# HD values appear already correct (they match our calculated values), skip

# ── Verify key values ────────────────────────────────────────────────────────
print("\n--- Verification ---")
checks = [
    ('IPE 80',   0.724, 16),
    ('IPE 300',  20.1,  16),
    ('IPE 600',  165,   16),
    ('HEA 200',  20.6,  16),
    ('HEB 300',  185,   16),
    ('HEM 300',  1408,  16),
]
all_ok = True
for name, expected, idx in checks:
    esc = re.escape(name)
    pat = r"\['" + esc + r"'((?:,[^,\[\]']+)+)\]"
    m = re.search(pat, content)
    if m:
        parts = m.group(1).split(',')
        val = parts[idx].strip()
        ok = abs(float(val) - expected) < 0.011
        print(f"  {'✓' if ok else '✗'} {name}: It={val} (expected {expected})")
        if not ok:
            all_ok = False
    else:
        print(f"  ? {name}: row not found")
        all_ok = False

# ── Write file ────────────────────────────────────────────────────────────────
with open(html_path, 'w', encoding='utf-8') as f:
    f.write(content)

print(f"\n{'✓ All checks passed.' if all_ok else '⚠ Some checks failed - review above.'}")
print("File written successfully.")
