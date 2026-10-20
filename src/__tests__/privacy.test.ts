// AC-09: the author's room photos are personal data. photos/ is git-ignored and nothing under it is tracked.
import { execFileSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const ROOT = path.join(__dirname, '..', '..');

function git(...args: string[]): string {
  return execFileSync('git', args, { cwd: ROOT, encoding: 'utf8' });
}

describe('room photos stay out of the repository (AC-09)', () => {
  it('.gitignore ignores photos/', () => {
    const lines = fs.readFileSync(path.join(ROOT, '.gitignore'), 'utf8').split(/\r?\n/).map((l) => l.trim());
    expect(lines).toContain('photos/');
    // git itself agrees, for any file that could be dropped there.
    expect(git('check-ignore', 'photos/salon.jpg').trim()).toBe('photos/salon.jpg');
  });

  it('no file under photos/ is tracked', () => {
    expect(git('ls-files', 'photos').trim()).toBe('');
  });
});
