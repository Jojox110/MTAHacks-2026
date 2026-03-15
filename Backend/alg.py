"""
4-Year University Schedule Optimizer.

Places mandatory courses, fulfills OFG requirements, and delegates elective filling to the LLM.
"""

from __future__ import annotations

import json
import os
from collections import defaultdict
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

# Project root (parent of Backend/)
PROJECT_ROOT = Path(__file__).resolve().parent.parent

DAYS_ORDER = ["Lu", "Ma", "Me", "Je", "Ve", "Sa", "Di"]


def _parse_days(day_str: str) -> list[str]:
    """Parse 'MaVe' -> ['Ma','Ve'], 'LuMeVe' -> ['Lu','Me','Ve']."""
    if not day_str or day_str == "À dét.":
        return []
    result = []
    remaining = day_str
    while remaining:
        found = False
        for abbr in DAYS_ORDER:
            if remaining.startswith(abbr):
                result.append(abbr)
                remaining = remaining[len(abbr) :]
                found = True
                break
        if not found:
            remaining = remaining[1:]
    return [d for d in result if d in ["Lu", "Ma", "Me", "Je", "Ve"]]


def _parse_time(time_str: str) -> tuple[float, float] | None:
    """Parse '0830-0945' -> (8.5, 9.75)."""
    if not time_str or time_str == "À dét.":
        return None
    parts = time_str.split("-")
    if len(parts) != 2:
        return None

    def _to_hours(t: str) -> float:
        t = t.strip()
        if len(t) >= 4:
            h = int(t[:2])
            m = int(t[2:4]) if len(t) >= 4 else 0
            return h + m / 60.0
        return 0.0

    return (_to_hours(parts[0]), _to_hours(parts[1]))


def _slots_overlap(a_days: list[str], a_start: float, a_end: float,
                   b_days: list[str], b_start: float, b_end: float) -> bool:
    """Check if two time blocks overlap (same day + overlapping time)."""
    for day in a_days:
        if day in b_days:
            if a_start < b_end and b_start < a_end:
                return True
    return False


def _section_slots(section: dict) -> list[tuple[str, float, float]]:
    """Extract (day, start, end) slots from a schedule section."""
    slots = []
    for s in section.get("schedule", []):
        days = _parse_days(s.get("days", "") or "")
        parsed = _parse_time(s.get("time", "") or "")
        if not days or not parsed:
            continue
        start, end = parsed
        for d in days:
            slots.append((d, start, end))
    return slots


def _normalize_ofg(ofg: str | None) -> str | None:
    """Normalize 'OFG 5' -> 'OFG5'."""
    if not ofg:
        return None
    ofg = ofg.strip().replace(" ", "")
    if ofg.upper().startswith("OFG"):
        return ofg
    return None


@dataclass
class PlacedCourse:
    code: str
    semester_key: str
    nrc: str
    groupe: str
    schedule: list
    slots: list[tuple[str, float, float]]


