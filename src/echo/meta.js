import { useEffect } from 'react';

// Per-route <title> and meta description (the app is a client-rendered SPA).
export function usePageMeta(title, description) {
  useEffect(() => {
    document.title = title;
    let tag = document.querySelector('meta[name="description"]');
    if (!tag) {
      tag = document.createElement('meta');
      tag.name = 'description';
      document.head.appendChild(tag);
    }
    tag.content = description;
  }, [title, description]);
}
