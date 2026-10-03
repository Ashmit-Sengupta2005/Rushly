import { useState, type ImgHTMLAttributes } from 'react';
import { ImageOff } from 'lucide-react';
import { cn } from '@/lib/utils';

// <img> that fades in once loaded (no pop-in) and falls back to a placeholder
// icon when the URL is broken. The parent should provide the size + bg-muted.
export function FadeImage({ className, alt, ...props }: ImgHTMLAttributes<HTMLImageElement>) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  if (failed || !props.src) {
    return (
      <div className="flex h-full w-full items-center justify-center text-muted-foreground">
        <ImageOff className="size-6" aria-label="No image" />
      </div>
    );
  }

  return (
    <img
      {...props}
      alt={alt}
      onLoad={() => setLoaded(true)}
      onError={() => setFailed(true)}
      className={cn('transition-opacity duration-500', loaded ? 'opacity-100' : 'opacity-0', className)}
    />
  );
}
