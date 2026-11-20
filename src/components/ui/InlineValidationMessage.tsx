'use client';

import { useEffect, useRef, useState } from 'react';

import { cn } from '@/lib/utils';

export interface InlineValidationMessageProps {
  /** Current validation message. Falsy values render nothing visibly. */
  message?: string | null;
  /** Id applied to the visible message for `aria-describedby`. */
  id?: string;
  /** Extra classes for the visible message. */
  className?: string;
  /** Test id for the visible message element. */
  testId?: string;
}

/**
 * Accessible inline validation message for asynchronous validation.
 *
 * A separate sr-only polite live region announces the message when it appears
 * (or changes to a different error), while the visible text remains available
 * for pointer users and focus/navigation. Clearing the message removes the
 * visible text without pushing a new announcement, and unchanged messages are
 * not re-announced on every render/keystroke.
 */
export function InlineValidationMessage({
  message,
  id,
  className,
  testId,
}: InlineValidationMessageProps) {
  const visibleMessage = message?.trim() ? message : '';
  const [announcement, setAnnouncement] = useState('');
  const previousMessage = useRef('');

  useEffect(() => {
    const prev = previousMessage.current;

    if (visibleMessage && visibleMessage !== prev) {
      // Announce on appearance and when async validation resolves to a
      // different error. Identical messages are intentionally not re-announced.
      setAnnouncement(visibleMessage);
    } else if (!visibleMessage && prev) {
      // Clear without introducing a new spoken announcement.
      setAnnouncement('');
    }

    previousMessage.current = visibleMessage;
  }, [visibleMessage]);

  return (
    <>
      <span
        data-testid={testId ? `${testId}-live-region` : undefined}
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {announcement}
      </span>
      {visibleMessage ? (
        <p
          id={id}
          data-testid={testId}
          className={cn('text-xs text-red-700', className)}
        >
          {visibleMessage}
        </p>
      ) : null}
    </>
  );
}

export default InlineValidationMessage;
