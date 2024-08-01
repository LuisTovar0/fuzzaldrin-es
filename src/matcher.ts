import {
  isMatch,
  isWordStart,
  scoreConsecutives,
  scoreCharacter,
  scoreAcronyms
} from './scorer';
import { Query } from './query';

interface MatchOptions {
  allowErrors: boolean;
  preparedQuery: Query;
  pathSeparator: string;
}

interface WrapOptions extends MatchOptions {
  wrap?: {
    tagClass?: string;
    tagOpen?: string;
    tagClose?: string;
  };
}

export const match = (string: string, query: string, options: MatchOptions): number[] => {
  const { allowErrors, preparedQuery, pathSeparator } = options;

  if (!(allowErrors || isMatch(string, preparedQuery.core_lw, preparedQuery.core_up))) {
    return [];
  }

  const string_lw = string.toLowerCase();
  let matches = computeMatch(string, string_lw, preparedQuery);

  if (matches.length === 0) {
    return matches;
  }

  if (string.indexOf(pathSeparator) > -1) {
    const baseMatches = basenameMatch(string, string_lw, preparedQuery, pathSeparator);
    matches = mergeMatches(matches, baseMatches);
  }

  return matches;
};

export const wrap = (string: string, query: string, options: WrapOptions): string => {
  const { wrap: wrapOptions = {} } = options;
  let { tagClass = 'highlight', tagOpen, tagClose } = wrapOptions;

  if (!tagOpen) {
    tagOpen = `<strong class="${tagClass}">`;
  }
  if (!tagClose) {
    tagClose = '</strong>';
  }

  if (string === query) {
    return tagOpen + string + tagClose;
  }

  const matchPositions = match(string, query, options);
  if (matchPositions.length === 0) {
    return string;
  }

  let output = '';
  let matchIndex = -1;
  let strPos = 0;

  while (++matchIndex < matchPositions.length) {
    let matchPos = matchPositions[matchIndex];
    if (matchPos > strPos) {
      output += string.substring(strPos, matchPos);
      strPos = matchPos;
    }

    while (++matchIndex < matchPositions.length) {
      if (matchPositions[matchIndex] === matchPos + 1) {
        matchPos++;
      } else {
        matchIndex--;
        break;
      }
    }

    matchPos++;
    if (matchPos > strPos) {
      output += tagOpen;
      output += string.substring(strPos, matchPos);
      output += tagClose;
      strPos = matchPos;
    }
  }

  if (strPos <= string.length - 1) {
    output += string.substring(strPos);
  }

  return output;
};

const basenameMatch = (subject: string, subject_lw: string, preparedQuery: Query, pathSeparator: string): number[] => {
  let end = subject.length - 1;
  while (subject[end] === pathSeparator) {
    end--;
  }

  let basePos = subject.lastIndexOf(pathSeparator, end);
  if (basePos === -1) {
    return [];
  }

  let depth = preparedQuery.depth;
  while (depth-- > 0) {
    basePos = subject.lastIndexOf(pathSeparator, basePos - 1);
    if (basePos === -1) {
      return [];
    }
  }

  basePos++;
  end++;
  return computeMatch(subject.slice(basePos, end), subject_lw.slice(basePos, end), preparedQuery, basePos);
};

const mergeMatches = (a: number[], b: number[]): number[] => {
  const m = a.length;
  const n = b.length;

  if (n === 0) {
    return a.slice();
  }
  if (m === 0) {
    return b.slice();
  }

  const out: number[] = [];
  let i = 0, j = 0;
  let bj = b[j];

  while (i < m) {
    const ai = a[i];
    while (bj <= ai && ++j < n) {
      if (bj < ai) {
        out.push(bj);
      }
      bj = b[j];
    }
    out.push(ai);
    i++;
  }

  while (j < n) {
    out.push(b[j++]);
  }

  return out;
};

