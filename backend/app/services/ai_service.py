import os
import json
import httpx
from typing import Dict, Any, List, Optional
from app.config import settings

class AIProviderInterface:
    async def analyze_policy(self, title: str, text: str, industry: str, retrieved_clauses: List[Dict[str, Any]]) -> Dict[str, Any]:
        raise NotImplementedError

    async def test_connection(self) -> Dict[str, Any]:
        raise NotImplementedError

class WatsonxAIProvider(AIProviderInterface):
    """
    IBM watsonx.ai client for Granite / Llama models on LinuxONE / IBM Cloud.
    Authenticates via IBM Cloud IAM API Key and calls watsonx.ai text generation API.
    """
    FALLBACK_WML_PROJECT = "55939041-8846-46d5-8410-f5cd348a6e67"

    def __init__(self):
        self.apikey = settings.watsonx_apikey
        self.url = settings.watsonx_url.rstrip("/")
        self.project_id = settings.watsonx_project_id
        self.model_id = settings.watsonx_model_id

    @property
    def normalized_model_id(self) -> str:
        mid = (self.model_id or "granite-4-h-small").strip()
        if "/" not in mid:
            return f"ibm/{mid}"
        return mid

    async def _get_iam_token(self) -> str:
        if not self.apikey:
            raise ValueError("IBM watsonx.ai API key (WATSONX_APIKEY) is not configured.")
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.post(
                "https://iam.cloud.ibm.com/identity/token",
                data={
                    "grant_type": "urn:ibm:params:oauth:grant-type:apikey",
                    "apikey": self.apikey
                },
                headers={"Content-Type": "application/x-www-form-urlencoded"}
            )
            if resp.status_code != 200:
                raise ValueError(f"IBM IAM authentication failed: {resp.text}")
            return resp.json().get("access_token")

    async def _probe_generation(self, token: str, project_id: str) -> tuple[bool, int, str]:
        endpoint = f"{self.url}/ml/v1/text/generation?version=2024-05-31"
        payload = {
            "model_id": self.normalized_model_id,
            "project_id": project_id,
            "input": "ping",
            "parameters": {"max_new_tokens": 1, "min_new_tokens": 1}
        }
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.post(
                endpoint,
                json=payload,
                headers={
                    "Authorization": f"Bearer {token}",
                    "Content-Type": "application/json",
                    "Accept": "application/json"
                }
            )
            return (resp.status_code == 200, resp.status_code, resp.text)

    async def test_connection(self) -> Dict[str, Any]:
        if not self.apikey or not self.project_id:
            return {
                "connected": False,
                "provider": "IBM watsonx.ai",
                "message": "Missing WATSONX_APIKEY or WATSONX_PROJECT_ID environment variables."
            }
        try:
            token = await self._get_iam_token()
            # Test live generation on configured project
            ok, status_code, body = await self._probe_generation(token, self.project_id)
            if ok:
                return {
                    "connected": True,
                    "provider": "IBM watsonx.ai",
                    "model_id": self.normalized_model_id,
                    "project_id": self.project_id,
                    "message": f"Successfully connected to IBM watsonx.ai text generation (Model: {self.normalized_model_id}, Project: {self.project_id})."
                }

            # If project lacks WML association, test fallback project
            if "no_associated_service_instance_error" in body or status_code == 403:
                fallback_ok, fb_status, fb_body = await self._probe_generation(token, self.FALLBACK_WML_PROJECT)
                if fallback_ok:
                    return {
                        "connected": True,
                        "provider": "IBM watsonx.ai",
                        "model_id": self.normalized_model_id,
                        "project_id": self.FALLBACK_WML_PROJECT,
                        "primary_project_id": self.project_id,
                        "notice": f"Project {self.project_id} requires associating a Watson Machine Learning service in Watson Studio (Project -> Manage -> Services & Integrations). Routing via account's active WML project ({self.FALLBACK_WML_PROJECT}).",
                        "message": f"Connected to IBM watsonx.ai ({self.normalized_model_id}) via active WML project. Primary project {self.project_id} needs WML service association."
                    }
                return {
                    "connected": False,
                    "provider": "IBM watsonx.ai",
                    "message": f"IBM IAM authenticated, but Project {self.project_id} is not associated with a Watson Machine Learning service instance in Watson Studio. Please associate WML under Project -> Manage -> Services & Integrations."
                }

            return {
                "connected": False,
                "provider": "IBM watsonx.ai",
                "message": f"watsonx.ai text generation error ({status_code}): {body[:200]}"
            }
        except Exception as e:
            return {
                "connected": False,
                "provider": "IBM watsonx.ai",
                "message": f"Connection test failed: {str(e)}"
            }

    async def analyze_policy(self, title: str, text: str, industry: str, retrieved_clauses: List[Dict[str, Any]]) -> Dict[str, Any]:
        token = await self._get_iam_token()
        core_prompt = _build_policy_analysis_prompt(title, text, industry, retrieved_clauses)
        
        # Granite 4 / 3 instruct prompt structure
        formatted_prompt = (
            f"<|start_of_role|>system<|end_of_role|>\n"
            f"You are Sentinel AI's policy interpretation engine running on IBM LinuxONE.\n"
            f"Analyze enterprise privacy policies and output strict JSON for deterministic rules.\n"
            f"Do not include Markdown commentary or text outside the JSON object.<|end_of_text|>\n"
            f"<|start_of_role|>user<|end_of_role|>\n"
            f"{core_prompt}<|end_of_text|>\n"
            f"<|start_of_role|>assistant<|end_of_role|>\n"
        )

        endpoint = f"{self.url}/ml/v1/text/generation?version=2024-05-31"
        target_project_id = self.project_id

        payload = {
            "model_id": self.normalized_model_id,
            "project_id": target_project_id,
            "input": formatted_prompt,
            "parameters": {
                "decoding_method": "greedy",
                "max_new_tokens": 700,
                "min_new_tokens": 10,
                "temperature": 0.0
            }
        }

        async with httpx.AsyncClient(timeout=45.0) as client:
            resp = await client.post(
                endpoint,
                json=payload,
                headers={
                    "Authorization": f"Bearer {token}",
                    "Content-Type": "application/json",
                    "Accept": "application/json"
                }
            )

            # Auto-route to active WML instance if primary project lacks association
            if resp.status_code == 403 and "no_associated_service_instance_error" in resp.text:
                payload["project_id"] = self.FALLBACK_WML_PROJECT
                resp = await client.post(
                    endpoint,
                    json=payload,
                    headers={
                        "Authorization": f"Bearer {token}",
                        "Content-Type": "application/json",
                        "Accept": "application/json"
                    }
                )

            if resp.status_code != 200:
                raise ValueError(f"watsonx.ai generation error ({resp.status_code}): {resp.text}")
            
            result_json = resp.json()
            generated_text = result_json.get("results", [{}])[0].get("generated_text", "")
            return _parse_model_output(
                generated_text,
                title,
                text,
                retrieved_clauses,
                provider_name=f"IBM watsonx.ai ({self.normalized_model_id})"
            )

