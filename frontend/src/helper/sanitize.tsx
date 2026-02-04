import DOMPurify from 'dompurify';

export function sanitize(v: string) {
  return DOMPurify.sanitize(v) || "<Invalid Characters>";
}
