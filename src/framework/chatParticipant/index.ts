import { ConcreteConstructor } from "../utils/types.js";
import { BaseChatParticipant } from "./base.js";

export * from "./base.js";

export function isChatParticipantConstructor(
  value: unknown,
): value is ConcreteConstructor<typeof BaseChatParticipant> {
  return (
    typeof value === "function" &&
    value.prototype instanceof BaseChatParticipant
  );
}