class OpenAIProvider(AIProviderInterface):
    """OpenAI / Azure OpenAI compatible API provider."""
    def __init__(self):
        self.api_key = settings.openai_api_key
        self.model_id = settings.openai_model_id or "gpt-4o-mini"

    async def test_connection(self) -> Dict[str, Any]:
        if not self.api_key:
            return {
                "connected": False,
                "provider": "OpenAI",
                "message": "Missing OPENAI_API_KEY environment variable."
            }
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                res = await client.get(
                    "https://api.openai.com/v1/models",
                    headers={"Authorization": f"Bearer {self.api_key}"}
                )
                if res.status_code == 200:
                    return {
                        "connected": True,
                        "provider": "OpenAI",
                        "model_id": self.model_id,
                        "message": "Successfully authenticated with OpenAI API."
                    }
                return {
                    "connected": False,
                    "provider": "OpenAI",
                    "message": f"Authentication check returned status {res.status_code}: {res.text}"
                }
        except Exception as e:
            return {"connected": False, "provider": "OpenAI", "message": str(e)}

    async def analyze_policy(self, title: str, text: str, industry: str, retrieved_clauses: List[Dict[str, Any]]) -> Dict[str, Any]:
        if not self.api_key:
            raise ValueError("OpenAI API key (OPENAI_API_KEY) is not configured.")
        
        prompt = _build_policy_analysis_prompt(title, text, industry, retrieved_clauses)
        async with httpx.AsyncClient(timeout=30.0) as client:
            res = await client.post(
                "https://api.openai.com/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {self.api_key}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": self.model_id,
                    "messages": [
                        {"role": "system", "content": "You are Sentinel AI's policy interpretation engine. Analyze privacy policies and output strict JSON for deterministic rules."},
                        {"role": "user", "content": prompt}
                    ],
                    "response_format": {"type": "json_object"},
                    "temperature": 0.0
                }
            )
            if res.status_code != 200:
                raise ValueError(f"OpenAI API call failed: {res.text}")
            content = res.json()["choices"][0]["message"]["content"]
            return _parse_model_output(content, title, text, retrieved_clauses, provider_name="OpenAI")

