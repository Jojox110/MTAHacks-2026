#!/usr/bin/env python3
"""Extract OFG requirements from all program PDFs and update programs.json."""

import json
import os
import re
import pymupdf

PDF_DIR = "Major_minorFeuilleDeRoute"

def extract_text(pdf_path):
    doc = pymupdf.open(pdf_path)
    text = ""
    for page in doc:
        text += page.get_text() + "\n"
    doc.close()
    return text

def extract_ofg_from_pdf(pdf_path):
    """Extract OFG requirements using multiple strategies."""
    text = extract_text(pdf_path)
    if len(text.strip()) < 10:
        return [], {}

    lines = text.split('\n')

    open_ofgs = set()
    fulfilled = {}  # OFG -> [course_codes]

    # Strategy 1: Génie-style table format
    # Pattern: "OFG N : description" followed by course code or "choix"
    for i, line in enumerate(lines):
        m = re.match(r'^\s*OFG\s*(\d)\s*:\s*.+', line.strip())
        if m:
            ofg_num = m.group(1)
            ofg_key = f"OFG{ofg_num}"
            # Next non-empty line should be course code or "choix"
            for j in range(i+1, min(i+3, len(lines))):
                next_line = lines[j].strip()
                if not next_line:
                    continue
                if next_line.lower() in ('choix', 'au choix'):
                    open_ofgs.add(ofg_key)
                else:
                    codes = re.findall(r'[A-Z]{3,4}\s?\d{4}[A-Z]?', next_line)
                    if codes:
                        fulfilled.setdefault(ofg_key, [])
                        for c in codes:
                            clean = re.sub(r'\s+', '', c).rstrip('*')
                            if clean not in fulfilled[ofg_key]:
                                fulfilled[ofg_key].append(clean)
                    elif 'choix' in next_line.lower():
                        open_ofgs.add(ofg_key)
                break

    # Strategy 2: Inline course annotations - "COURSE_CODE ... (OFG N)"
    for line in lines:
        m = re.search(r'([A-Z]{3,4})\s?(\d{4}[A-Z]?)\s+.+?\(OFG\s*(\d)\)', line)
        if m:
            code = m.group(1) + m.group(2)
            ofg_key = f"OFG{m.group(3)}"
            fulfilled.setdefault(ofg_key, [])
            if code not in fulfilled[ofg_key]:
                fulfilled[ofg_key].append(code)

    # Strategy 3: Explicit descriptive text
    joined = ' '.join(l.strip() for l in lines)

    # "OFG N au moyen du cours CODE" or "OFG N au moyen des cours CODE ET CODE"
    for m in re.finditer(r'OFG\s*(\d)\s+au moyen (?:du|des) cours?\s+(.+?)(?:;|\.|\n|OFG)', joined):
        ofg_key = f"OFG{m.group(1)}"
        course_text = m.group(2)
        codes = re.findall(r'[A-Z]{3,4}\s?\d{4}[A-Z]?', course_text)
        if codes:
            fulfilled.setdefault(ofg_key, [])
            for c in codes:
                clean = re.sub(r'\s+', '', c)
                if clean not in fulfilled[ofg_key]:
                    fulfilled[ofg_key].append(clean)

    # Strategy 4: "Choisir...banque...formation générale...OFG N" patterns
    for i, line in enumerate(lines):
        context = ' '.join(lines[max(0,i):min(len(lines),i+4)])
        if 'choisir' in context.lower() and ('banque' in context.lower() or 'formation générale' in context.lower()):
            ofg_matches = re.findall(r"OFG\s*(\d)", context)
            for num in ofg_matches:
                ofg_key = f"OFG{num}"
                if ofg_key not in fulfilled:
                    open_ofgs.add(ofg_key)

    # Strategy 5: "rubriques suivantes : OFG N – ..." pattern
    for m in re.finditer(r'rubriques?\s+suivantes?\s*:?\s*(.+?)(?:\.|$)', joined):
        chunk = m.group(1)
        for num in re.findall(r'OFG\s*(\d)', chunk):
            ofg_key = f"OFG{num}"
            if ofg_key not in fulfilled:
                open_ofgs.add(ofg_key)

    # Strategy 6: Look for standalone "OFG N" near "Cours au choix" sections
    for i, line in enumerate(lines):
        m = re.match(r'^\s*OFG\s*(\d)\s*$', line.strip())
        if m:
            ofg_key = f"OFG{m.group(1)}"
            context = ' '.join(lines[max(0,i-5):i+1])
            if 'choix' in context.lower() or 'choisir' in context.lower():
                if ofg_key not in fulfilled:
                    open_ofgs.add(ofg_key)

    # Strategy 7: Column-header style where course line ends with "N OFG N"
    # e.g. "3 OFG 4" meaning 3 credits, OFG 4
    for i, line in enumerate(lines):
        m = re.match(r'^\s*(\d)\s+OFG\s*(\d)\s*$', line.strip())
        if m:
            ofg_key = f"OFG{m.group(2)}"
            for j in range(i-1, max(0, i-5), -1):
                code_m = re.search(r'([A-Z]{3,4})\s?(\d{4}[A-Z]?)', lines[j])
                if code_m:
                    code = re.sub(r'\s+', '', code_m.group(0))
                    fulfilled.setdefault(ofg_key, [])
                    if code not in fulfilled[ofg_key]:
                        fulfilled[ofg_key].append(code)
                    break

    # Strategy 8: Tableau 2 format (Ed-Musique style)
    # "OFG N" on one line, description on next, then course code line like "CODE1234 Course name"
    # or "Cours obligatoire de la formation générale" (meaning fulfilled by program)
    # Detect if we're in a "Tableau 2" or "Cours exigés pour atteindre les objectifs" section
    tableau2_start = None
    for i, line in enumerate(lines):
        if re.search(r'Tableau\s*2|Cours exigés pour atteindre les objectifs', line):
            tableau2_start = i
            break
        if re.search(r'Objectif de formation générale.*Cours permettant', ' '.join(lines[max(0,i):min(len(lines),i+2)])):
            tableau2_start = i
            break

    if tableau2_start:
        section_lines = lines[tableau2_start:]
        i = 0
        while i < len(section_lines):
            line = section_lines[i].strip()
            m = re.match(r'^OFG\s*(\d)$', line)
            if m:
                ofg_key = f"OFG{m.group(1)}"
                # Skip description lines, look for course codes or "Choisir"/"choix"
                found_courses = []
                is_open = False
                for j in range(i+1, min(i+12, len(section_lines))):
                    sub = section_lines[j].strip()
                    if re.match(r'^OFG\s*\d$', sub):
                        break  # next OFG
                    code_m = re.match(r'^([A-Z]{3,4})\s?(\d{4}[A-Z]?)\s', sub)
                    if code_m:
                        code = code_m.group(1) + code_m.group(2)
                        found_courses.append(code)
                    if 'choisir' in sub.lower() and ('banque' in sub.lower() or 'formation générale' in sub.lower()):
                        is_open = True

                if found_courses and not is_open:
                    fulfilled.setdefault(ofg_key, [])
                    for c in found_courses:
                        if c not in fulfilled[ofg_key]:
                            fulfilled[ofg_key].append(c)
                elif is_open:
                    if ofg_key not in fulfilled:
                        open_ofgs.add(ofg_key)
            i += 1

    # Strategy 9: "Choisir...formation générale...permettant de répondre...OFG N"
    # (Anglais-style multi-line)
    for i, line in enumerate(lines):
        context = ' '.join(lines[max(0,i):min(len(lines),i+4)])
        if ('choisir' in context.lower() and 'formation générale' in context.lower()
            and 'répondre' in context.lower()):
            ofg_matches = re.findall(r"OFG\s*(\d)", context)
            for num in ofg_matches:
                ofg_key = f"OFG{num}"
                if ofg_key not in fulfilled:
                    open_ofgs.add(ofg_key)

    # Remove open OFGs that are actually fulfilled
    open_ofgs -= set(fulfilled.keys())

    return sorted(open_ofgs), fulfilled


