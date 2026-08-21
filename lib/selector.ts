export function getUniqueSelector(el: Element): string {
 if (el.id) return `#${CSS.escape(el.id)}`;

 const path: string[] = [];
 let current: Element | null = el;

 while (current && current !== document.body && current.parentElement) {
  const parent = current.parentElement;
  const siblings = Array.from(parent.children).filter(
   (c) => c.tagName === current!.tagName,
  );
  const index = siblings.indexOf(current) + 1;
  const tag = current.tagName.toLowerCase();
  path.unshift(siblings.length > 1 ? `${tag}:nth-of-type(${index})` : tag);
  current = parent;
 }

 return path.length ? `body > ${path.join(' > ')}` : 'body';
}