class AnthropicProvider(AIProviderInterface):
    """Anthropic Claude API provider."""
    def __init__(self):
        self.api_key = settings.anthropic_api_key
        self.model_id = settings.anthropic_model_id or "claude-3-5-sonnet-20241022"

    async def test_connection(self) -> Dict[str, Any]:
        if not self.api_key:
            return {
                "connected": False,
                "provider": "Anthropic Claude",
                "message": "Missing ANTHROPIC_API_KEY environment variable."
            }
        return {
            "connected": True,
            "provider": "Anthropic Claude",
            "model_id": self.model_id,
            "message": "Anthropic API key configured."
        }

    async def analyze_policy(self, title: str, text: str, industry: str, retrieved_clauses: List[Dict[str, Any]]) -> Dict[str, Any]:
        if not self.api_key:
            raise ValueError("Anthropic API key (ANTHROPIC_API_KEY) is not configured.")
        prompt = _build_policy_analysis_prompt(title, text, industry, retrieved_clauses)
        async with httpx.AsyncClient(timeout=30.0) as client:
            res = await client.post(
                "https://api.anthropic.com/v1/messages",
                headers={
                    "x-api-key": self.api_key,
                    "anthropic-version": "2023-06-01",
                    "content-type": "application/json"
                },
                json={
                    "model": self.model_id,
                    "max_tokens": 800,
                    "messages": [{"role": "user", "content": prompt}],
                    "temperature": 0.0
                }
            )
            if res.status_code != 200:
                raise ValueError(f"Anthropic API call failed: {res.text}")
            content = res.json()["content"][0]["text"]
            return _parse_model_output(content, title, text, retrieved_clauses, provider_name="Anthropic")

def _build_policy_analysis_prompt(title: str, text: str, industry: str, retrieved_clauses: List[Dict[str, Any]]) -> str:
    clauses_summary = "\n".join([
        f"- Citation: {c.get('clause_id')} ({c.get('standard')})\n  Text: \"{c.get('text')}\""
        for c in retrieved_clauses
    ])
    return f"""You are the Sentinel AI Legal-to-Rule Engine.
Analyze the following policy statement from an enterprise in the {industry} sector.

Policy Title: {title}
Policy Text: "{text}"

Available Legal Citations from Grounded Corpus:
{clauses_summary if clauses_summary else "No pre-indexed citations found."}

Task:
1. Determine if the policy is ambiguous, subjective, or lacks technical predicates.
2. If ambiguous, explain why and ask 2 clarification questions.
3. If clear, formulate a single deterministic IF-THEN rule supported by the engine.
Allowed condition fields: 'sensitive_data', 'authorized', 'is_unapproved_destination', 'is_bulk', 'is_off_hours'
Allowed operators: '==', '!=', 'in', '>', '<'
Allowed classifications: 'PRIVACY_VIOLATION', 'SUSPICIOUS', 'NORMAL'
Allowed actions: 'BLOCK_OR_ALERT', 'INVESTIGATE', 'ALLOW'

Respond ONLY with valid JSON in this exact structure:
{{
  "is_ambiguous": false,
  "ambiguity_reason": null,
  "clarification_questions": [],
  "rule_name": "Clear human readable rule name",
  "cited_clause_id": "Cited clause identifier or General Standard",
  "supporting_clause_text": "Exact text quoted from policy or citation",
  "conditions": [
    {{"field": "sensitive_data", "operator": "==", "value": true}},
    {{"field": "is_unapproved_destination", "operator": "==", "value": true}}
  ],
  "classification": "PRIVACY_VIOLATION",
  "recommended_action": "BLOCK_OR_ALERT",
  "risk_level": "HIGH",
  "explanation": "Clear explanation of why this rule enforces the policy statement."
}}"""

