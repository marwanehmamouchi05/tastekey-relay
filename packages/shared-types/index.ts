import { z } from "zod";
export const Category = z.enum([
  "movie",
  "tv_show",
  "artist",
  "book",
  "brand",
  "destination",
  "place",
  "design",
]);
export type Category = z.infer<typeof Category>;
export const Context = z.enum(["entertainment", "shopping", "travel"]);
export type Context = z.infer<typeof Context>;
export const EntitySchema = z.object({
  id: z.string().min(1).max(200),
  name: z.string().min(1).max(200),
  category: Category,
  affinity: z.number().optional(),
  description: z.string().max(3000).optional(),
  explainability: z.string().max(4000).optional(),
  tags: z.array(z.string()).default([]),
});
export type Entity = z.infer<typeof EntitySchema>;
export type Evidence = {
  id: string;
  source: "user" | "qloo" | "rule" | "model";
  detail: string;
  at: string;
};
export type Preference = {
  id: string;
  label: string;
  category: Category;
  status: "stated" | "inferred" | "confirmed" | "rejected" | "superseded";
  entity?: Entity;
  parentId?: string;
  evidence: Evidence[];
  updatedAt: string;
  position?: { x: number; y: number };
};
export type Consent = {
  context: Context;
  nodeIds: string[];
  budget: boolean;
  expiresAt: string;
};
export type Profile = {
  version: 1;
  nodes: Preference[];
  consents: Partial<Record<Context, Consent>>;
  budgets: Partial<Record<"shopping" | "travel", number>>;
  history: Evidence[];
};
const EvidenceSchema = z.object({
  id: z.string(),
  source: z.enum(["user", "qloo", "rule", "model"]),
  detail: z.string(),
  at: z.iso.datetime(),
});
export const ProfileSchema: z.ZodType<Profile> = z.object({
  version: z.literal(1),
  nodes: z.array(
    z.object({
      id: z.string(),
      label: z.string().max(200),
      category: Category,
      status: z.enum([
        "stated",
        "inferred",
        "confirmed",
        "rejected",
        "superseded",
      ]),
      entity: EntitySchema.optional(),
      parentId: z.string().optional(),
      evidence: z.array(EvidenceSchema),
      updatedAt: z.iso.datetime(),
      position: z.object({ x: z.number(), y: z.number() }).optional(),
    }),
  ),
  consents: z.partialRecord(
    Context,
    z.object({
      context: Context,
      nodeIds: z.array(z.string()),
      budget: z.boolean(),
      expiresAt: z.iso.datetime(),
    }),
  ),
  budgets: z.object({
    shopping: z.number().min(0).max(1000000).optional(),
    travel: z.number().min(0).max(1000000).optional(),
  }),
  history: z.array(EvidenceSchema),
});
export type Trace = { state: string; tool: string; detail: string; at: string };
export type QlooEvidence = {
  id: string;
  source: "qloo";
  tool: string;
  inputs: Record<string, string>;
  entities: Entity[];
  at: string;
  cached: boolean;
};
export const BusinessSchema = z.object({
  name: z.string().trim().min(2).max(100),
  industry: z.enum(["cinema", "bookshop", "cafe", "retail", "travel"]),
  city: z.string().trim().min(2).max(100),
  catalog: z.string().trim().min(3).max(2000),
  audience: z.string().max(1000),
  positioning: z.string().max(1000),
  competitors: z.string().max(1000),
  goal: z.string().trim().min(3).max(1000),
  budget: z.number().min(0).max(10000000),
  currency: z.enum(["USD", "MAD", "EUR"]),
  constraints: z.string().max(2000),
  seeds: z.array(EntitySchema).max(8),
});
export type BusinessInput = z.infer<typeof BusinessSchema>;
export type Business = BusinessInput & { id: string; updatedAt: string };
export type Strategy = {
  id: string;
  entityId?: string;
  title: string;
  rationale: string;
  evidenceIds: string[];
  cost: number;
  effort: string;
  risks: string;
  dependencies: string;
  nextAction: string;
  status: "proposed" | "accepted" | "rejected";
  revision?: string;
  alignment: number;
  source: "qloo-assisted" | "baseline";
};
export type Analysis = {
  id: string;
  businessId: string;
  input: BusinessInput;
  createdAt: string;
  mode: "live" | "unavailable" | "baseline";
  evidence: QlooEvidence[];
  strategies: Strategy[];
  trace: Trace[];
  limitations: string[];
  lessons: string[];
  error?: string;
  modelUsed: boolean;
};
export const ActionInput = z.object({
  title: z.string().trim().min(3).max(300),
  owner: z.string().max(100),
  cost: z.number().min(0).max(10000000),
  due: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  status: z.enum(["planned", "in-progress", "done"]),
  priority: z.enum(["high", "medium", "low"]),
  dependencies: z.string().max(1000),
  objective: z.string().max(1000),
});
export type Action = z.infer<typeof ActionInput> & {
  id: string;
  businessId: string;
  strategyId?: string;
};
export const OutcomeInput = z.object({
  actionId: z.string().min(1),
  metric: z.string().trim().min(2).max(100),
  expected: z.number().min(0),
  actual: z.number().min(0),
  notes: z.string().max(2000),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});
export type Outcome = z.infer<typeof OutcomeInput> & {
  id: string;
  businessId: string;
};
export type Workspace = {
  businesses: Business[];
  analyses: Analysis[];
  actions: Action[];
  outcomes: Outcome[];
  reviews: Review[];
};
export const ReviewInput = z.object({
  analysisId: z.string().uuid(),
  reviewer: z.string().trim().min(2).max(80),
  relevance: z.number().int().min(1).max(5),
  feasibility: z.number().int().min(1).max(5),
  specificity: z.number().int().min(1).max(5),
  grounding: z.number().int().min(1).max(5),
  traceability: z.number().int().min(1).max(5),
  rationale: z.string().trim().min(10).max(2000),
});
export type Review = z.infer<typeof ReviewInput> & {
  id: string;
  businessId: string;
  createdAt: string;
};
export const AudienceCategories = Category;
export const AudienceContribution = z.object({
  invitation: z.string().regex(/^[a-f0-9]{64}$/),
  categories: z
    .array(AudienceCategories)
    .min(1)
    .max(8)
    .refine((v) => new Set(v).size === v.length),
  consent: z.literal(true),
});
export const TravelQuoteSchema = z.object({
  id: z.string().uuid(),
  destinationId: z.string().min(1).max(200),
  destination: z.string().min(1).max(200),
  name: z.string().trim().min(2).max(150),
  nightlyUSD: z.number().positive().max(1000000),
  source: z
    .url()
    .refine(
      (v) =>
        new URL(v).protocol === "https:" &&
        !new URL(v).username &&
        !new URL(v).password,
      "Use a public HTTPS source URL without credentials.",
    ),
  checkedAt: z.iso.datetime(),
  stayDate: z.iso.date(),
});
export type TravelQuote = z.infer<typeof TravelQuoteSchema>;
