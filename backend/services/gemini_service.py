"""Google Gemini entegrasyonu."""
import logging

from google import genai
from google.genai import types
from pydantic import BaseModel, ValidationError

from services.prompts import (
    ACTION_PLAN_INSTRUCTION,
    SELLER_ANALYSIS_INSTRUCTION,
    SELLER_CHAT_INSTRUCTION,
)

logger = logging.getLogger(__name__)


class GeminiError(RuntimeError):
    """Gemini API çağrısı başarısız olduğunda fırlatılır."""


class ActionPlan(BaseModel):
    immediate_actions: list[str]
    this_month: list[str]
    long_term: list[str]


class GeminiService:
    def __init__(self, api_key: str | None, model: str):
        if not api_key:
            raise ValueError("GEMINI_API_KEY tanımlı değil")
        self._client = genai.Client(api_key=api_key)
        self.model = model
        logger.info("Gemini servisi hazır (model: %s)", model)

    def _generate(self, contents: str, system_instruction: str, **config) -> types.GenerateContentResponse:
        try:
            return self._client.models.generate_content(
                model=self.model,
                contents=contents,
                config=types.GenerateContentConfig(
                    system_instruction=system_instruction,
                    temperature=0.7,
                    top_p=0.9,
                    max_output_tokens=8192,
                    **config,
                ),
            )
        except Exception as exc:
            logger.exception("Gemini API çağrısı başarısız")
            raise GeminiError(f"Gemini API hatası: {exc}") from exc

    def _generate_text(self, contents: str, system_instruction: str) -> str:
        text = self._generate(contents, system_instruction).text
        if not text:
            raise GeminiError("Gemini boş yanıt döndürdü")
        return text

    def analyze_product(self, question: str, product_context: str) -> str:
        """Ürün için satıcı odaklı, bölümlere ayrılmış Markdown risk raporu üretir."""
        prompt = f"SATICI SORUSU: {question}\n\n{product_context}"
        return self._generate_text(prompt, SELLER_ANALYSIS_INSTRUCTION)

    def generate_action_plan(self, product_context: str) -> dict[str, list[str]]:
        """Acil, bu ay ve uzun vade olarak gruplanmış yapılandırılmış eylem planı."""
        response = self._generate(
            product_context,
            ACTION_PLAN_INSTRUCTION,
            response_mime_type="application/json",
            response_schema=ActionPlan,
        )
        plan = response.parsed
        if not isinstance(plan, ActionPlan):
            try:
                plan = ActionPlan.model_validate_json(response.text or "")
            except ValidationError as exc:
                raise GeminiError("Gemini geçerli bir eylem planı üretemedi") from exc
        return plan.model_dump()

    def chat(self, message: str, product_context: str) -> str:
        prompt = f"SATICI SORUSU: {message}\n\nİLGİLİ ÜRÜN VERİLERİ:\n{product_context}"
        return self._generate_text(prompt, SELLER_CHAT_INSTRUCTION)

    def ping(self) -> int:
        """Bağlantı testi; yanıt uzunluğunu döndürür."""
        return len(self._generate_text("Bağlantı testi. Yalnızca 'Tamam' yaz.", "Kısa yanıt ver."))
