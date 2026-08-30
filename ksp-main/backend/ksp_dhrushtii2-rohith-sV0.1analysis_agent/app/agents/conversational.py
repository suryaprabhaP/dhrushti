"""
KSP Sentinel AI — Conversational Agent (SOLID: SRP + LSP)
"""
from app.config import KSP_CONVERSATIONAL_PROMPT
from app.core.interfaces import AgentManifest, AgentResponse, BaseAgent, ExecutionContext
from app.providers.orchestrator import llm_complete


class ConversationalAgent(BaseAgent):
    """
    SRP: Handles qualitative tactical guidance, detective advice, clarifications, and conversational context.
    Output: 2-4 decisive, disciplined sentences. Preserves active visual studio canvas.
    """
    @property
    def manifest(self) -> AgentManifest:
        return AgentManifest(
            intent_name="CONVERSATIONAL",
            label="Drishti Command Assistant",
            icon="🛡️",
            color="#1e40af",
            description="Trigger for qualitative detective advice, investigative hypotheses, reactions, clarifications, or conversational follow-ups that do not require new charts.",
            requires_visual_studio=False,
            system_prompt=KSP_CONVERSATIONAL_PROMPT
        )

    def execute(self, ctx: ExecutionContext) -> AgentResponse:
        messages = [
            {"role": "system", "content": self.manifest.system_prompt},
            {"role": "system", "content": f"Division context: {ctx.division}."}
        ]
        for h in ctx.history[-6:]:
            if h.get("role") in ("user", "assistant") and h.get("content"):
                messages.append({"role": h["role"], "content": h["content"]})
        messages.append({"role": "user", "content": ctx.query})

        answer, provider = llm_complete(messages, json_mode=False, max_tokens=300)
        manifest = self.manifest

        return AgentResponse(
            answer=answer,
            agent_type="conversational_agent",
            agent_label=manifest.label,
            agent_icon=manifest.icon,
            agent_color=manifest.color,
            charts=[],
            executive_decision=None,
            provider=provider,
            visuals_updated=False
        )
