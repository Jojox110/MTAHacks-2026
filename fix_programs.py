"""
Parse all PDF feuilles de route and fix programs.json to fill in missing credits.
Handles: option groups, free electives, minor credits, OFG bank courses.
"""
from pypdf import PdfReader
import os, json, re, copy

PDF_DIR = 'Major_minorFeuilleDeRoute'
PROGRAMS_FILE = 'Frontend/public/programs.json'

# ─── PDF text extraction ─────────────────────────────────────────────────────

def read_pdf(path):
    reader = PdfReader(path)
    text = ''
    for page in reader.pages:
        t = page.extract_text()
        if t:
            text += t + '\n'
    return text

# ─── Split text into year sections ────────────────────────────────────────────

YEAR_WORDS = {
    'première': 1, 'premier': 1, 'deuxième': 2, 'troisième': 3,
    'quatrième': 4, 'cinquième': 5, 'sixième': 6,
    '1ère': 1, '1re': 1, '1e': 1,
    '2e': 2, '3e': 3, '4e': 4, '5e': 5, '6e': 6,
}

def split_into_years(text):
    """Split PDF text into year sections. Returns {year_num: text_block}"""
    # Pattern matches "Première année (30 crédits)" or "1ère ANNÉE - 30 CRÉDITS"
    pattern = re.compile(
        r'(' + '|'.join(re.escape(w) for w in YEAR_WORDS.keys()) + r')\s*'
        r'ann[ée]e\s*[\(\-–]\s*(\d+)\s*cr[ée]dits',
        re.IGNORECASE
    )

    matches = list(pattern.finditer(text))
    if not matches:
        return {}

    sections = {}
    for i, m in enumerate(matches):
        word = m.group(1).lower().strip()
        year_num = YEAR_WORDS.get(word, 0)
        if year_num == 0:
            continue
        start = m.start()
        end = matches[i + 1].start() if i + 1 < len(matches) else len(text)
        sections[year_num] = text[start:end]

    return sections

# ─── Extract credit number from text ──────────────────────────────────────────

def extract_credits(line):
    """Extract number of credits from a line like 'Choisir 3 crédits...' or 'Choisir un cours...'"""
    # "Choisir X crédits"
    m = re.search(r'[Cc]hoisir\s+(\d+)\s*cr[ée]dits?', line)
    if m:
        return int(m.group(1))
    # "Choisir un cours" = 3 credits
    if re.search(r'[Cc]hoisir\s+un\s+cours', line):
        return 3
    # "Choisir un minimum de X crédits"
    m = re.search(r'minimum\s+de\s+(\d+)\s*cr[ée]dits?', line)
    if m:
        return int(m.group(1))
    # trailing "3" at end of line
    m = re.search(r'\s(\d+)\s*$', line.strip())
    if m:
        val = int(m.group(1))
        if 1 <= val <= 30:
            return val
    return 0

# ─── Classify "Choisir" lines ─────────────────────────────────────────────────

