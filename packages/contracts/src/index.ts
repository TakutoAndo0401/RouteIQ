import { z } from "zod/v4";

export const routeTypeSchema = z.enum(["expressway", "local"]);
export const prioritizeSchema = z.enum(["time", "cost", "balanced"]);
export const congestionLevelSchema = z.enum(["unknown", "low", "moderate", "high"]);
export const tollConfidenceSchema = z.enum(["api", "unavailable"]);

export const departureTimeSchema = z.string().datetime();

export const routeRequestSchema = z.object({
  origin: z.string().min(1),
  destination: z.string().min(1),
  departureTime: departureTimeSchema.optional(),
  fuelEfficiencyKmPerLiter: z.number().positive(),
  fuelPriceYenPerLiter: z.number().nonnegative().optional(),
  vehicleType: z.string().min(1).optional(),
  prioritize: prioritizeSchema.optional()
});

export const routeAnalysisRequestSchema = routeRequestSchema.extend({
  question: z.string().min(1).optional()
});

export const routeProviderRequestSchema = z.object({
  origin: z.string().min(1),
  destination: z.string().min(1),
  departureTime: departureTimeSchema.optional(),
  routeType: routeTypeSchema
});

export const providerRouteResultSchema = z.object({
  routeType: routeTypeSchema,
  distanceKm: z.number(),
  durationMinutes: z.number(),
  tollYen: z.number().nullable(),
  tollConfidence: tollConfidenceSchema,
  tollFallbackMessage: z.string().optional(),
  trafficSummary: z.string(),
  congestionLevel: congestionLevelSchema,
  trafficIncidents: z.array(z.string()),
  roadClosures: z.array(z.string()),
  warnings: z.array(z.string()),
  dataSources: z.array(z.string()),
  apiFailures: z.array(z.string())
});

export const routeCostSummarySchema = z.object({
  distanceKm: z.number(),
  durationMinutes: z.number(),
  tollYen: z.number().nullable(),
  tollConfidence: tollConfidenceSchema,
  tollFallbackMessage: z.string().optional(),
  fuelCostYen: z.number(),
  totalCostYen: z.number().nullable(),
  trafficSummary: z.string()
});

export const routeComparisonSchema = z.object({
  timeDifferenceMinutes: z.number(),
  costDifferenceYen: z.number().nullable(),
  valueOfTimeSavedYenPerMinute: z.number().nullable()
});

export const compareRoutesResultSchema = z.object({
  input: routeRequestSchema,
  recommendedRoute: routeTypeSchema,
  recommendationReason: z.string(),
  expresswayRoute: routeCostSummarySchema,
  localRoute: routeCostSummarySchema,
  comparison: routeComparisonSchema,
  trafficIncidents: z.array(z.string()),
  warnings: z.array(z.string()),
  dataSources: z.array(z.string()),
  apiFailures: z.array(z.string())
});

export const trafficResultSchema = z.object({
  congestionLevel: congestionLevelSchema,
  incidents: z.array(z.string()),
  roadClosures: z.array(z.string()),
  trafficSummary: z.string(),
  dataSources: z.array(z.string()),
  warnings: z.array(z.string()),
  apiFailures: z.array(z.string())
});

export const tollEstimateSchema = z.object({
  tollYen: z.number().nullable(),
  confidence: tollConfidenceSchema,
  fallbackMessage: z.string().optional(),
  dataSources: z.array(z.string())
});

export const routeAnalysisResultSchema = z.object({
  contextId: z.string(),
  input: routeAnalysisRequestSchema,
  answer: z.string(),
  routeComparison: compareRoutesResultSchema.optional(),
  dataSources: z.array(z.string()),
  warnings: z.array(z.string()),
  apiFailures: z.array(z.string())
});

export const toolResultMessageSchema = z.object({
  structuredContent: compareRoutesResultSchema.optional()
});

export type RouteType = z.infer<typeof routeTypeSchema>;
export type PrioritizeMode = z.infer<typeof prioritizeSchema>;
export type CongestionLevel = z.infer<typeof congestionLevelSchema>;
export type TollConfidence = z.infer<typeof tollConfidenceSchema>;
export type RouteRequest = z.infer<typeof routeRequestSchema>;
export type RouteInput = RouteRequest;
export type RouteAnalysisRequest = z.infer<typeof routeAnalysisRequestSchema>;
export type RouteProviderRequest = z.infer<typeof routeProviderRequestSchema>;
export type ProviderRouteResult = z.infer<typeof providerRouteResultSchema>;
export type RouteCostSummary = z.infer<typeof routeCostSummarySchema>;
export type RouteComparison = z.infer<typeof routeComparisonSchema>;
export type CompareRoutesResult = z.infer<typeof compareRoutesResultSchema> &
  Record<string, unknown>;
export type TrafficResult = z.infer<typeof trafficResultSchema> & Record<string, unknown>;
export type TollEstimate = z.infer<typeof tollEstimateSchema> & Record<string, unknown>;
export type RouteAnalysisResult = z.infer<typeof routeAnalysisResultSchema>;
export type ToolResultMessage = z.infer<typeof toolResultMessageSchema>;
