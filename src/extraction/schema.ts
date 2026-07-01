import { z } from "zod";

// This is intentionally narrow. Algolia already gives us skills[], job_type,
// remote, min_experience, has_salary, has_equity — we only ask the LLM for the
// judgment calls that require actually reading the prose.
export const ExtractedListingSchema = z.object({
  role_category: z.enum([
    "backend",
    "frontend",
    "fullstack",
    "forward_deployed",
    "devops_infra",
    "data_ml",
    "other",
  ]),
  seniority: z.enum(["intern", "junior", "mid", "senior", "unclear"]),
  must_have_skills: z.array(z.string()).max(15),
  nice_to_have_skills: z.array(z.string()).max(15),
  ai_integration_depth: z.enum(["none", "mentioned", "core_to_role", "ai_native"]),
  ai_integration_notes: z.string().max(400),
  interview_process_summary: z.string().max(400).nullable(),
});

export type ExtractedListing = z.infer<typeof ExtractedListingSchema>;

export const EXTRACTION_TOOL_NAME = "record_extraction";

// Passed to Claude as a forced tool_use — guarantees valid-shaped JSON back,
// no free-text parsing, no markdown-fence stripping.
export const extractionToolDefinition = {
  name: EXTRACTION_TOOL_NAME,
  description: "Record structured fields extracted from a job listing description.",
  input_schema: {
    type: "object" as const,
    properties: {
      role_category: {
        type: "string",
        enum: [
          "backend",
          "frontend",
          "fullstack",
          "forward_deployed",
          "devops_infra",
          "data_ml",
          "other",
        ],
      },
      seniority: { type: "string", enum: ["intern", "junior", "mid", "senior", "unclear"] },
      must_have_skills: { type: "array", items: { type: "string" } },
      nice_to_have_skills: { type: "array", items: { type: "string" } },
      ai_integration_depth: {
        type: "string",
        enum: ["none", "mentioned", "core_to_role", "ai_native"],
        description:
          "none = no AI mention. mentioned = AI referenced as a tool used internally or nice-to-have. core_to_role = building AI features is a stated responsibility. ai_native = the product/role is fundamentally an AI product.",
      },
      ai_integration_notes: {
        type: "string",
        description: "1-2 sentence summary of how AI actually shows up in this role, in your own words.",
      },
      interview_process_summary: {
        type: ["string", "null"],
        description: "Summary of interview stages if mentioned in the text, else null.",
      },
    },
    required: [
      "role_category",
      "seniority",
      "must_have_skills",
      "nice_to_have_skills",
      "ai_integration_depth",
      "ai_integration_notes",
      "interview_process_summary",
    ],
  },
};

// Same shape as extractionToolDefinition.input_schema, in Gemini's
// responseSchema dialect (OpenAPI-subset: no "null" in a type array --
// nullable fields use `nullable: true` instead).
export const geminiResponseSchema = {
  type: "object",
  properties: {
    role_category: {
      type: "string",
      enum: [
        "backend",
        "frontend",
        "fullstack",
        "forward_deployed",
        "devops_infra",
        "data_ml",
        "other",
      ],
    },
    seniority: { type: "string", enum: ["intern", "junior", "mid", "senior", "unclear"] },
    must_have_skills: { type: "array", items: { type: "string" } },
    nice_to_have_skills: { type: "array", items: { type: "string" } },
    ai_integration_depth: {
      type: "string",
      enum: ["none", "mentioned", "core_to_role", "ai_native"],
    },
    ai_integration_notes: { type: "string" },
    interview_process_summary: { type: "string", nullable: true },
  },
  required: [
    "role_category",
    "seniority",
    "must_have_skills",
    "nice_to_have_skills",
    "ai_integration_depth",
    "ai_integration_notes",
    "interview_process_summary",
  ],
};
