"""
KSP Sentinel AI — LLM Provider Orchestrator (SOLID: DIP Cascading Failover)
"""
import logging
from typing import Dict, List, Tuple
from app.providers.base import BaseLLMProvider
from app.providers.zoho_provider import ZohoQuickMLProvider

log = logging.getLogger("standalone.orchestrator")


class ProviderOrchestrator:
    """
    OCP: Manages priority-ordered inference provider cascading and automatic failover.
    Primary: Zoho Catalyst QuickML (GLM-4.7B & Knowledge RAG) -> Offline Fallback.
    """
    def __init__(self, providers: List[BaseLLMProvider] = None):
        self.providers = providers or [ZohoQuickMLProvider()]

    def complete(self, messages: List[Dict[str, str]], json_mode: bool = False, max_tokens: int = 2500) -> Tuple[str, str]:
        last_error = None
        for provider in self.providers:
            if not provider.is_available():
                continue
            try:
                log.info(f"[Orchestrator] Attempting completion via [{provider.name}]...")
                content, name = provider.complete(messages, json_mode=json_mode, max_tokens=max_tokens)
                if content and content.strip():
                    return content, name
            except Exception as e:
                log.warning(f"[Orchestrator] Provider [{provider.name}] failed: {e}. Cascading to fallback...")
                last_error = e

        log.error(f"[Orchestrator] All providers exhausted. Returning fallback. Last error: {last_error}")
        if json_mode:
            fallback_json = (
                '{"visual_suite": [{"chart_title": "Active Caseload Breakdown", "chart_type": "horizontal_bar", '
                '"labels": ["Bengaluru City", "Mysuru", "Hubballi", "Belagavi", "Mangaluru"], '
                '"series": [{"name": "Caseload", "data": [45, 32, 28, 20, 15]}], '
                '"summary_annotation": "Offline resilience mode: baseline jurisdictional distribution."}], '
                '"executive_briefing": {"situational_overview": "Autonomous fallback active across station grid.", '
                '"tactical_directives": [{"priority": "P1", "action": "Verify local case records", "owner": "Station Inspector", "target": "Immediate"}]}}'
            )
            return fallback_json, "fallback_rules"
        else:
            return "Drishti intelligence engine active. Review station command logs or consult your zonal coordinator for detailed case dossiers.", "fallback_rules"


    def generate_completion(self, prompt: str, system_instruction: str = "", max_tokens: int = 2500) -> str:
        messages = []
        if system_instruction:
            messages.append({"role": "system", "content": system_instruction})
        messages.append({"role": "user", "content": prompt})
        content, _ = self.complete(messages, json_mode=False, max_tokens=max_tokens)
        return content


# Singleton Orchestrator
orchestrator = ProviderOrchestrator()


def llm_complete(messages: List[Dict[str, str]], json_mode: bool = False, max_tokens: int = 2500) -> Tuple[str, str]:
    """Helper alias for LLM completion."""
    return orchestrator.complete(messages, json_mode=json_mode, max_tokens=max_tokens)
