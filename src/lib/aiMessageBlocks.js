// Presentation only: keep the reply's words and distinguish guidance from the
// question the client should answer. No content is executed as HTML.
export function aiMessageBlocks(content){
 return String(content||'').split(/\n\s*\n/u).flatMap(paragraph=>paragraph.trim().split(/(?<=[.!])\s+(?=(?:What |Which |When |Where |How |Would you |Could you |ما |كم |أين |متى |هل ))/u)).filter(Boolean).map(text=>({
  text,
  kind:/^(?:you can (?:also )?choose services and equipment|tip:|يمكنك (?:أيضاً )?اختيار الخدمات والمعدات)/iu.test(text)?'tip':/[?؟]/u.test(text)||/^(?:please (?:tell|provide|share|choose)|أخبرني|اختر)/iu.test(text)?'question':/(?:AI tasks|مهام المساعد)/iu.test(text)&&/(?:✓|confirm|تأكيد|أكّد)/iu.test(text)?'confirmation':'reply',
 }));
}
