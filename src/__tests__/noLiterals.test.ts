// AC-45: components never inline player-facing text; it comes from the dictionaries (src/i18n/, src/content/).
const fs = jest.requireActual('fs');
const path = jest.requireActual('path');

function files(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e: { name: string; isDirectory: () => boolean }) => {
    const p = path.join(dir, e.name);
    return e.isDirectory() ? files(p) : /\.tsx$/.test(e.name) ? [p] : [];
  });
}

const ROOT = path.join(process.cwd(), 'src');
const COMPONENTS = [...files(path.join(ROOT, 'screens')), ...files(path.join(ROOT, 'ui')), ...files(path.join(ROOT, 'render')), path.join(ROOT, 'App.tsx')];

describe('no hard-coded player-facing text (AC-45)', () => {
  it('finds the components to scan', () => {
    expect(COMPONENTS.length).toBeGreaterThan(10);
  });

  it.each(COMPONENTS.map((f: string) => [path.relative(ROOT, f), f]))('%s has no text literal in JSX or text props', (_name, file) => {
    const src: string = fs.readFileSync(file, 'utf8');
    // Words between JSX tags: >Bonjour<
    // (single line, no code punctuation: TypeScript generics such as useState<X>(null) are not text).
    const jsxText = [...src.matchAll(/>[ \t]*([^<>{}\n;=()]*?)[ \t]*</g)].map((m) => m[1]).filter((t) => /\p{L}{2,}/u.test(t));
    // Text props with a literal string.
    const props = [...src.matchAll(/(label|title|text|accessibilityLabel|accessibilityHint|placeholder)=["']([^"']*\p{L}[^"']*)["']/gu)].map((m) => m[0]);
    expect([...jsxText, ...props]).toEqual([]);
  });
});
