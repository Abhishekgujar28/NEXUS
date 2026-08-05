import { useState, useEffect, useCallback } from 'react';

/**
 * Typewriter hook that cycles through command strings.
 * Used in the landing command input to show example prompts.
 */
export function useTypewriter(
  words: string[],
  {
    typingMs = 50,
    deletingMs = 25,
    pauseMs = 2400,
    loop = true,
  } = {}
) {
  const [index, setIndex] = useState(0);
  const [text, setText] = useState('');
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!words.length) return;

    const current = words[index];

    const timeout = setTimeout(
      () => {
        if (!deleting) {
          setText(current.slice(0, text.length + 1));
          if (text.length + 1 === current.length) {
            setTimeout(() => setDeleting(true), pauseMs);
          }
        } else {
          setText(current.slice(0, text.length - 1));
          if (text.length - 1 === 0) {
            setDeleting(false);
            setIndex((i) => (i + 1 < words.length ? i + 1 : loop ? 0 : i));
          }
        }
      },
      deleting ? deletingMs : typingMs
    );

    return () => clearTimeout(timeout);
  }, [text, deleting, index, words, typingMs, deletingMs, pauseMs, loop]);

  return text;
}