def main():
    with open('Frontend/public/programs.json', encoding='utf-8') as f:
        data = json.load(f)

    programs = data.get('programs', data) if isinstance(data, dict) else data

    pdf_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), PDF_DIR)

    updated = 0
    for prog in programs:
        name = prog.get('name', '')
        pdf_path = os.path.join(pdf_dir, name + '.pdf')

        if not os.path.exists(pdf_path):
            continue

        open_ofgs, fulfilled = extract_ofg_from_pdf(pdf_path)

        if open_ofgs or fulfilled:
            new_open = [{"ofg": o} for o in sorted(open_ofgs)]
            prog['ofg_requirements'] = {
                'open': new_open,
                'fulfilled': fulfilled
            }
            updated += 1
            open_names = [o['ofg'] for o in new_open]
            print(f"OK: {name} open={open_names} fulfilled={sorted(fulfilled.keys())}")
        else:
            existing = prog.get('ofg_requirements', {})
            if existing.get('open') or existing.get('fulfilled'):
                print(f"KEEP EXISTING: {name}")
            else:
                print(f"NO DATA: {name}")

    # Write back
    if isinstance(data, dict):
        data['programs'] = programs
    with open('Frontend/public/programs.json', 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    print(f"\nUpdated {updated} programs")

    # Final report
    all_programs = [p for p in programs if p.get('type') in ('majeure', None)]
    empty = [p['name'] for p in all_programs
             if not p.get('ofg_requirements', {}).get('open')
             and not p.get('ofg_requirements', {}).get('fulfilled')]
    if empty:
        print(f"\nMajeure programs still without OFG ({len(empty)}):")
        for n in empty:
            print(f"  - {n}")

    # Count coverage
    with_ofg = sum(1 for p in programs if p.get('ofg_requirements', {}).get('open') or p.get('ofg_requirements', {}).get('fulfilled'))
    print(f"\nTotal: {with_ofg}/{len(programs)} programs have OFG data")


if __name__ == "__main__":
    main()