def classify_choisir(line, next_lines=None):
    """
    Classify a "Choisir" line into a type:
    - 'free_elective': cours au choix
    - 'ofg': banque de cours OFG
    - 'minor': cours de la mineure
    - 'option_prefix': cours de sigle XXXX de niveau YYYY
    - 'option_list': cours parmi la liste / les cours suivants
    - 'option_disciplines': cours parmi les disciplines/sigles suivants
    """
    lower = line.lower()

    # Free elective (cours au choix)
    if 'cours au choix' in lower and 'banque' not in lower:
        return 'free_elective', extract_credits(line)

    # Minor credits
    if 'mineure' in lower or 'de la mineure' in lower:
        return 'minor', extract_credits(line)

    # OFG bank
    if 'banque' in lower or 'ofg' in lower or 'objectif' in lower or 'formation générale pour' in lower:
        return 'ofg', extract_credits(line)

    # Option with sigle prefix and level
    m = re.search(r'sigle\s+(\w+)\s+de\s+niveau\s+([\d,\s]+)', lower)
    if m:
        prefix = m.group(1).upper()
        levels = m.group(2).strip()
        cr = extract_credits(line)
        return 'option_prefix', cr, prefix, levels

    # "parmi les cours de sigle XXXX" or "de sigle XXXX"
    m = re.search(r'(?:parmi\s+les\s+cours\s+de\s+sigle|de\s+sigle)\s+(\w+)', lower)
    if m:
        prefix = m.group(1).upper()
        cr = extract_credits(line)
        return 'option_prefix_simple', cr, prefix

    # "parmi les cours XXXX de niveau"
    m = re.search(r'parmi\s+les\s+cours\s+(\w+)\s+de\s+niveau\s+([\d,\s]+)', lower)
    if m:
        prefix = m.group(1).upper()
        levels = m.group(2).strip()
        cr = extract_credits(line)
        return 'option_prefix', cr, prefix, levels

    # "parmi les cours XXXX" (e.g. "parmi les cours HIST")
    m = re.search(r'parmi\s+les\s+cours\s+([A-Z]{3,5})\b', line)
    if m:
        prefix = m.group(1)
        cr = extract_credits(line)
        return 'option_prefix_simple', cr, prefix

    # "parmi les sigles suivants: XXXX, YYYY"
    m = re.search(r'parmi\s+les\s+sigles?\s+suivant[es]*\s*:\s*([\w,\s]+)', line, re.IGNORECASE)
    if m:
        sigles = [s.strip() for s in m.group(1).split(',') if s.strip() and re.match(r'^[A-Z]{3,5}$', s.strip())]
        cr = extract_credits(line)
        return 'option_sigles', cr, sigles

    # "parmi les disciplines suivantes:" or "parmi les cours suivants:"
    if re.search(r'parmi\s+les\s+(cours|disciplines?)\s+suivant', lower):
        cr = extract_credits(line)
        return 'option_list', cr

    # "parmi la liste" or "parmi les cours à option"
    if re.search(r'parmi\s+(la\s+liste|les\s+cours\s+à\s+option)', lower):
        cr = extract_credits(line)
        return 'option_list', cr

    # Generic "Cours à option" line (not a "Choisir", just a header)
    if re.search(r'cours\s+à\s+option', lower) and 'choisir' not in lower:
        return 'header', 0

    return 'unknown', extract_credits(line)


# ─── Extract course codes from text block ─────────────────────────────────────

def extract_course_codes(text_block, limit=50):
    """Extract course codes (e.g., INFO4101) from a text block."""
    codes = re.findall(r'\b([A-Z]{3,5}\d{4})\b', text_block)
    return list(dict.fromkeys(codes))[:limit]  # unique, preserve order


# ─── Build option groups for a year ───────────────────────────────────────────

def extract_year_options(year_text, year_num):
    """Extract missing option groups and free electives from a year's text."""
    lines = year_text.split('\n')
    options = []

    for i, line in enumerate(lines):
        line = line.strip()
        if not line:
            continue

        # Only process "Choisir" lines and "Cours au choix" lines
        has_choisir = 'Choisir' in line or 'choisir' in line
        has_choix = 'Cours au choix' in line or 'cours au choix' in line
        has_option = 'Cours à option' in line and re.search(r'\d', line)

        if not (has_choisir or has_choix or has_option):
            continue

        # Get next few lines for context
        next_lines = lines[i+1:i+20]

        result = classify_choisir(line, next_lines)
        ctype = result[0]
        cr = result[1] if len(result) > 1 else 0

        if cr <= 0:
            continue

        if ctype == 'free_elective':
            options.append({
                'type': 'free_elective',
                'credits': cr,
                'label': f'Cours au choix ({cr} cr)',
            })
        elif ctype == 'minor':
            options.append({
                'type': 'minor',
                'credits': cr,
            })
        elif ctype == 'ofg':
            # Extract OFG number if present
            m = re.search(r'OFG\s*(\d)', line, re.IGNORECASE)
            ofg_num = m.group(1) if m else '?'
            m2 = re.search(r'objectif\s*(?:de\s+formation\s+générale\s+)?(\d)', line, re.IGNORECASE)
            if not m and m2:
                ofg_num = m2.group(1)
            options.append({
                'type': 'ofg',
                'credits': cr,
                'label': f'OFG {ofg_num}' if ofg_num != '?' else 'OFG',
                'ofg': ofg_num,
            })
        elif ctype in ('option_prefix', 'option_prefix_simple'):
            prefix = result[2]
            levels = result[3] if len(result) > 3 else ''
            label = f'Cours {prefix}'
            if levels:
                label += f' niveau {levels}'
            label += f' ({cr} cr)'
            # Try to extract specific course codes from following lines
            context = '\n'.join(next_lines[:15])
            codes = extract_course_codes(context)
            # Filter codes to match prefix
            matching_codes = [c for c in codes if c.startswith(prefix)]
            options.append({
                'type': 'option_prefix',
                'credits': cr,
                'label': label,
                'prefix': prefix,
                'levels': levels,
                'codes': matching_codes if matching_codes else [],
            })
        elif ctype == 'option_sigles':
            sigles = result[2]
            label = f'Cours parmi {", ".join(sigles)} ({cr} cr)'
            options.append({
                'type': 'option_sigles',
                'credits': cr,
                'label': label,
                'sigles': sigles,
            })
        elif ctype == 'option_list':
            # Extract course codes from following lines
            context = '\n'.join(next_lines[:20])
            codes = extract_course_codes(context)
            label = f'Cours à option ({cr} cr)'
            options.append({
                'type': 'option_list',
                'credits': cr,
                'label': label,
                'codes': codes[:20],
            })

    return options


