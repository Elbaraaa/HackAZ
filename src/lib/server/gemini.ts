const DEFAULT_GEMINI_MODEL = "gemma-4-26b-a4b-it";

export function getGeminiApiKey() {
  return process.env.GEMINI_API_KEY;
}

export function getGeminiModel() {
  const configuredModel = process.env.GEMINI_MODEL_NAME || process.env.GEMMA_MODEL_NAME || DEFAULT_GEMINI_MODEL;
  const model = configuredModel.trim().replace(/^models\//, "");
  return model || DEFAULT_GEMINI_MODEL;
}

export function geminiGenerateContentUrl(model = getGeminiModel()) {
  return `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
}

export function parseJsonObjectText(text: string) {
  const candidates = [
    text.trim(),
    ...Array.from(text.matchAll(/```(?:json)?\s*([\s\S]*?)```/gi), (match) => match[1].trim()).reverse(),
    ...extractJsonObjects(text).reverse(),
  ];
  const seen = new Set<string>();

  for (const candidate of candidates) {
    if (!candidate || seen.has(candidate)) continue;
    seen.add(candidate);

    try {
      const parsed = JSON.parse(candidate);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
    } catch {
      // Try the next candidate. Some models wrap the final JSON in reasoning text.
    }
  }

  return null;
}

function extractJsonObjects(text: string) {
  const objects: string[] = [];

  for (let start = 0; start < text.length; start += 1) {
    if (text[start] !== "{") continue;

    let depth = 0;
    let inString = false;
    let escaped = false;

    for (let index = start; index < text.length; index += 1) {
      const char = text[index];

      if (inString) {
        if (escaped) {
          escaped = false;
        } else if (char === "\\") {
          escaped = true;
        } else if (char === "\"") {
          inString = false;
        }
        continue;
      }

      if (char === "\"") {
        inString = true;
        continue;
      }

      if (char === "{") depth += 1;
      if (char === "}") {
        depth -= 1;
        if (depth === 0) {
          objects.push(text.slice(start, index + 1));
          break;
        }
      }
    }
  }

  return objects;
}
