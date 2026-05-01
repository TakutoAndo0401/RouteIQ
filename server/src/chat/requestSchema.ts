import { routeAnalysisRequestSchema } from "@routeiq/contracts";
import { z } from "zod/v4";
import {
  departureTimeWindowMessage,
  isDepartureTimeWithinToday
} from "../domain/departureTime.js";

const departureTimeSchema = z
  .string()
  .datetime()
  .refine(isDepartureTimeWithinToday, departureTimeWindowMessage);

export const routeAnalysisArgsSchema = routeAnalysisRequestSchema.extend({
  departureTime: departureTimeSchema.optional()
});
