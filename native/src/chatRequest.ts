/** Retain this id until a card is acknowledged; a response lost on a bad connection is safe to retry. */
export function newChatRequestId() { return `chat-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 14)}`; }
