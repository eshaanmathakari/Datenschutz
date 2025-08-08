import json
import os
from typing import Optional


class LocalModel:
    def __init__(self) -> None:
        self.backend = os.getenv("MODEL_BACKEND", "none")
        self.model = None
        self.tokenizer = None

        if self.backend == "llama_cpp":
            try:
                from llama_cpp import Llama  # type: ignore
                model_path = os.getenv("MODEL_PATH", "")
                if not model_path or not os.path.exists(model_path):
                    self.backend = "none"
                else:
                    n_threads = int(os.getenv("LLAMA_THREADS", "6"))
                    self.model = Llama(model_path=model_path, n_threads=n_threads)
            except Exception:
                self.backend = "none"
        elif self.backend == "transformers":
            try:
                from transformers import AutoModelForCausalLM, AutoTokenizer  # type: ignore
                model_name = os.getenv("HF_MODEL", "")
                if not model_name:
                    self.backend = "none"
                else:
                    self.tokenizer = AutoTokenizer.from_pretrained(model_name)
                    self.model = AutoModelForCausalLM.from_pretrained(
                        model_name,
                        device_map=os.getenv("HF_DEVICE_MAP", "auto"),
                        load_in_8bit=os.getenv("HF_LOAD_IN_8BIT", "true").lower() == "true",
                    )
            except Exception:
                self.backend = "none"

    def generate(self, prompt: str, max_new_tokens: int = 1024, temperature: float = 0.2) -> str:
        if self.backend == "llama_cpp" and self.model is not None:
            out = self.model(prompt, max_tokens=max_new_tokens, temperature=temperature)
            return out["choices"][0]["text"]
        if self.backend == "transformers" and self.model is not None and self.tokenizer is not None:
            import torch  # type: ignore
            inputs = self.tokenizer(prompt, return_tensors="pt").to(self.model.device)
            with torch.no_grad():
                output_ids = self.model.generate(
                    **inputs, max_new_tokens=max_new_tokens, do_sample=False, temperature=temperature
                )
            return self.tokenizer.decode(output_ids[0], skip_special_tokens=True)[len(prompt):]
        # Fallback: no model available → return minimal empty structure
        return json.dumps({"issues": []})


_GLOBAL_MODEL: Optional[LocalModel] = None


def get_model() -> LocalModel:
    global _GLOBAL_MODEL
    if _GLOBAL_MODEL is None:
        _GLOBAL_MODEL = LocalModel()
    return _GLOBAL_MODEL


