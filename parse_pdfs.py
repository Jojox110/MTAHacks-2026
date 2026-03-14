#!/usr/bin/env python3
"""Parse all program PDF roadmaps into a structured JSON file."""

import json
import os
import re
import pymupdf

PDF_DIR = "Major_minorFeuilleDeRoute"
OUTPUT_FILE = "programs.json"

# Regex that matches course codes with or without a space: "INFO1101" or "INFO 1101"
CODE_PATTERN = r'([A-Z]{3,4})\s?(\d{4}[A-Z]?)'
CODE_LINE_START = r'^(' + CODE_PATTERN + r')\b'


def normalize_code(match_text):
    """Normalize a course code by removing the space: 'ARVI 1304' -> 'ARVI1304'."""
    return re.sub(r'\s+', '', match_text)


def extract_text(pdf_path):
    """Extract all text from a PDF."""
    doc = pymupdf.open(pdf_path)
    text = ""
    for page in doc:
        text += page.get_text() + "\n"
    doc.close()
    return text


def determine_program_type(filename, text):
    """Determine if program is majeure, mineure, certificat, diplôme, etc."""
    lower_text = text.lower()
    lower_name = filename.lower()
    if "mineure" in lower_name or "mineure" in lower_text[:500]:
        return "mineure"
    if "certificat" in lower_name or "certificat" in lower_text[:500]:
        return "certificat"
    if "diplôme" in lower_name or "diplôme" in lower_text[:500] or "d.s.s." in lower_name:
        return "diplôme"
    if "majeure" in lower_text[:500]:
        return "majeure"
    return "majeure"


def determine_degree(text):
    """Extract degree name from text."""
    patterns = [
        r"Baccalauréat ès sciences appliquées",
        r"Baccalauréat ès sciences",
        r"Baccalauréat ès arts",
        r"Baccalauréat en [^(\n,]+",
        r"B\.\s?Sc\.\s?(?:soc\.)?\s*\([^)]+\)",
        r"Bachelor of [^(\n]+",
        r"Certificat en [^(\n]+",
        r"Diplôme [^(\n]+",
    ]
    for pat in patterns:
        m = re.search(pat, text[:1500], re.IGNORECASE)
        if m:
            return m.group(0).strip().rstrip(")")
    return ""


def extract_program_name(filename, text):
    """Extract the program name."""
    name = filename.replace(".pdf", "")
    return name


def extract_all_codes(text):
    """Find all course codes in text, handling spaces."""
    return re.findall(r'[A-Z]{3,4}\s?\d{4}[A-Z]?', text)


def extract_prerequisites(name_text):
    """Extract prerequisites from course description text."""
    prereqs = []
    prereq_matches = re.findall(
        r'[pP]réalable[s]?\s*:?\s*([^]\)}{]+?)(?:[\]\)}]|$)',
        name_text
    )
    for match in prereq_matches:
        codes = extract_all_codes(match)
        prereqs.extend(normalize_code(c) for c in codes)
    # Also match pattern: "– (CODE1234)" or "- (CODE1234 ou CODE5678)"
    paren_matches = re.findall(r'–\s*\(([^)]+)\)', name_text)
    for match in paren_matches:
        codes = extract_all_codes(match)
        prereqs.extend(normalize_code(c) for c in codes)
    return list(set(prereqs))


def extract_corequisites(name_text):
    """Extract corequisites from course description text."""
    coreqs = []
    coreq_matches = re.findall(
        r'[cC]oncomitant\s*:?\s*([^]\)]+)',
        name_text
    )
    for match in coreq_matches:
        codes = extract_all_codes(match)
        coreqs.extend(normalize_code(c) for c in codes)
    return list(set(coreqs))


