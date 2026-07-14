from openai import AsyncOpenAI

from app.config import get_settings


def get_deepseek_client() -> AsyncOpenAI:
    settings = get_settings()
    return AsyncOpenAI(
        api_key=settings.deepseek_api_key,
        base_url=settings.deepseek_base_url,
    )


async def chat_completion(
    messages: list[dict[str, str]],
    model: str = "deepseek-chat",
    max_tokens: int | None = None,
    temperature: float | None = None,
) -> str:
    settings = get_settings()
    client = get_deepseek_client()

    response = await client.chat.completions.create(
        model=model,
        messages=messages,
        max_tokens=max_tokens or settings.max_output_tokens,
        temperature=temperature if temperature is not None else settings.agent_temperature,
    )
    content = response.choices[0].message.content
    return content or ""


async def chat_completion_tight(
    messages: list[dict[str, str]],
    model: str = "deepseek-chat",
    max_tokens: int = 1200,
) -> str:
    settings = get_settings()
    return await chat_completion(
        messages,
        model=model,
        max_tokens=max_tokens,
        temperature=settings.agent_temperature,
    )
