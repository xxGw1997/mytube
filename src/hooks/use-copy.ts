import { useState } from "react";

interface UseCopyOptions {
  content: string;
  delay?: number;
}

export function useCopy({ content, delay = 2000 }: UseCopyOptions) {
  const [isCopied, setIsCopied] = useState(false);

  const onCopy = async () => {
    await navigator.clipboard.writeText(content);
    setIsCopied(true);
    setTimeout(() => {
      setIsCopied(false);
    }, delay);
  };

  return { isCopied, onCopy };
}
