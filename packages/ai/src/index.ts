export { callGeminiJson, streamGeminiText, GeminiUnavailableError } from "./gemini";
export { translateProductNameToPT, findSemanticMatch } from "./keyword-normalizer";
export { extractHook, type HookData, type HookType } from "./hook-extractor";
export { generateUGCScript, streamUGCScript, type UGCScript, type UGCScriptInput } from "./script-generator";
export { analyzeOpportunity, type OpportunityAnalysisInput } from "./opportunity-analyst";
export { parseJsonDefensive } from "./jsonParser";
export { renderOpportunityEmail, type OpportunityEmailInput, type RenderedEmail } from "./email-template";