const computeMatch = (subject: string, subject_lw: string, preparedQuery: Query, offset: number = 0): number[] => {
  const query = preparedQuery.query;
  const query_lw = preparedQuery.query_lw;
  const m = subject.length;
  const n = query.length;

  const acro = scoreAcronyms(subject, subject_lw, query, query_lw);
  const acro_score = acro.score;

  if (acro.count === n) {
    return scoreExact(n, m, acro_score, acro.pos);
  }

  const pos = subject_lw.indexOf(query_lw);
  if (pos > -1) {
    return scoreExactMatch(subject, subject_lw, query, query_lw, pos, n, m);
  }

  const score_row: number[] = new Array(n).fill(0);
  const csc_row: number[] = new Array(n).fill(0);
  const sz = scoreSize(n, m);
  const miss_budget = Math.ceil(0.75 * n) + 5;
  let miss_left = miss_budget;
  let csc_should_rebuild = true;

  const matches: number[] = [];

  for (let i = 0; i < m; i++) {
    const si_lw = subject_lw[i];
    if (!preparedQuery.charCodes[si_lw.charCodeAt(0)]) {
      if (csc_should_rebuild) {
        for (let j = 0; j < n; j++) {
          csc_row[j] = 0;
        }
        csc_should_rebuild = false;
      }
      continue;
    }

    let score = 0;
    let score_diag = 0;
    let csc_diag = 0;
    let record_miss = true;
    csc_should_rebuild = true;

    for (let j = 0; j < n; j++) {
      const score_up = score_row[j];
      if (score_up > score) {
        score = score_up;
      }

      let csc_score = 0;
      if (query_lw[j] === si_lw) {
        const start = isWordStart(i, subject, subject_lw);
        csc_score = csc_diag > 0 ? csc_diag : scoreConsecutives(subject, subject_lw, query, query_lw, i, j, start);
        const align = score_diag + scoreCharacter(i, j, start, acro_score, csc_score);

        if (align > score) {
          score = align;
          miss_left = miss_budget;
        } else {
          if (record_miss && --miss_left <= 0) {
            return matches;
          }
          record_miss = false;
        }

        matches.push(i + offset);
      }

      score_diag = score_up;
      csc_diag = csc_row[j];
      csc_row[j] = csc_score;
      score_row[j] = score;
    }
  }

  return matches;
};

const scoreSize = (n: number, m: number): number => {
  const tau_size = 150;
  return tau_size / (tau_size + Math.abs(m - n));
};

const scoreExact = (n: number, m: number, quality: number, pos: number): number[] => {
  const wm = 150;
  const sz = scoreSize(n, m);
  return Array.from({ length: n }, (_, i) => i + pos);
};

const scorePosition = (pos: number): number => {
  const pos_bonus = 20;
  if (pos < pos_bonus) {
    const sc = pos_bonus - pos;
    return 100 + sc * sc;
  } else {
    return Math.max(100 + pos_bonus - pos, 0);
  }
};

const scoreExactMatch = (
  subject: string,
  subject_lw: string,
  query: string,
  query_lw: string,
  pos: number,
  n: number,
  m: number
): number[] => {
  let start = isWordStart(pos, subject, subject_lw);
  if (!start) {
    const pos2 = subject_lw.indexOf(query_lw, pos + 1);
    if (pos2 > -1) {
      start = isWordStart(pos2, subject, subject_lw);
      if (start) {
        pos = pos2;
      }
    }
  }

  let sameCase = 0;
  for (let i = 0; i < n; i++) {
    if (query[i] === subject[pos + i]) {
      sameCase++;
    }
  }

  const end = isWordEnd(pos + n - 1, subject, subject_lw, m);
  return Array.from({ length: n }, (_, i) => i + pos);
};

const scorePattern = (count: number, len: number, sameCase: number, start: boolean, end: boolean): number => {
  let sz = count;
  let bonus = 6;

  if (sameCase === count) bonus += 2;
  if (start) bonus += 3;
  if (end) bonus += 1;

  if (count === len) {
    if (start) {
      if (sameCase === len) {
        sz += 2;
      } else {
        sz += 1;
      }
    }
    if (end) {
      bonus += 1;
    }
  }

  return sameCase + sz * (sz + bonus);
};

const isWordEnd = (pos: number, subject: string, subject_lw: string, len: number): boolean => {
  if (pos === len - 1) {
    return true;
  }
  const curr_s = subject[pos];
  const next_s = subject[pos + 1];
  return (
    isSeparator(next_s) ||
    (curr_s === subject_lw[pos] && next_s !== subject_lw[pos + 1])
  );
};

const isSeparator = (c: string): boolean => {
  return c === ' ' || c === '.' || c === '-' || c === '_' || c === '/' || c === '\\';
};
