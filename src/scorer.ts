import { IOptions, Query } from './index';

const wm = 150;
const pos_bonus = 20;
const tau_size = 150;
const miss_coeff = 0.75;

export const scorer = {
  score(string: string, query: string, options: IOptions): number {
    const preparedQuery = options.preparedQuery || new Query(query, options);
    const allowErrors = options.allowErrors || false;

    if (!(allowErrors || isMatch(string, preparedQuery.core_lw, preparedQuery.core_up))) {
      return 0;
    }

    const string_lw = string.toLowerCase();
    const score = computeScore(string, string_lw, preparedQuery);
    return Math.ceil(score);
  }
};

export function isMatch(subject: string, query_lw: string, query_up: string): boolean {
  let i = -1;
  let j = -1;
  const m = subject.length;
  const n = query_lw.length;

  if (!m || n > m) {
    return false;
  }

  while (++j < n) {
    const qj_lw = query_lw.charCodeAt(j);
    const qj_up = query_up.charCodeAt(j);

    while (++i < m) {
      const si = subject.charCodeAt(i);
      if (si === qj_lw || si === qj_up) {
        break;
      }
    }

    if (i === m) {
      return false;
    }
  }

  return true;
}

export function computeScore(subject: string, subject_lw: string, preparedQuery: Query): number {
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

  const score_row = new Array(n);
  const csc_row = new Array(n);
  const sz = scoreSize(n, m);
  const miss_budget = Math.ceil(miss_coeff * n) + 5;
  let miss_left = miss_budget;
  let csc_should_rebuild = true;

  for (let j = 0; j < n; j++) {
    score_row[j] = 0;
    csc_row[j] = 0;
  }

  let score = 0;

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

    score = 0;
    let score_diag = 0;
    let csc_diag = 0;
    let record_miss = true;
    csc_should_rebuild = true;

    for (let j = 0; j < n; j++) {
      const score_up = score_row[j];
      score = score > score_up ? score : score_up;
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
            return Math.max(score, score_row[n - 1]) * sz;
          }
          record_miss = false;
        }
      }

      score_diag = score_up;
      csc_diag = csc_row[j];
      csc_row[j] = csc_score;
      score_row[j] = score;
    }
  }

  score = score_row[n - 1];
  return score * sz;
}

export function isWordStart(pos: number, subject: string, subject_lw: string): boolean {
  if (pos === 0) return true;
  const curr_s = subject[pos];
  const prev_s = subject[pos - 1];
  return isSeparator(prev_s) || (curr_s !== subject_lw[pos] && prev_s === subject_lw[pos - 1]);
}

function isSeparator(c: string): boolean {
  return c === ' ' || c === '.' || c === '-' || c === '_' || c === '/' || c === '\\';
}

function scorePosition(pos: number): number {
  if (pos < pos_bonus) {
    const sc = pos_bonus - pos;
    return 100 + sc * sc;
  } else {
    return Math.max(100 + pos_bonus - pos, 0);
  }
}

export function scoreSize(n: number, m: number): number {
  return tau_size / (tau_size + Math.abs(m - n));
}

function scoreExact(n: number, m: number, quality: number, pos: number): number {
  return 2 * n * (wm * quality + scorePosition(pos)) * scoreSize(n, m);
}

export function scorePattern(count: number, len: number, sameCase: number, start: boolean, end: boolean): number {
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
}

export function scoreCharacter(i: number, j: number, start: boolean, acro_score: number, csc_score: number): number {
  const posBonus = scorePosition(i);
  if (start) {
    return posBonus + wm * ((acro_score > csc_score ? acro_score : csc_score) + 10);
  }
  return posBonus + wm * csc_score;
}

export function scoreConsecutives(subject: string, subject_lw: string, query: string, query_lw: string, i: number, j: number, startOfWord: boolean): number {
  let m = subject.length;
  let n = query.length;
  let mi = m - i;
  let nj = n - j;
  let k = mi < nj ? mi : nj;
  let sameCase = 0;
  let sz = 0;
  if (query[j] === subject[i]) {
    sameCase++;
  }
  while (++sz < k && query_lw[++j] === subject_lw[++i]) {
    if (query[j] === subject[i]) {
      sameCase++;
    }
  }
  if (sz < k) {
    i--;
  }
  if (sz === 1) {
    return 1 + 2 * sameCase;
  }
  return scorePattern(sz, n, sameCase, startOfWord, isWordEnd(i, subject, subject_lw, m));
}

function scoreExactMatch(subject: string, subject_lw: string, query: string, query_lw: string, pos: number, n: number, m: number): number {
  let start = isWordStart(pos, subject, subject_lw);
  let sameCase = 0;
  if (!start) {
    let pos2 = subject_lw.indexOf(query_lw, pos + 1);
    if (pos2 > -1) {
      start = isWordStart(pos2, subject, subject_lw);
      if (start) {
        pos = pos2;
      }
    }
  }
  for (let i = 0; i < n; i++) {
    if (query[i] === subject[pos + i]) {
      sameCase++;
    }
  }
  let end = isWordEnd(pos + n - 1, subject, subject_lw, m);
  return scoreExact(n, m, scorePattern(n, n, sameCase, start, end), pos);
}

export function isWordEnd(pos: number, subject: string, subject_lw: string, len: number): boolean {
  if (pos === len - 1) return true;
  const curr_s = subject[pos];
  const next_s = subject[pos + 1];
  return isSeparator(next_s) || (curr_s === subject_lw[pos] && next_s !== subject_lw[pos + 1]);
}

class AcronymResult {
  constructor(public score: number, public pos: number, public count: number) {}
}

const emptyAcronymResult = new AcronymResult(0, 0.1, 0);

export function scoreAcronyms(subject: string, subject_lw: string, query: string, query_lw: string): AcronymResult {
  const m = subject.length;
  const n = query.length;
  if (!(m > 1 && n > 1)) {
    return emptyAcronymResult;
  }
  let count = 0;
  let sepCount = 0;
  let sumPos = 0;
  let sameCase = 0;
  let i = -1;
  let j = -1;

  while (++j < n) {
    const qj_lw = query_lw[j];
    if (isSeparator(qj_lw)) {
      i = subject_lw.indexOf(qj_lw, i + 1);
      if (i > -1) {
        sepCount++;
        continue;
      } else {
        break;
      }
    }
    while (++i < m) {
      if (qj_lw === subject_lw[i] && isWordStart(i, subject, subject_lw)) {
        if (query[j] === subject[i]) {
          sameCase++;
        }
        sumPos += i;
        count++;
        break;
      }
    }
    if (i === m) {
      break;
    }
  }

  if (count < 2) {
    return emptyAcronymResult;
  }

  const fullWord = count === n ? isAcronymFullWord(subject, subject_lw, query, count) : false;
  const score = scorePattern(count, n, sameCase, true, fullWord);
  return new AcronymResult(score, sumPos / count, count + sepCount);
}

function isAcronymFullWord(subject: string, subject_lw: string, query: string, nbAcronymInQuery: number): boolean {
  const m = subject.length;
  const n = query.length;
  if (m > 12 * n) return false;
  let count = 0;
  for (let i = 0; i < m; i++) {
    if (isWordStart(i, subject, subject_lw) && ++count > nbAcronymInQuery) {
      return false;
    }
  }
  return true;
}
