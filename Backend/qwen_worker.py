"""
Shared Qwen 3 14B worker — single model instance, single background thread.

All requests (elective filling with structured JSON, and free-form chat) are
serialised through one queue so the GPU is never double-loaded and concurrent
users simply wait their turn.

Usage
-----
from qwen_worker import enqueue

# Free-form chat
result = enqueue({
    "kind": "chat",
    "system": "You are ...",
    "messages": [{"role": "user", "content": "..."}],
    "max_new_tokens": 1024,
})
text = result["text"]

# Structured JSON (elective fill)
result = enqueue({
    "kind": "fill",
    "system": "You are ...",
    "messages": [{"role": "user", "content": "..."}],
    "max_new_tokens": 512,
})
# result keys: recommended_classes, reasoning, needs_clarification
"""

from __future__ import annotations

import json
import queue
import threading
from typing import Any

MODEL_NAME = "Qwen/Qwen3-4B"

_model = None
_tokenizer = None

_req_queue: queue.Queue = queue.Queue()
_lock = threading.Lock()
_started = False


# ── Model loading ────────────────────────────────────────────────────────────

def _load():
    global _model, _tokenizer
    if _model is not None:
        return
    import torch
    from transformers import AutoModelForCausalLM, AutoTokenizer

    print(f"[qwen_worker] Loading {MODEL_NAME}...")
    _tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME)
    _model = AutoModelForCausalLM.from_pretrained(
        MODEL_NAME,
        torch_dtype="auto",
        device_map="auto",
    )
    print("[qwen_worker] Model ready.")




# ── Request handlers ─────────────────────────────────────────────────────────

def _apply_template(system: str, messages: list[dict], enable_thinking: bool = False) -> str:
    chat = [{"role": "system", "content": system}] + messages
    try:
        return _tokenizer.apply_chat_template(
            chat,
            tokenize=False,
            add_generation_prompt=True,
            enable_thinking=enable_thinking,
        )
    except TypeError:
        return _tokenizer.apply_chat_template(
            chat,
            tokenize=False,
            add_generation_prompt=True,
        )


def _handle_chat(req: dict) -> dict:
    """Free-form text generation."""
    import torch

    prompt = _apply_template(req["system"], req["messages"])
    inputs = _tokenizer(prompt, return_tensors="pt").to(_model.device)
    with torch.no_grad():
        output_ids = _model.generate(
            **inputs,
            max_new_tokens=req.get("max_new_tokens", 1024),
            do_sample=True,
            temperature=0.7,
            top_p=0.9,
            pad_token_id=_tokenizer.eos_token_id,
        )
    new_ids = output_ids[0][inputs["input_ids"].shape[-1]:]
    text = _tokenizer.decode(new_ids, skip_special_tokens=True).strip()
    return {"text": text}


def _handle_fill(req: dict) -> dict:
    """Elective fill: generate text then extract JSON from the response."""
    import re

    raw = _handle_chat(req)["text"]

    # Try to extract a JSON block from the response
    json_match = re.search(r'\{.*\}', raw, re.DOTALL)
    if json_match:
        try:
            parsed = json.loads(json_match.group())
            return {
                "recommended_classes": parsed.get("recommended_classes", []),
                "reasoning": parsed.get("reasoning", ""),
                "needs_clarification": parsed.get("needs_clarification", False),
            }
        except json.JSONDecodeError:
            pass

    # Fallback: try to extract course codes directly from the text
    codes = re.findall(r'\b[A-Z]{2,5}\d{3,4}\b', raw)
    return {
        "recommended_classes": list(dict.fromkeys(codes)),  # dedupe, preserve order
        "reasoning": raw[:200],
        "needs_clarification": len(codes) == 0,
    }


# ── Worker thread ─────────────────────────────────────────────────────────────

def _worker():
    _load()
    while True:
        item = _req_queue.get()
        if item is None:
            break
        req, resp_q = item
        try:
            kind = req.get("kind", "chat")
            if kind == "chat":
                result = _handle_chat(req)
            elif kind == "fill":
                result = _handle_fill(req)
            else:
                result = {"error": f"Unknown kind: {kind}"}
        except Exception as e:
            result = {"error": str(e)}
        resp_q.put(result)


def _ensure_started():
    global _started
    with _lock:
        if _started:
            return
        t = threading.Thread(target=_worker, daemon=True)
        t.start()
        _started = True


# ── Public API ────────────────────────────────────────────────────────────────

def enqueue(req: dict) -> dict:
    """
    Submit a request to the shared Qwen worker and block until it completes.
    Thread-safe — multiple callers queue up and are served one at a time.
    """
    _ensure_started()
    resp_q: queue.Queue = queue.Queue()
    _req_queue.put((req, resp_q))
    result = resp_q.get()
    if "error" in result:
        raise RuntimeError(result["error"])
    return result