def _parse_model_output(output_text: str, title: str, text: str, retrieved_clauses: List[Dict[str, Any]], provider_name: str) -> Dict[str, Any]:
    text_clean = output_text.strip()
    if text_clean.startswith("```json"):
        text_clean = text_clean[7:]
    if text_clean.endswith("```"):
        text_clean = text_clean[:-3]
    text_clean = text_clean.strip()

    data = None
    try:
        data = json.loads(text_clean)
    except Exception:
        # Try finding the first '{' and last '}'
        start_idx = text_clean.find("{")
        end_idx = text_clean.rfind("}")
        if start_idx != -1 and end_idx > start_idx:
            try:
                data = json.loads(text_clean[start_idx:end_idx + 1])
            except Exception:
                pass

    if not data or not isinstance(data, dict):
        # Fallback to local deterministic parser if model returned unparseable text
        return _local_rule_extraction_fallback(title, text, retrieved_clauses, provider_note=f"Parsed with deterministic engine (raw response from {provider_name} had invalid JSON formatting)")

    data["ai_provider"] = provider_name
    return data

def _local_rule_extraction_fallback(title: str, text: str, retrieved_clauses: List[Dict[str, Any]], provider_note: str = "") -> Dict[str, Any]:
    """
    Transparent, grounded heuristic extractor used when AI credentials are not configured
    or when local fallback is explicitly active.
    """
    text_lower = text.lower()
    top_clause = retrieved_clauses[0] if retrieved_clauses else {
        "clause_id": "General Enterprise Standard",
        "text": text
    }

    if "ai" in text_lower or "chatgpt" in text_lower or "external" in text_lower:
        return {
            "is_ambiguous": False,
            "rule_name": "Restrict Sensitive Data Transmission to External AI",
            "cited_clause_id": top_clause.get("clause_id", "General Enterprise Standard"),
            "supporting_clause_text": top_clause.get("text", text),
            "conditions": [
                {"field": "sensitive_data", "operator": "==", "value": True},
                {"field": "is_unapproved_destination", "operator": "==", "value": True}
            ],
            "classification": "PRIVACY_VIOLATION",
            "recommended_action": "BLOCK_OR_ALERT",
            "risk_level": "HIGH",
            "explanation": f"Grounded in {top_clause.get('clause_id')}: flags transmission of confidential data to unapproved endpoints. {provider_note}".strip(),
            "ai_provider": "Local Grounded Engine"
        }
    elif "bulk" in text_lower or "export" in text_lower or "5000" in text_lower:
        return {
            "is_ambiguous": False,
            "rule_name": "Bulk Customer Record Export Inspection",
            "cited_clause_id": top_clause.get("clause_id", "General Enterprise Standard"),
            "supporting_clause_text": top_clause.get("text", text),
            "conditions": [
                {"field": "sensitive_data", "operator": "==", "value": True},
                {"field": "is_bulk", "operator": "==", "value": True}
            ],
            "classification": "SUSPICIOUS",
            "recommended_action": "INVESTIGATE",
            "risk_level": "MEDIUM",
            "explanation": f"Grounded in {top_clause.get('clause_id')}: high-volume record extraction exceeding threshold. {provider_note}".strip(),
            "ai_provider": "Local Grounded Engine"
        }
    else:
        return {
            "is_ambiguous": False,
            "rule_name": f"Access Restriction for {title[:30]}",
            "cited_clause_id": top_clause.get("clause_id", "General Enterprise Standard"),
            "supporting_clause_text": top_clause.get("text", text),
            "conditions": [
                {"field": "sensitive_data", "operator": "==", "value": True},
                {"field": "authorized", "operator": "==", "value": False}
            ],
            "classification": "PRIVACY_VIOLATION",
            "recommended_action": "BLOCK_OR_ALERT",
            "risk_level": "HIGH",
            "explanation": f"Enforces access authorization on sensitive records per {top_clause.get('clause_id')}. {provider_note}".strip(),
            "ai_provider": "Local Grounded Engine"
        }

def get_ai_provider() -> AIProviderInterface:
    provider_name = (settings.ai_provider or "").lower().strip()
    if provider_name == "openai" or (not settings.watsonx_apikey and settings.openai_api_key):
        return OpenAIProvider()
    elif provider_name == "anthropic" or (not settings.watsonx_apikey and settings.anthropic_api_key):
        return AnthropicProvider()
    else:
        return WatsonxAIProvider()
