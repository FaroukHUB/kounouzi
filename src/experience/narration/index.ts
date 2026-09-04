export type { NarrationService, Utterance, VoiceInfo } from "./NarrationService";
export { NullNarrator } from "./NarrationService";
export { WebSpeechNarrator } from "./WebSpeechNarrator";
export { utteranceFor } from "./narrationScript";
export { splitChoices, questionUtterances, pronounceable, segmentsByScript, planUtterances, EMPTY_LEXICON, type Choice, type SplitPrompt, type PronunciationLexicon } from "./speechText";