def is_section_header(line):
    """Check if a line is a section header (not a course)."""
    patterns = [
        r'^(Première|Deuxième|Troisième|Quatrième|Cinquième)',
        r'^(V\.|VI\.|VII\.|VIII\.|I\.|II\.|III\.|IV\.)\s',
        r'^[A-H]\.\s+(Discipline|Formation|Disciplines|Mineure)',
        r'^(Discipline principale|Formation fondamentale|Disciplines connexes)',
        r'^(Tableau|Formulaire|Cours exigés|Notes?\s*:)',
        r'^(Choisir|Objectif)',
        r'^(Passerelle)',
    ]
    for pat in patterns:
        if re.match(pat, line.strip()):
            return True
    return False


def parse_courses_from_text(text):
    """Extract all courses mentioned in the text with their details."""
    courses = []
    seen_codes = set()
    lines = text.split('\n')

    i = 0
    while i < len(lines):
        line = lines[i].strip()

        # Try to find course codes (with or without space)
        code_match = re.match(r'^([A-Z]{3,4})\s?(\d{4}[A-Z]?)\b', line)
        if code_match:
            raw_code = code_match.group(0)
            code = normalize_code(raw_code)
            rest = line[len(raw_code):].strip()

            # Collect continuation lines
            full_text = rest
            j = i + 1
            while j < len(lines):
                next_line = lines[j].strip()
                # Stop if we hit another course code or section header
                if re.match(r'^[A-Z]{3,4}\s?\d{4}', next_line):
                    break
                if is_section_header(next_line):
                    break
                if next_line == '':
                    j += 1
                    continue
                # Check if it's just a number (credits)
                if re.match(r'^\d+$', next_line):
                    full_text += " " + next_line
                    j += 1
                    break
                full_text += " " + next_line
                j += 1

            # Extract course name (before any bracket/prerequisite info)
            # Remove OFG references
            clean_text = re.sub(r'OFG\s*\d+', '', full_text)

            name_match = re.match(r'^([^[\(–{]+)', clean_text)
            course_name = name_match.group(1).strip() if name_match else clean_text.strip()

            # Clean trailing numbers (credits)
            credits = None
            credit_at_end = re.search(r'\s+(\d+)\s*$', course_name)
            if credit_at_end and 1 <= int(credit_at_end.group(1)) <= 6:
                credits = int(credit_at_end.group(1))
                course_name = course_name[:credit_at_end.start()].strip()

            # Also look for credits as standalone number in full text
            if credits is None:
                credit_match = re.search(r'\b(\d)\s*$', full_text.strip())
                if credit_match:
                    credits = int(credit_match.group(1))

            prereqs = extract_prerequisites(full_text)
            coreqs = extract_corequisites(full_text)

            # Clean course name
            course_name = re.sub(r'\[.*$', '', course_name).strip()
            course_name = re.sub(r'\(préalable.*$', '', course_name, flags=re.IGNORECASE).strip()
            course_name = re.sub(r'\(concomitant.*$', '', course_name, flags=re.IGNORECASE).strip()
            course_name = re.sub(r'\*.*$', '', course_name).strip()
            course_name = re.sub(r'-\s*$', '', course_name).strip()
            course_name = course_name.strip(' ,.:;-')

            if code not in seen_codes and course_name and len(course_name) > 1:
                courses.append({
                    "code": code,
                    "name": course_name,
                    "credits": credits if credits and 1 <= credits <= 6 else 3,
                    "prerequisites": prereqs,
                    "corequisites": coreqs,
                })
                seen_codes.add(code)

            i = j
            continue
        i += 1

    return courses


