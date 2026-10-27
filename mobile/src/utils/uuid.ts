/**
 * Random UUID (v4 format) for idempotency keys such as a chat message's clientId.
 * Not for anything secret: Math.random is fine for avoiding collisions here.
 */
export function uuid(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
    const random = (Math.random() * 16) | 0;
    return (char === 'x' ? random : (random & 0x3) | 0x8).toString(16);
  });
}
