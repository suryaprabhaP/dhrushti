"""
KSP Sentinel AI — Dynamic Agent Registry (SOLID: OCP)
"""
import logging
from typing import Dict, List, Optional
from app.core.interfaces import AgentManifest, BaseAgent

log = logging.getLogger("standalone.registry")


class AgentRegistry:
    """
    OCP: Open for extension, closed for modification.
    Allows dynamic agent plug-in without modifying routing or server code.
    """
    def __init__(self):
        self._agents: Dict[str, BaseAgent] = {}

    def register(self, agent: BaseAgent) -> None:
        manifest = agent.manifest
        self._agents[manifest.intent_name.upper()] = agent
        log.info(f"AgentRegistry: Registered [{manifest.intent_name}] -> {agent.__class__.__name__}")

    def get_agent(self, intent_name: str) -> Optional[BaseAgent]:
        return self._agents.get(intent_name.upper())

    def get_all_agents(self) -> Dict[str, BaseAgent]:
        return dict(self._agents)

    def get_manifests(self) -> List[AgentManifest]:
        return [agent.manifest for agent in self._agents.values()]

    def build_routing_schema_prompt(self) -> str:
        """Dynamically generates the intent classification prompt from registered manifests."""
        lines = [
            "You are an intent classifier for a Karnataka Police AI system.",
            "Classify the officer's query into EXACTLY ONE category from the registered specialist agents below:\n"
        ]
        for manifest in self.get_manifests():
            visual_tag = "(REQUIRES CHARTS)" if manifest.requires_visual_studio else "(NO CHARTS - PRESERVE CANVAS)"
            lines.append(f"- {manifest.intent_name.upper()}: {manifest.description} {visual_tag}")

        lines.extend([
            "\nExamples:",
            '"Show me theft trends and station ranking" → ANALYTICAL',
            '"I need a time series chart for this" → ANALYTICAL',
            '"What tactical countermeasures should our Cyber Wing take?" → CONVERSATIONAL',
            '"how many FIRs in Whitefield last month" → DATA_QUERY',
            '"what is the procedure for Section 65B certificate" → DOCUMENT',
            '\nReply with EXACTLY ONE intent word matching the category.'
        ])
        return "\n".join(lines)


# Singleton Registry
registry = AgentRegistry()
