"""
LLM elective filler using Qwen 3 14B with a single-instance request queue.

Serializes all LLM requests to avoid OOM on limited VRAM.
Uses a background thread + queue.Queue for thread-safe sync API.
"""

from __future__ import annotations

import queue
import threading
from dataclasses import dataclass
from typing import Any

_recommender = None
_request_queue: queue.Queue | None = None
_response_queue: queue.Queue | None = None
_worker_thread: threading.Thread | None = None
_lock = threading.Lock()


def _load_model():
    global _recommender
    if _recommender is not None:
        return
    import outlines
    import torch
    from pydantic import BaseModel, Field
    from transformers import AutoModelForCausalLM, AutoTokenizer
    from typing import List

    class FillSlotRecommendation(BaseModel):
        recommended_classes: List[str] = Field(
            ...,
            description="List of course codes (e.g. INFO2001) selected from the available classes.",
        )
        reasoning: str = Field(
            ...,
            description="Brief explanation of why these courses fit the user's interests.",
        )

    class ElectiveRecommender:
        def __init__(self, model_name: str = "Qwen/Qwen3-14B"):
            print(f"Loading {model_name} into VRAM...")
            self.hf_tokenizer = AutoTokenizer.from_pretrained(model_name)
            self.hf_model = AutoModelForCausalLM.from_pretrained(
                model_name,
                torch_dtype="auto",
                device_map="auto",
            )
            self.model = outlines.models.transformers(self.hf_model, self.hf_tokenizer)
            self.fill_generator = outlines.generate.json(self.model, FillSlotRecommendation)
            print("Qwen 3 14B ready.")

        def generate_fill(
            self,
            available_classes: list[str],
            user_interests: str,
            max_classes: int,
        ) -> dict:
            formatted = "\n".join([f"- {c}" for c in available_classes])
            system_prompt = (
                f"You are an expert academic advisor. Select up to {max_classes} courses from the available list "
                "that best align with the user's career interests. Return the exact course codes (e.g. INFO2001) in recommended_classes."
            )
            user_prompt = f"User interests:\n{user_interests}\n\nAvailable courses:\n{formatted}"
            messages = [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ]
            try:
                prompt = self.hf_tokenizer.apply_chat_template(
                    messages,
                    tokenize=False,
                    add_generation_prompt=True,
                    enable_thinking=False,
                )
            except TypeError:
                prompt = self.hf_tokenizer.apply_chat_template(
                    messages,
                    tokenize=False,
                    add_generation_prompt=True,
                )
            result = self.fill_generator(prompt)
            return result.model_dump()

    _recommender = ElectiveRecommender()


def _worker_main():
    _load_model()
    while True:
        try:
            req = _request_queue.get()
            if req is None:
                break
            kind = req.get("kind", "fill")
            try:
                if kind == "fill":
                    result = _recommender.generate_fill(
                        req["available_classes"],
                        req["user_interests"],
                        req["max_classes"],
                    )
                else:
                    result = {"error": "Unknown request kind"}
            except Exception as e:
                result = {"error": str(e)}
            _response_queue.put(result)
        except Exception:
            pass


def _ensure_worker():
    global _request_queue, _response_queue, _worker_thread
    with _lock:
        if _request_queue is not None:
            return
        _request_queue = queue.Queue()
        _response_queue = queue.Queue()
        _worker_thread = threading.Thread(target=_worker_main, daemon=True)
        _worker_thread.start()


def get_elective_recommendations(
    available_classes: list[str],
    user_interests: str,
    slots_to_fill: int,
    semester_key: str = "",
) -> list[str]:
    """
    Get elective course recommendations from the LLM (queued, single instance).
    Blocks until the request is processed.
    """
    _ensure_worker()
    _request_queue.put({
        "kind": "fill",
        "available_classes": available_classes,
        "user_interests": user_interests,
        "max_classes": slots_to_fill,
    })
    result = _response_queue.get()
    if "error" in result:
        raise RuntimeError(result["error"])
    codes = result.get("recommended_classes", [])
    out = []
    for c in codes[:slots_to_fill]:
        if isinstance(c, str) and " " in c:
            out.append(c.split()[0])
        else:
            out.append(str(c))
    return out
