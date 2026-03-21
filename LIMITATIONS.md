# Benchmark Limitations

RBAB is an honest attempt to measure AI agent quality on real business tasks. These are the limitations you should understand before drawing conclusions from the scores.

**1. Single-domain scope**

All three harnesses test vending machine operations. What this means for you: scores reflect performance on this specific domain; results may not generalize to other business contexts.

**2. No ground truth**

Business decisions have no objectively correct answer; scoring uses an LLM judge, not verified correct outputs. What this means for you: scores reflect one judge model's assessment of quality; a different judge model may produce different scores.

**3. Single-pass judge**

Each model output is judged once by a single LLM call at temperature 0. What this means for you: scores have no statistical uncertainty bounds; a marginally different output phrasing could shift a score by 1 point.

**4. Training data leakage risk**

The vending machine scenario and evaluation rubric may appear in model training data. What this means for you: scores may reflect memorized patterns rather than live reasoning — we have no way to distinguish this.