def extract_years(text):
    """Extract year-by-year course organization."""
    years = []
    year_patterns = [
        (1, r'Première année'),
        (2, r'Deuxième année'),
        (3, r'Troisième année'),
        (4, r'Quatrième année'),
        (5, r'Cinquième année'),
    ]

    year_positions = []
    for year_num, pattern in year_patterns:
        for m in re.finditer(pattern, text):
            year_positions.append((m.start(), year_num))

    # Also handle "Passerelle" as a year-like section
    for m in re.finditer(r'Passerelle', text):
        year_positions.append((m.start(), 0))

    # Handle Génie-style: "1re ANNÉE", "2e ANNÉE", etc.
    genie_patterns = [
        (1, r'1(?:re|ère)\s+ANNÉE'),
        (2, r'2e\s+ANNÉE'),
        (3, r'3e\s+ANNÉE'),
        (4, r'4e\s+ANNÉE'),
        (5, r'5e\s+ANNÉE'),
    ]
    for year_num, pattern in genie_patterns:
        for m in re.finditer(pattern, text, re.IGNORECASE):
            year_positions.append((m.start(), year_num))

    year_positions.sort()

    # Deduplicate: keep only first occurrence of each year number
    seen_years = set()
    deduped = []
    for pos, year_num in year_positions:
        if year_num not in seen_years:
            deduped.append((pos, year_num))
            seen_years.add(year_num)
    year_positions = deduped

    # Also find "Tableau 2" or "Cours exigés" section to exclude from year parsing
    tableau2_pos = len(text)
    for m in re.finditer(r'Tableau\s*2|Cours exigés pour atteindre', text):
        tableau2_pos = min(tableau2_pos, m.start())

    for idx, (pos, year_num) in enumerate(year_positions):
        end_pos = year_positions[idx + 1][0] if idx + 1 < len(year_positions) else tableau2_pos
        section_text = text[pos:end_pos]

        # Get credits for this year
        credits_match = re.search(r'(\d+)\s*crédits', section_text[:150])
        year_credits = int(credits_match.group(1)) if credits_match else 30

        courses = parse_courses_from_text(section_text)

        label = f"Année {year_num}" if year_num > 0 else "Passerelle"
        years.append({
            "year": year_num,
            "label": label,
            "credits": year_credits,
            "courses": courses,
        })

    return years


def parse_pdf(filepath, filename):
    """Parse a single PDF into structured data."""
    text = extract_text(filepath)

    program_name = extract_program_name(filename, text)
    program_type = determine_program_type(filename, text)
    degree = determine_degree(text)

    years = extract_years(text)

    # Collect all unique courses across years
    all_courses = []
    seen = set()
    for year in years:
        for course in year["courses"]:
            if course["code"] not in seen:
                all_courses.append(course)
                seen.add(course["code"])

    # If no years found or very few courses, parse entire text
    if not years or len(all_courses) < 3:
        fallback_courses = parse_courses_from_text(text)
        for course in fallback_courses:
            if course["code"] not in seen:
                all_courses.append(course)
                seen.add(course["code"])

    total_credits = sum(y["credits"] for y in years) if years else None

    return {
        "name": program_name,
        "type": program_type,
        "degree": degree,
        "total_credits": total_credits,
        "years": years,
        "all_courses": all_courses,
    }


def main():
    programs = []
    pdf_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), PDF_DIR)

    pdf_files = sorted([f for f in os.listdir(pdf_dir) if f.endswith('.pdf')])
    print(f"Found {len(pdf_files)} PDF files")

    for filename in pdf_files:
        filepath = os.path.join(pdf_dir, filename)
        try:
            program = parse_pdf(filepath, filename)
            programs.append(program)
            course_count = len(program["all_courses"])
            print(f"  Parsed: {filename} -> {course_count} courses, {len(program['years'])} years")
        except Exception as e:
            print(f"  ERROR parsing {filename}: {e}")
            import traceback
            traceback.print_exc()

    output_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), OUTPUT_FILE)
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(programs, f, ensure_ascii=False, indent=2)

    print(f"\nWrote {len(programs)} programs to {OUTPUT_FILE}")
    total_courses = sum(len(p["all_courses"]) for p in programs)
    print(f"Total unique courses across all programs: {total_courses}")

    # Report programs with 0 courses
    zero_course = [p["name"] for p in programs if len(p["all_courses"]) == 0]
    if zero_course:
        print(f"\nWARNING: {len(zero_course)} programs with 0 courses:")
        for name in zero_course:
            print(f"  - {name}")


if __name__ == "__main__":
    main()
