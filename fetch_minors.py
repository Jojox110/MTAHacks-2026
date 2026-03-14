#!/usr/bin/env python3
"""Fetch all minor program details from UMoncton repertoire."""

import json
import re
import urllib.request
import urllib.parse
import time
import html

MINORS = {
    "Mineure en allemand": 58,
    "Mineure en anglais": 59,
    "Mineure en arts visuels": 274,
    "Mineure en biochimie": 2416,
    "Mineure en biologie": 110,
    "Mineure en chimie": 2417,
    "Mineure en comptabilité": 2308,
    "Mineure en compétences rédactionnelles avancées": 279,
    "Mineure en criminologie": 2405,
    "Mineure en création littéraire": 260,
    "Mineure en développement personnel et social": 155,
    "Mineure en environnement et géographie": 2394,
    "Mineure en espagnol": 249,
    "Mineure en finance": 17,
    "Mineure en français langue seconde (avancé)": 65,
    "Mineure en gestion des opérations": 18,
    "Mineure en géographie": 66,
    "Mineure en histoire": 67,
    "Mineure en informatique": 2470,
    "Mineure en intelligence artificielle": 2396,
    "Mineure en journalisme": 245,
    "Mineure en langues étrangères": 2465,
    "Mineure en linguistique et littérature": 2464,
    "Mineure en marketing": 19,
    "Mineure en mathématiques": 113,
    "Mineure en musique": 69,
    "Mineure en philosophie": 2466,
    "Mineure en physique": 114,
    "Mineure en politique publique": 2408,
    "Mineure en psychologie": 156,
    "Mineure en relations publiques": 244,
    "Mineure en science politique": 2509,
    "Mineure en sciences de l'environnement": 247,
    "Mineure en sciences de la gestion": 20,
    "Mineure en sciences sociales": 2409,
    "Mineure en sociolinguistique": 258,
    "Mineure en sociologie": 2467,
    "Mineure en statistique appliquée": 115,
    "Mineure en systèmes d'information organisationnels": 21,
    "Mineure en traduction": 76,
    "Mineure en économie": 2406,
    "Mineure en éthique appliquée": 2432,
    "Mineure en études acadiennes": 2407,
}

BASE_URL = "https://www.umoncton.ca/repertoire/programmes?programme_select={}"


def fetch_url(url):
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=30) as resp:
        return resp.read().decode("utf-8", errors="replace")


def parse_course_code(text):
    """Extract course code handling spaces."""
    m = re.match(r'([A-Z]{3,4})\s?(\d{4}[A-Z]?)', text.strip())
    if m:
        return m.group(1) + m.group(2)
    return None


