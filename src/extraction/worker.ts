import "dotenv/config";
import {
  ExtractedListingSchema,
  geminiResponseSchema,
  type ExtractedListing,
} from "./schema.js";

// Gemini free-tier API (Google AI Studio key, not Vertex). Uses the native
// JSON-schema-constrained response mode -- same idea as Claude's forced
// tool_choice, just Gemini's flavor of it: guaranteed-shaped JSON back,
// no markdown-fence stripping, no free-text parsing.
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const MODEL = process.env.EXTRACTION_MODEL ?? "gemini-2.0-flash";
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${GEMINI_API_KEY}`;

if (!GEMINI_API_KEY) {
  throw new Error(
    "Missing GEMINI_API_KEY. Copy .env.example to .env and paste your free Gemini API key from https://aistudio.google.com/apikey"
  );
}

export interface ListingInput {
  title: string;
  companyName: string | null;
  companyDescription: string | null;
  descriptionMd: string;
  existingSkills: string[] | null;
}

/**
 * Runs one extraction, with a single retry on schema-validation failure
 * (per the red flag we scoped: don't silently store garbage, don't loop forever).
 */
export async function extractListing(input: ListingInput): Promise<ExtractedListing> {
  const attempt = async (): Promise<ExtractedListing> => {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: buildPrompt(input) }] }],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: geminiResponseSchema,
          temperature: 0.2,
        },
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Gemini request failed: ${res.status} ${res.statusText} -- ${body}`);
    }

    const data = (await res.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      throw new Error("Gemini returned no content");
    }

    return ExtractedListingSchema.parse(JSON.parse(text));
  };

  try {
    return await attempt();
  } catch (err) {
    console.warn("Extraction attempt 1 failed, retrying once:", err);
    return await attempt(); // let this one throw if it fails again -- caller flags for manual review
  }
}

function buildPrompt(input: ListingInput): string {
  return `Extract structured data from this YC job listing.

Title: ${input.title}
Company: ${input.companyName ?? "unknown"}
Company description: ${input.companyDescription ?? "none provided"}
Pre-tagged skills (may be empty — if so, infer must-have skills from the description text): ${
    input.existingSkills?.length ? input.existingSkills.join(", ") : "(none provided by source)"
  }

Job description:
"""
${input.descriptionMd}
"""

Classify role_category by what the role actually does day-to-day, not just the title. Be conservative with ai_integration_depth — only mark ai_native if the product itself is fundamentally about AI, not just "uses an LLM API somewhere."`;
}
