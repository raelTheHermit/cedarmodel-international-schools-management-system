import { createContext, useContext } from 'react';

export const MessageModalContext = createContext<(message: string) => void>(() => undefined);

export function useMessageModal() {
  return useContext(MessageModalContext);
}

export function MessageModal({ message, onClose }: { message: string; onClose: () => void }) {
  if (!message) return null;

  return (
    <div
      className="message-modal-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section className="message-modal" role="dialog" aria-modal="true" aria-labelledby="message-modal-title">
        <span className="message-modal-mark" aria-hidden="true">!</span>
        <h2 id="message-modal-title">Portal message</h2>
        <p>{message}</p>
        <button type="button" className="message-modal-button" onClick={onClose} autoFocus>Okay</button>
      </section>
    </div>
  );
}
