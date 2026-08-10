#!/usr/bin/env python3
import argparse
import difflib
import json
import re
import unicodedata
from pathlib import Path

from faster_whisper import WhisperModel


def normalize(text: str) -> str:
    table = str.maketrans({
        "ي": "ی", "ى": "ی", "ك": "ک", "ۀ": "ه", "ة": "ه",
        "ؤ": "و", "إ": "ا", "أ": "ا",
    })
    text = unicodedata.normalize("NFKC", text).translate(table)
    text = re.sub(r"[\u064B-\u065F\u0670]", "", text)
    text = re.sub(r"[^\w\u0600-\u06FF]+", " ", text, flags=re.UNICODE)
    return re.sub(r"\s+", " ", text).strip().lower()


def token_f1(reference: str, candidate: str) -> float:
    ref = normalize(reference).split()
    cand = normalize(candidate).split()
    if not ref or not cand:
        return 0.0
    ref_counts, cand_counts = {}, {}
    for token in ref:
        ref_counts[token] = ref_counts.get(token, 0) + 1
    for token in cand:
        cand_counts[token] = cand_counts.get(token, 0) + 1
    overlap = sum(min(count, cand_counts.get(token, 0))
                  for token, count in ref_counts.items())
    precision = overlap / len(cand)
    recall = overlap / len(ref)
    return 0.0 if precision + recall == 0 else (
        2 * precision * recall / (precision + recall)
    )


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--audio", required=True)
    parser.add_argument("--script", required=True)
    parser.add_argument("--out", required=True)
    parser.add_argument("--transcript-out", required=True)
    parser.add_argument("--model", default="small")
    parser.add_argument("--threshold", type=float, default=0.60)
    args = parser.parse_args()

    script = Path(args.script).read_text(encoding="utf-8")
    model = WhisperModel(args.model, device="cpu", compute_type="int8")
    segments, info = model.transcribe(
        args.audio, language="fa", beam_size=5, vad_filter=True,
        condition_on_previous_text=True,
    )
    transcript = " ".join(segment.text.strip() for segment in segments).strip()
    normalized_script = normalize(script)
    normalized_transcript = normalize(transcript)
    char_similarity = difflib.SequenceMatcher(
        None, normalized_script, normalized_transcript, autojunk=False
    ).ratio()
    f1 = token_f1(script, transcript)
    score = max(char_similarity, f1)
    result = {
        "schemaVersion": 1,
        "detectedLanguage": info.language,
        "languageProbability": info.language_probability,
        "model": args.model,
        "charSimilarity": round(char_similarity, 4),
        "tokenF1": round(f1, 4),
        "score": round(score, 4),
        "threshold": args.threshold,
        "pass": score >= args.threshold,
    }
    Path(args.transcript_out).write_text(transcript + "\n", encoding="utf-8")
    Path(args.out).write_text(
        json.dumps(result, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    print(json.dumps(result, ensure_ascii=False))
    if not result["pass"]:
        raise SystemExit(
            "Audio QA failed: STT/script similarity below threshold."
        )


if __name__ == "__main__":
    main()
