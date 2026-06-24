export function stripMarkdownJsonFence(value: string) {
  const trimmed = value.trim();
  if (!trimmed.startsWith("```")) return trimmed;

  return trimmed
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();
}

export function extractBalancedJsonObject(value: string): string | null {
  const start = value.indexOf("{");
  if (start === -1) return null;

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let index = start; index < value.length; index += 1) {
    const char = value[index];

    if (inString) {
      if (escaped) {
        escaped = false;
        continue;
      }
      if (char === "\\") {
        escaped = true;
        continue;
      }
      if (char === '"') {
        inString = false;
      }
      continue;
    }

    if (char === '"') {
      inString = true;
      continue;
    }

    if (char === "{") depth += 1;
    if (char === "}") {
      depth -= 1;
      if (depth === 0) {
        return value.slice(start, index + 1);
      }
    }
  }

  return null;
}

export function parseJsonAfterMarker(
  content: string,
  marker: string,
): { jsonObject: string | null; visibleContent: string } {
  const markerIndex = content.indexOf(marker);
  if (markerIndex === -1) {
    return { jsonObject: null, visibleContent: content };
  }

  const visibleContent = content.slice(0, markerIndex).trim();
  const jsonPart = content.slice(markerIndex + marker.length).trim();
  const unfenced = stripMarkdownJsonFence(jsonPart);
  const jsonObject = extractBalancedJsonObject(unfenced) ?? unfenced;

  return { jsonObject, visibleContent };
}