def extract_courses_from_html(html_text):
    """Extract course information from HTML content."""
    courses = []
    seen = set()
    
    # Decode HTML entities
    text = html.unescape(html_text)
    
    # Find course codes and their descriptions
    # Pattern: course code followed by name, possibly with credits and prerequisites
    # Look for table rows or list items containing course codes
    
    # Try finding in table format
    rows = re.findall(r'<tr[^>]*>(.*?)</tr>', text, re.DOTALL)
    for row in rows:
        cells = re.findall(r'<td[^>]*>(.*?)</td>', row, re.DOTALL)
        if cells:
            cell_text = ' '.join(re.sub(r'<[^>]+>', ' ', c).strip() for c in cells)
            code_match = re.search(r'([A-Z]{3,4})\s?(\d{4}[A-Z]?)', cell_text)
            if code_match:
                code = code_match.group(1) + code_match.group(2)
                if code in seen:
                    continue
                seen.add(code)
                
                # Extract name (text after code)
                rest = cell_text[code_match.end():].strip()
                name = re.split(r'\d+\s*(?:cr|CR)', rest)[0].strip() if rest else ""
                name = re.sub(r'\s+', ' ', name).strip(' .-:,')
                
                # Extract credits
                cr_match = re.search(r'(\d)\s*(?:cr|CR)', cell_text)
                credits = int(cr_match.group(1)) if cr_match else 3
                
                # Extract prerequisites
                prereqs = []
                prereq_match = re.search(r'[Pp]réalable[s]?\s*:?\s*([^<\n]+)', cell_text)
                if prereq_match:
                    prereq_codes = re.findall(r'[A-Z]{3,4}\s?\d{4}[A-Z]?', prereq_match.group(1))
                    prereqs = [re.sub(r'\s', '', c) for c in prereq_codes]
                
                if name:
                    courses.append({
                        "code": code,
                        "name": name[:100],
                        "credits": credits,
                        "prerequisites": prereqs,
                    })
    
    # If no table rows found, try plain text extraction
    if not courses:
        # Remove HTML tags
        plain = re.sub(r'<[^>]+>', '\n', text)
        plain = html.unescape(plain)
        
        for m in re.finditer(r'([A-Z]{3,4})\s?(\d{4}[A-Z]?)\s+([^\n]+)', plain):
            code = m.group(1) + m.group(2)
            if code in seen:
                continue
            seen.add(code)
            
            rest = m.group(3).strip()
            name = re.split(r'\[\s*[Pp]réalable', rest)[0].strip()
            name = re.split(r'\(\s*[Pp]réalable', name)[0].strip()
            name = re.sub(r'\s+\d+\s*$', '', name).strip(' .-:,')
            
            prereqs = []
            prereq_match = re.search(r'[Pp]réalable[s]?\s*:?\s*([^\]\)]+)', rest)
            if prereq_match:
                prereq_codes = re.findall(r'[A-Z]{3,4}\s?\d{4}[A-Z]?', prereq_match.group(1))
                prereqs = [re.sub(r'\s', '', c) for c in prereq_codes]
            
            if name and len(name) > 2:
                courses.append({
                    "code": code,
                    "name": name[:100],
                    "credits": 3,
                    "prerequisites": prereqs,
                })
    
    return courses


def extract_program_details(html_text, program_name):
    """Extract program details from the full page HTML."""
    text = html.unescape(html_text)
    
    # Find total credits
    cr_match = re.search(r'(\d+)\s*(?:CR|cr|crédits)', text)
    total_credits = int(cr_match.group(1)) if cr_match else 24
    
    # Find the program-specific section
    # Look for the content after the program name
    courses = extract_courses_from_html(html_text)
    
    # Separate required vs elective
    required = []
    elective = []
    
    # Check for "obligatoire" and "option" sections
    plain = re.sub(r'<[^>]+>', '\n', text)
    
    obligatoire_section = re.search(r'[Cc]ours\s+obligatoire', plain)
    option_section = re.search(r'[Cc]ours\s+(?:à\s+)?option', plain)
    
    return {
        "name": program_name,
        "total_credits": total_credits if total_credits <= 48 else 24,
        "courses": courses,
    }


def main():
    results = []
    
    for name, prog_id in sorted(MINORS.items()):
        url = BASE_URL.format(prog_id)
        print(f"Fetching: {name} (ID: {prog_id})...", end=" ", flush=True)
        
        try:
            page_html = fetch_url(url)
            details = extract_program_details(page_html, name)
            results.append(details)
            print(f"-> {len(details['courses'])} courses")
        except Exception as e:
            print(f"ERROR: {e}")
            results.append({"name": name, "total_credits": 24, "courses": [], "error": str(e)})
        
        time.sleep(0.3)  # Be polite
    
    with open("minors_raw.json", "w", encoding="utf-8") as f:
        json.dump(results, f, ensure_ascii=False, indent=2)
    
    print(f"\nSaved {len(results)} minors to minors_raw.json")
    total = sum(len(r["courses"]) for r in results)
    print(f"Total courses: {total}")
    zeros = [r["name"] for r in results if len(r["courses"]) == 0]
    if zeros:
        print(f"Minors with 0 courses: {len(zeros)}")
        for z in zeros:
            print(f"  - {z}")


if __name__ == "__main__":
    main()