@dataclass
class ScheduleOptimizer:
    programs: dict
    classes: list[dict]
    schedules: dict[str, list]  # "automne"|"hiver"|"printemps_ete" -> sections
    ofg_index: dict[str, list[str]] = field(default_factory=dict)  # OFG5 -> [sigle, ...]
    course_by_sigle: dict[str, dict] = field(default_factory=dict)
    schedule_by_sigle: dict[str, list] = field(default_factory=dict)  # sigle -> sections per semester type

    @classmethod
    def load(cls, data_dir: Path | None = None) -> "ScheduleOptimizer":
        data_dir = data_dir or PROJECT_ROOT

        with open(data_dir / "programs.json", encoding="utf-8") as f:
            data = json.load(f)
        programs = data

        with open(data_dir / "classes.json", encoding="utf-8") as f:
            classes = json.load(f)

        schedules = {}
        for key, filename in [
            ("automne", "schedule_automne_2026_moncton_fix.json"),
            ("hiver", "schedule_hiver_2026_moncton_fix.json"),
            ("printemps_ete", "schedule_printemps_ete_2026_moncton_fix.json"),
        ]:
            path = data_dir / filename
            if path.exists():
                with open(path, encoding="utf-8") as f:
                    schedules[key] = json.load(f)
            else:
                schedules[key] = []

        # Build OFG index from classes.json
        ofg_index = defaultdict(list)
        course_by_sigle = {}
        for c in classes:
            sigle = c.get("sigle")
            if not sigle:
                continue
            course_by_sigle[sigle] = c
            ofg = _normalize_ofg(c.get("ofg"))
            if ofg:
                ofg_index[ofg].append(sigle)

        # Build schedule index: sigle -> {automne: [...], hiver: [...], printemps_ete: [...]}
        schedule_by_sigle = defaultdict(lambda: defaultdict(list))
        for sem_type, sections in schedules.items():
            for sec in sections:
                sigle = sec.get("sigle")
                if sigle:
                    schedule_by_sigle[sigle][sem_type].append(sec)

        return cls(
            programs=programs,
            classes=classes,
            schedules=schedules,
            ofg_index=dict(ofg_index),
            course_by_sigle=course_by_sigle,
            schedule_by_sigle=dict(schedule_by_sigle),
        )

    def _get_program(self, program_name: str) -> dict | None:
        for p in self.programs.get("programs", []):
            if p.get("name") == program_name:
                return p
        return None

    # The only real semesters — must match the 3 schedule JSON files
    REAL_SEMESTERS = [
        ("Hiver 2026",        "hiver"),
        ("Printemps-Été 2026","printemps_ete"),
        ("Automne 2026",      "automne"),
    ]

    def _semester_type(self, idx: int) -> str:
        return self.REAL_SEMESTERS[idx % len(self.REAL_SEMESTERS)][1]

    def _semester_key(self, idx: int) -> str:
        return self.REAL_SEMESTERS[idx % len(self.REAL_SEMESTERS)][0]

    def _flatten_prereqs(self, prereqs: Any) -> list[list[str]]:
        """Convert prerequisites to list of OR-groups. [[A,B], C] -> [[A,B],[C]]."""
        if not prereqs:
            return []
        if isinstance(prereqs, str):
            return [[prereqs.strip()]] if prereqs.strip() else []
        result = []
        for p in prereqs:
            if isinstance(p, list):
                result.append([str(x).strip() for x in p if x])
            else:
                result.append([str(p).strip()])
        return result

    def _prereqs_satisfied(self, prereqs: list[list[str]], completed: set[str]) -> bool:
        """All OR-groups must have at least one completed."""
        for group in prereqs:
            if not any(c in completed for c in group):
                return False
        return True

    def _topological_order(self, courses: list[dict]) -> list[dict]:
        """Topological sort by prerequisites (simplified: place by prereq depth)."""
        completed: set[str] = set()
        result = []
        remaining = list(courses)
        max_iter = len(courses) * 2
        for _ in range(max_iter):
            if not remaining:
                break
            added = []
            for c in remaining:
                code = c.get("code", "")
                prereqs = self._flatten_prereqs(c.get("prerequisites") or c.get("corequisites") or [])
                if self._prereqs_satisfied(prereqs, completed):
                    result.append(c)
                    completed.add(code)
                    added.append(c)
            for c in added:
                remaining.remove(c)
            if not added:
                # No progress - add remaining (cycle or missing prereqs)
                result.extend(remaining)
                break
        return result

    def _find_non_conflicting_section(
        self,
        sigle: str,
        semester_type: str,
        used_slots: list[tuple[str, float, float]],
    ) -> tuple[dict, list[tuple[str, float, float]]] | None:
        sections = self.schedule_by_sigle.get(sigle, {}).get(semester_type, [])
        for sec in sections:
            slots = _section_slots(sec)
            if not slots:
                continue
            conflict = False
            for d, start, end in slots:
                for ud, us, ue in used_slots:
                    if _slots_overlap([d], start, end, [ud], us, ue):
                        conflict = True
                        break
                if conflict:
                    break
            if not conflict:
                return (sec, slots)
        return None

    # Maximum courses per semester — must match the target used in fill_ofg and get_blanks_per_semester
    MAX_PER_SEMESTER = 5

    def place_mandatory(
        self,
        program: dict,
        minor: dict | None = None,
        already_completed: set[str] | None = None,
    ) -> tuple[dict[str, list[str]], dict[str, dict], list[PlacedCourse]]:
        """
        Place all mandatory courses. Returns (schedule, sections, placed_list).
        schedule: { "Automne 2026": ["CODE1", ...], ... }
        sections: { "CODE1": { nrc, groupe, schedule }, ... }
        already_completed: course codes the user has already completed (excluded from placement).
        """
        schedule: dict[str, list[str]] = {self._semester_key(i): [] for i in range(len(self.REAL_SEMESTERS))}
        sections: dict[str, dict] = {}
        placed: list[PlacedCourse] = []
        used_slots: dict[str, list[tuple[str, float, float]]] = {self._semester_key(i): [] for i in range(len(self.REAL_SEMESTERS))}
        already_completed = already_completed or set()

        # Collect mandatory courses from program
        mandatory: list[dict] = []
        for year_data in program.get("years", []):
            for c in year_data.get("courses", []):
                if c.get("type") == "obligatoire":
                    mandatory.append(c)

        # Minor required courses
        if minor:
            for c in minor.get("required_courses", []):
                mandatory.append({"code": c["code"], "credits": c.get("credits", 3), "prerequisites": c.get("prerequisites", [])})

        # Deduplicate by code
        seen_codes = set()
        unique_mandatory = []
        for c in mandatory:
            code = c.get("code", "")
            if code and code not in seen_codes:
                seen_codes.add(code)
                unique_mandatory.append(c)

        # Build the set of all codes that are mandatory in this program.
        # Any prerequisite NOT in this set is assumed to be an external/transfer
        # prerequisite (e.g. high-school math) and is treated as already satisfied.
        mandatory_codes = {c.get("code", "") for c in unique_mandatory}

        ordered = self._topological_order(unique_mandatory)
        # Seed completed with courses the user has already finished so they don't get re-placed
        completed: set[str] = set(already_completed)

        def _prereqs_ok(prereqs: list[list[str]], prior: set[str]) -> bool:
            """Check prereqs; treats groups whose options are all external to the program as satisfied."""
            for group in prereqs:
                if any(c in prior for c in group):
                    continue
                # If every option in this group is external to the mandatory course list,
                # treat as auto-satisfied (e.g. high-school prerequisites).
                if all(c not in mandatory_codes for c in group):
                    continue
                return False
            return True

        for course in ordered:
            code = course.get("code", "")
            if not code:
                continue

            # Skip if user already completed this course
            if code in already_completed:
                completed.add(code)
                continue

            # Skip entirely if the course has no sections in any semester schedule
            if code not in self.schedule_by_sigle:
                continue

            prereqs = self._flatten_prereqs(course.get("prerequisites") or course.get("corequisites") or [])
            placed_in_sem = False

            for sem_idx in range(len(self.REAL_SEMESTERS)):
                sem_key = self._semester_key(sem_idx)
                # Only courses placed in EARLIER semesters satisfy prerequisites
                prior = set(already_completed)
                for i in range(sem_idx):
                    prior.update(schedule.get(self._semester_key(i), []))

                if not _prereqs_ok(prereqs, prior):
                    continue

                if len(schedule[sem_key]) >= self.MAX_PER_SEMESTER:
                    continue
                sem_type = self._semester_type(sem_idx)
                result = self._find_non_conflicting_section(code, sem_type, used_slots[sem_key])
                if result:
                    sec, slots = result
                    schedule[sem_key].append(code)
                    sections[code] = {"nrc": sec.get("nrc", ""), "groupe": sec.get("groupe", ""), "schedule": sec.get("schedule", [])}
                    placed.append(PlacedCourse(code=code, semester_key=sem_key, nrc=sec.get("nrc", ""), groupe=sec.get("groupe", ""), schedule=sec.get("schedule", []), slots=slots))
                    used_slots[sem_key].extend(slots)
                    completed.add(code)
                    placed_in_sem = True
                    break

            if not placed_in_sem:
                # Last resort: try each semester using only its correct semester type.
                # Prerequisites must still come from earlier semesters.
                for sem_idx in range(len(self.REAL_SEMESTERS)):
                    sem_key = self._semester_key(sem_idx)
                    prior = set(already_completed)
                    for i in range(sem_idx):
                        prior.update(schedule.get(self._semester_key(i), []))
                    if not _prereqs_ok(prereqs, prior):
                        continue
                    if len(schedule[sem_key]) >= self.MAX_PER_SEMESTER:
                        continue
                    sem_type = self._semester_type(sem_idx)
                    result = self._find_non_conflicting_section(code, sem_type, used_slots[sem_key])
                    if result:
                        sec, slots = result
                        schedule[sem_key].append(code)
                        sections[code] = {"nrc": sec.get("nrc", ""), "groupe": sec.get("groupe", ""), "schedule": sec.get("schedule", [])}
                        placed.append(PlacedCourse(code=code, semester_key=sem_key, nrc=sec.get("nrc", ""), groupe=sec.get("groupe", ""), schedule=sec.get("schedule", []), slots=slots))
                        used_slots[sem_key].extend(slots)
                        completed.add(code)
                        placed_in_sem = True
                        break
                # If still not placed, skip: prerequisites cannot be satisfied within
                # the available semesters — better to omit than to violate ordering.

        return schedule, sections, placed

    def fill_ofg(
        self,
        program: dict,
        schedule: dict[str, list[str]],
        sections: dict[str, dict],
        used_slots: dict[str, list[tuple[str, float, float]]],
        placed_codes: set[str],
    ) -> tuple[dict[str, list[str]], dict[str, dict]]:
        """Fill open OFG requirements with courses from classes.json."""
        open_ofgs = program.get("ofg_requirements", {}).get("open", [])
        fulfilled = program.get("ofg_requirements", {}).get("fulfilled", {})
        program_codes = {c.get("code") for y in program.get("years", []) for c in y.get("courses", []) if c.get("code")}

        for ofg_req in open_ofgs:
            ofg_key = ofg_req.get("ofg", "")
            if not ofg_key:
                continue
            ofg_key = _normalize_ofg(ofg_key) or ofg_key
            # Exclude courses that already fulfill this OFG via mandatory
            excluded = set()
            for codes in fulfilled.values():
                excluded.update(codes if isinstance(codes, list) else [codes])

            # Only OFG courses that are actually offered in some semester
            candidates = [
                s for s in self.ofg_index.get(ofg_key, [])
                if s in self.schedule_by_sigle
            ]
            placed = False
            for sem_idx in range(len(self.REAL_SEMESTERS)):
                if placed:
                    break
                sem_key = self._semester_key(sem_idx)
                sem_type = self._semester_type(sem_idx)
                if len(schedule.get(sem_key, [])) >= 5:
                    continue

                for sigle in candidates:
                    if sigle in placed_codes or sigle in program_codes or sigle in excluded:
                        continue
                    # Check prereqs
                    cinfo = self.course_by_sigle.get(sigle, {})
                    prereqs = self._flatten_prereqs(cinfo.get("prerequisites") or [])
                    completed = set()
                    for i in range(sem_idx):
                        completed.update(schedule.get(self._semester_key(i), []))
                    if not self._prereqs_satisfied(prereqs, completed):
                        continue

                    result = self._find_non_conflicting_section(sigle, sem_type, used_slots.get(sem_key, []))
                    if result:
                        sec, slots = result
                        schedule.setdefault(sem_key, []).append(sigle)
                        sections[sigle] = {"nrc": sec.get("nrc", ""), "groupe": sec.get("groupe", ""), "schedule": sec.get("schedule", [])}
                        placed_codes.add(sigle)
                        used_slots.setdefault(sem_key, []).extend(slots)
                        placed = True
                        break

        return schedule, sections

    def get_blanks_per_semester(self, schedule: dict[str, list[str]]) -> dict[str, int]:
        """Return number of slots to fill per semester (5 per semester)."""
        return {k: max(0, 5 - len(v)) for k, v in schedule.items()}

    def get_available_electives(
        self,
        semester_key: str,
        schedule: dict[str, list[str]],
        used_slots: list[tuple[str, float, float]],
        program: dict,
        minor: dict | None,
        placed_codes: set[str],
    ) -> list[dict]:
        """Get list of elective courses that fit in the given semester (no conflict, prereqs OK)."""
        sem_idx = list(schedule.keys()).index(semester_key) if semester_key in schedule else 0
        for i in range(len(self.REAL_SEMESTERS)):
            if self._semester_key(i) == semester_key:
                sem_idx = i
                break
        sem_type = self._semester_type(sem_idx)
        completed = set()
        for i in range(sem_idx):
            completed.update(schedule.get(self._semester_key(i), []))
        program_codes = {c.get("code") for y in program.get("years", []) for c in y.get("courses", []) if c.get("code")}

        # Only consider courses that actually have sections in this semester's schedule
        actually_offered = set(self.schedule_by_sigle.keys())

        elective_codes = set()
        for y in program.get("years", []):
            for c in y.get("courses", []):
                if c.get("type") == "option" and c.get("code") in actually_offered:
                    elective_codes.add(c.get("code"))
        if minor:
            for c in minor.get("elective_courses", []):
                if c.get("code") in actually_offered:
                    elective_codes.add(c.get("code"))
        if not elective_codes:
            # Fallback: any course offered this semester, excluding mandatory program courses
            elective_codes = actually_offered - program_codes

        candidates = []
        for sigle in elective_codes:
            if sigle in placed_codes:
                continue
            cinfo = self.course_by_sigle.get(sigle, {})
            prereqs = self._flatten_prereqs(cinfo.get("prerequisites") or [])
            if not self._prereqs_satisfied(prereqs, completed):
                continue
            result = self._find_non_conflicting_section(sigle, sem_type, used_slots)
            if result:
                sec, _ = result
                candidates.append({
                    "code": sigle,
                    "name": cinfo.get("name", sigle),
                    "credits": 3,
                    "section": sec,
                })
        return candidates

    def optimize(
        self,
        program_name: str,
        user_prompt: str,
        minor_name: str | None = None,
        fill_electives_fn: callable | None = None,
        user_choices: dict | None = None,
        already_completed: list[str] | None = None,
    ) -> dict:
        """
        Run full optimization. fill_electives_fn(available_classes, user_prompt, slots_to_fill, semester_key)
        returns list of course codes to add. user_choices: { semester_key: [code, ...] } for manual picks.
        """
        program = self._get_program(program_name)
        if not program:
            raise ValueError(f"Program not found: {program_name}")

        minor = None
        if minor_name:
            for m in self.programs.get("available_minors", []):
                if m.get("name") == minor_name:
                    minor = m
                    break

        completed_set = set(already_completed or [])
        schedule, sections, placed_list = self.place_mandatory(program, minor, already_completed=completed_set)
        placed_codes = {p.code for p in placed_list} | completed_set  # exclude already-done courses from OFG/electives
        used_slots: dict[str, list[tuple[str, float, float]]] = {}
        for p in placed_list:
            used_slots.setdefault(p.semester_key, []).extend(p.slots)

        schedule, sections = self.fill_ofg(program, schedule, sections, used_slots, placed_codes)
        for k in schedule:
            placed_codes.update(schedule.get(k, []))

        blanks = self.get_blanks_per_semester(schedule)
        user_choices = user_choices or {}

        # Semesters where LLM couldn't find relevant courses — frontend will ask user
        pending_choices: dict[str, list[dict]] = {}

        for sem_key, count in blanks.items():
            if count <= 0:
                continue
            if sem_key in user_choices:
                sem_idx = next(i for i in range(len(self.REAL_SEMESTERS)) if self._semester_key(i) == sem_key)
                sem_type = self._semester_type(sem_idx)
                for code in user_choices[sem_key][:count]:
                    if code in placed_codes:
                        continue
                    result = self._find_non_conflicting_section(code, sem_type, used_slots.get(sem_key, []))
                    if result:
                        sec, slots = result
                        schedule.setdefault(sem_key, []).append(code)
                        placed_codes.add(code)
                        sections[code] = {"nrc": sec.get("nrc", ""), "groupe": sec.get("groupe", ""), "schedule": sec.get("schedule", [])}
                        used_slots.setdefault(sem_key, []).extend(slots)
                continue

            if fill_electives_fn:
                available = self.get_available_electives(sem_key, schedule, used_slots.get(sem_key, []), program, minor, placed_codes)
                if available:
                    result_pair = fill_electives_fn(
                        [f"{c['code']} - {c['name']}" for c in available],
                        user_prompt,
                        count,
                        sem_key,
                    )
                    # fill_electives_fn may return (codes, needs_clarification) or just codes
                    if isinstance(result_pair, tuple):
                        codes, needs_clarification = result_pair
                    else:
                        codes, needs_clarification = result_pair, False

                    if needs_clarification:
                        # Always ask the user — store options and LLM's ranked picks.
                        # Include section schedule so the frontend can detect mutual conflicts.
                        pending_choices[sem_key] = {
                            "options": [
                                {
                                    "code": c["code"],
                                    "name": c["name"],
                                    "schedule": c.get("section", {}).get("schedule", []),
                                }
                                for c in available[:10]
                            ],
                            "recommended": [
                                c.split()[0] if isinstance(c, str) else str(c)
                                for c in (codes or [])[:count]
                            ],
                            "slots": count,
                        }
                    else:
                        # LLM is confident — place automatically.
                        sem_idx = next(i for i in range(len(self.REAL_SEMESTERS)) if self._semester_key(i) == sem_key)
                        sem_type = self._semester_type(sem_idx)
                        for code in (codes or [])[:count]:
                            code = code.split()[0] if isinstance(code, str) else str(code)
                            if code in placed_codes:
                                continue
                            result = self._find_non_conflicting_section(code, sem_type, used_slots.get(sem_key, []))
                            if result:
                                sec, slots = result
                                schedule.setdefault(sem_key, []).append(code)
                                placed_codes.add(code)
                                sections[code] = {"nrc": sec.get("nrc", ""), "groupe": sec.get("groupe", ""), "schedule": sec.get("schedule", [])}
                                used_slots.setdefault(sem_key, []).extend(slots)

        return {"schedule": schedule, "sections": sections, "pending_choices": pending_choices}
