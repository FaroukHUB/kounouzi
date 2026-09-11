export type { NarrationMode, NarrationService, Utterance, VoiceInfo } from "./NarrationService";
export { NullNarrator } from "./NarrationService";
export { WebSpeechNarrator } from "./WebSpeechNarrator";
export { CloudNarrator, type AudioLike, type CloudAvailability, type CloudNarratorOptions } from "./CloudNarrator";
export { voiceKey, hash53, normalizeVoiceText } from "./voiceKey";
export { handleVoiceRequest, voiceConfigured, voiceQuerySchema, type VoiceRouteDeps } from "./voiceRoute";
export { utteranceFor } from "./narrationScript";
export { splitChoices, questionUtterances, pronounceable, segmentsByScript, planUtterances, EMPTY_LEXICON, type Choice, type SplitPrompt, type PronunciationLexicon } from "./speechText";