# ─── Main: process all programs ───────────────────────────────────────────────

def main():
    with open(PROGRAMS_FILE) as f:
        data = json.load(f)

    # Map program names to PDF files
    pdf_files = {}
    for fname in os.listdir(PDF_DIR):
        if fname.endswith('.pdf'):
            name = fname.replace('.pdf', '')
            pdf_files[name] = os.path.join(PDF_DIR, fname)

    # Map programs to their PDF
    def find_pdf(program_name):
        # Direct match
        if program_name in pdf_files:
            return pdf_files[program_name]
        # Try partial match
        for pdf_name, path in pdf_files.items():
            if pdf_name in program_name or program_name in pdf_name:
                return path
        return None

    changes = []

    for prog in data['programs']:
        pname = prog['name']
        pdf_path = find_pdf(pname)

        if not pdf_path:
            print(f"SKIP (no PDF): {pname}")
            continue

        text = read_pdf(pdf_path)
        year_sections = split_into_years(text)

        if not year_sections:
            # Try alternate parsing for engineering and other formats
            pass

        for year_data in prog.get('years', []):
            yr = year_data.get('year', 0)
            yr_credits = year_data.get('credits', 0)

            # Calculate what's already accounted for
            existing_course_cr = sum(c.get('credits', 0) for c in year_data.get('courses', []))
            existing_opt_cr = sum(og.get('credits_required', 0) for og in year_data.get('option_groups', []))
            existing_minor_cr = year_data.get('minor_credits', 0)
            existing_total = existing_course_cr + existing_opt_cr + existing_minor_cr
            gap = yr_credits - existing_total

            if gap <= 0:
                continue

            # Get the year section from the PDF
            year_text = year_sections.get(yr, '')
            if not year_text:
                continue

            # Extract options from PDF text
            pdf_options = extract_year_options(year_text, yr)

            if not pdf_options:
                continue

            # Now figure out which options fill the gap
            # Don't add what's already accounted for
            new_option_groups = []
            new_minor_credits = 0
            added_credits = 0
            opt_id = len(year_data.get('option_groups', [])) + 1

            for opt in pdf_options:
                if added_credits >= gap:
                    break

                cr = opt['credits']
                if cr <= 0:
                    continue

                if opt['type'] == 'minor':
                    if existing_minor_cr == 0:
                        new_minor_credits += cr
                        added_credits += cr
                elif opt['type'] == 'free_elective':
                    new_option_groups.append({
                        'id': opt_id,
                        'credits_required': cr,
                        'label': opt['label'],
                        'codes': [],
                    })
                    opt_id += 1
                    added_credits += cr
                elif opt['type'] == 'ofg':
                    new_option_groups.append({
                        'id': opt_id,
                        'credits_required': cr,
                        'label': f"Banque OFG {opt.get('ofg', '')}",
                        'codes': [],
                    })
                    opt_id += 1
                    added_credits += cr
                elif opt['type'] in ('option_prefix', 'option_prefix_simple'):
                    og = {
                        'id': opt_id,
                        'credits_required': cr,
                        'label': opt['label'],
                        'codes': opt.get('codes', []),
                    }
                    if opt.get('prefix'):
                        og['prefix'] = opt['prefix']
                    if opt.get('levels'):
                        og['levels'] = opt['levels']
                    new_option_groups.append(og)
                    opt_id += 1
                    added_credits += cr
                elif opt['type'] == 'option_sigles':
                    new_option_groups.append({
                        'id': opt_id,
                        'credits_required': cr,
                        'label': opt['label'],
                        'codes': [],
                        'sigles': opt.get('sigles', []),
                    })
                    opt_id += 1
                    added_credits += cr
                elif opt['type'] == 'option_list':
                    new_option_groups.append({
                        'id': opt_id,
                        'credits_required': cr,
                        'label': opt['label'],
                        'codes': opt.get('codes', []),
                    })
                    opt_id += 1
                    added_credits += cr

            # Apply changes
            if new_option_groups or new_minor_credits > 0:
                if 'option_groups' not in year_data:
                    year_data['option_groups'] = []
                year_data['option_groups'].extend(new_option_groups)
                if new_minor_credits > 0:
                    year_data['minor_credits'] = year_data.get('minor_credits', 0) + new_minor_credits

                remaining_gap = gap - added_credits
                change_desc = f"{pname} Y{yr}: +{added_credits}cr"
                if remaining_gap > 0:
                    change_desc += f" (still {remaining_gap}cr gap)"
                changes.append(change_desc)

    # ─── Post-process: fill remaining gaps with generic entries ───────────
    # Some PDFs are hard to parse, so fill remaining gaps generically
    for prog in data['programs']:
        for year_data in prog.get('years', []):
            yr = year_data.get('year', 0)
            yr_credits = year_data.get('credits', 0)
            existing_course_cr = sum(c.get('credits', 0) for c in year_data.get('courses', []))
            existing_opt_cr = sum(og.get('credits_required', 0) for og in year_data.get('option_groups', []))
            existing_minor_cr = year_data.get('minor_credits', 0)
            gap = yr_credits - (existing_course_cr + existing_opt_cr + existing_minor_cr)

            if gap > 0:
                if 'option_groups' not in year_data:
                    year_data['option_groups'] = []
                opt_id = len(year_data['option_groups']) + 1

                # Try to determine what the gap is from the program structure
                # If it's a program with minors and we haven't assigned minor credits
                has_minor_mention = any('mineure' in str(y) for y in prog.get('years', []))

                # For remaining gap, add as "cours au choix / à option"
                year_data['option_groups'].append({
                    'id': opt_id,
                    'credits_required': gap,
                    'label': f'Cours au choix ou à option ({gap} cr)',
                    'codes': [],
                })
                changes.append(f"{prog['name']} Y{yr}: filled remaining {gap}cr gap")

    # Save
    with open(PROGRAMS_FILE, 'w') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

    print(f"\n{'='*60}")
    print(f"Applied {len(changes)} changes:")
    for c in changes:
        print(f"  {c}")

    # Verify: recheck gaps
    print(f"\n{'='*60}")
    print("Verification - remaining gaps:")
    any_gap = False
    for prog in data['programs']:
        for y in prog.get('years', []):
            yr_credits = y.get('credits', 0)
            total = (sum(c['credits'] for c in y.get('courses', []))
                    + sum(og.get('credits_required', 0) for og in y.get('option_groups', []))
                    + y.get('minor_credits', 0))
            gap = yr_credits - total
            if gap > 0:
                print(f"  {prog['name']} Y{y['year']}: {gap}cr gap")
                any_gap = True
    if not any_gap:
        print("  None! All programs fully accounted for.")

if __name__ == '__main__':
    main()
