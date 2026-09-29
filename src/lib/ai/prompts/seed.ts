import type { PromptVariableDef } from "./variables";

export interface PromptSeed {
  id: string; title: string; description: string; category: string; tags: string[]; audience: string[];
  safetyClass: "GENERAL" | "EDUCATIONAL" | "CLINICAL_DRAFT"; version: number; template: string;
  variables: (PromptVariableDef & { label: string })[]; outputFormat: string; capabilities: string[];
}

export const SYSTEM_PREAMBLE =
  "You are an assistant inside SmartDoctorAid. Do not invent clinical findings, lab values, diagnoses, drug doses or references; " +
  "if information is missing or uncertain, say so explicitly. Mark uncertain statements as [UNVERIFIED]. Output is a draft for professional review.";

export const PROMPT_SEED: PromptSeed[] = [
  {
    id: "clinical-note-structured", title: "Generate Structured Clinical Notes",
    description: "Turn a consultation transcript into a structured clinical note draft for the treating doctor to review.",
    category: "clinical-documentation", tags: ["clinical", "scribe"], audience: ["DOCTOR"], safetyClass: "CLINICAL_DRAFT", version: 1,
    template: "Create a {{note_format}} clinical note in {{language}} for a {{specialty}} consultation.\nRelevant history: {{history}}\n\nTranscript:\n{{transcript}}\n\nUse only facts stated in the transcript/history. List anything missing under 'Not documented'.",
    variables: [
      { key: "transcript", label: "Consultation transcript", type: "long_text", required: true },
      { key: "history", label: "Relevant medical history", type: "long_text", required: true },
      { key: "note_format", label: "Preferred note format", type: "dropdown", required: true, options: ["SOAP", "Narrative", "Problem-oriented"] },
      { key: "language", label: "Output language", type: "dropdown", required: true, options: ["English", "Bangla"] },
      { key: "specialty", label: "Specialty", type: "short_text", required: true },
    ],
    outputFormat: "markdown", capabilities: ["writing", "clinical"],
  },
  {
    id: "pico-question", title: "Develop a PICO Question",
    description: "Refine a clinical research idea into a structured PICO question.",
    category: "research", tags: ["research", "pico"], audience: ["RESEARCHER", "STUDENT", "DOCTOR"], safetyClass: "EDUCATIONAL", version: 1,
    template: "Turn this topic into 3 candidate PICO questions with rationale and suggested study designs.\nTopic: {{topic}}\nPopulation of interest (optional context): {{population}}",
    variables: [
      { key: "topic", label: "Topic", type: "long_text", required: true, maxLength: 2000 },
      { key: "population", label: "Population", type: "short_text", required: false },
    ],
    outputFormat: "markdown", capabilities: ["writing", "research"],
  },
  {
    id: "flashcards", title: "Create Flashcards",
    description: "Generate study flashcards from lecture notes.",
    category: "medical-education", tags: ["education", "flashcards"], audience: ["STUDENT", "EDUCATOR"], safetyClass: "EDUCATIONAL", version: 1,
    template: "Create {{count}} flashcards (Q/A) from the notes below at {{level}} level. Only use the notes; flag gaps.\n\nNotes:\n{{notes}}",
    variables: [
      { key: "notes", label: "Notes", type: "long_text", required: true },
      { key: "count", label: "Number of cards", type: "number", required: true, min: 1, max: 100 },
      { key: "level", label: "Level", type: "dropdown", required: true, options: ["Undergraduate", "Postgraduate"] },
    ],
    outputFormat: "table", capabilities: ["writing"],
  },
  {
    id: "meeting-summary", title: "Summarise a Meeting",
    description: "Summarise meeting notes into decisions and action items.",
    category: "business", tags: ["productivity"], audience: ["USER"], safetyClass: "GENERAL", version: 1,
    template: "Summarise into: Decisions, Action items (owner, due), Open questions.\n\n{{notes}}",
    variables: [{ key: "notes", label: "Meeting notes", type: "long_text", required: true }],
    outputFormat: "markdown", capabilities: ["writing"],
  },
];
