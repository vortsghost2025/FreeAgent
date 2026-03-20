from typing import Annotated
from agent_framework import ChatAgent, ChatThread
from agent_framework.openai import OpenAIChatClient
from openai import AsyncOpenAI

# --- helper tools ---------------------------------------------------------

def search_recipe(
    query: Annotated[str, "Search term for recipe."
    ],
) -> str:
    """Fake recipe search. In a real app, call external API or database."""
    # we return a simple canned response keyed by query
    recipes = {
        "pancakes": "Pancake recipe: flour, milk, eggs, baking powder, salt.",
        "omelette": "Omelette recipe: eggs, cheese, milk, salt, pepper.",
    }
    return recipes.get(query.lower(), f"No recipes found for '{query}'.")


def extract_ingredients(
    text: Annotated[str, "Text containing a recipe or ingredient list."
    ],
) -> str:
    """Very naive extraction using keywords."""
    words = [w.strip(".,") for w in text.split()]
    ingredients = [w for w in words if w.lower() in [
        "flour",
        "milk",
        "eggs",
        "cheese",
        "salt",
        "pepper",
        "sugar",
        "butter",
    ]]
    if not ingredients:
        return "No ingredients detected."
    return "Ingredients: " + ", ".join(ingredients)


# --- agent construction --------------------------------------------------

def create_agent(github_token: str, model_id: str = "gpt-4o-mini") -> ChatAgent:
    """Return a configured ChatAgent using GitHub model.

    The caller is responsible for supplying a valid GitHub token and
    model identifier.  In a real application these might come from
    environment variables or a config file.
    """
    async_client = AsyncOpenAI(
        base_url="https://models.github.ai/inference",
        api_key=github_token,
    )
    chat_client = OpenAIChatClient(async_client=async_client, model_id=model_id)

    agent = ChatAgent(
        chat_client=chat_client,
        name="CookingAssistant",
        instructions="You are a helpful cooking assistant."
        "Respond concisely and use provided tools when appropriate.",
        tools=[search_recipe, extract_ingredients],
    )

    return agent
