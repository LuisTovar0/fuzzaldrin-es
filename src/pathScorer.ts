import { IOptions, Query } from './index';
import { computeScore, isMatch, scoreSize } from './scorer';

const tau_depth = 20;
const file_coeff = 2.5;

export const pathScorer = {
  score(string: string, query: string, options: IOptions): number {
    const preparedQuery = options.preparedQuery || new Query(query, options);
    const allowErrors = options.allowErrors || false;

    if (!(allowErrors || isMatch(string, preparedQuery.core_lw, preparedQuery.core_up))) {
      return 0;
    }

    const string_lw = string.toLowerCase();
    const score = computeScore(string, string_lw, preparedQuery);
    const scorePath = calculateScorePath(string, string_lw, score, options);
    return Math.ceil(scorePath);
  },
};

function calculateScorePath(subject: string, subject_lw: string, fullPathScore: number, options: IOptions) {
  if (fullPathScore === 0) {
    return 0;
  }

  if (!options.preparedQuery)
    throw "IOptions.preparedQuery is required in calculateScorePath(), but it's missing.";
  const preparedQuery = options.preparedQuery;
  const useExtensionBonus = options.useExtensionBonus || false;
  const pathSeparator = options.pathSeparator || '/';

  let end = subject.length - 1;
  while (subject[end] === pathSeparator) {
    end--;
  }

  const basePos = subject.lastIndexOf(pathSeparator, end);
  const fileLength = end - basePos;
  let extAdjust = 1.0;

  if (useExtensionBonus) {
    extAdjust += getExtensionScore(subject_lw, preparedQuery.ext, basePos, end, 2);
    fullPathScore *= extAdjust;
  }

  if (basePos === -1) {
    return fullPathScore;
  }

  const depth = preparedQuery.depth;
  let basePos2 = basePos;
  let depth_penalty = 0;
  while (basePos2 > -1 && depth_penalty < depth) {
    depth_penalty++;
    basePos2 = subject.lastIndexOf(pathSeparator, basePos2 - 1);
  }

  const basePathScore = basePos === -1 ?
      fullPathScore :
      extAdjust * computeScore(subject.slice(basePos + 1, end + 1), subject_lw.slice(basePos + 1, end + 1), preparedQuery);

  const alpha = 0.5 * tau_depth / (tau_depth + countDir(subject, end + 1, pathSeparator));
  return alpha * basePathScore + (1 - alpha) * fullPathScore * scoreSize(depth_penalty, file_coeff * fileLength);
}

export function countDir(path: string, end: number, pathSeparator: string|undefined) {
  if (end < 1) {
    return 0;
  }

  let count = 0;
  let i = -1;

  while (++i < end && path[i] === pathSeparator) {
    continue;
  }

  while (++i < end) {
    if (path[i] === pathSeparator) {
      count++;
      while (++i < end && path[i] === pathSeparator) {
        continue;
      }
    }
  }

  return count;
}

export function getExtension(str: string): string {
  const pos = str.lastIndexOf(".");
  return pos < 0 ? "" : str.substr(pos + 1);
}

function getExtensionScore(candidate: string, ext: string, startPos: number, endPos: number, maxDepth: number): number {
  if (!ext.length) {
    return 0;
  }

  const pos = candidate.lastIndexOf(".", endPos);
  if (!(pos > startPos)) {
    return 0;
  }

  const ext_len = ext.length;
  const ext_pos = pos + 1;
  const len = endPos - ext_pos + 1;

  if (len < ext_len) {
    return 0.9 * len / ext_len;
  }

  const match_len = getCommonSubsequenceLength(candidate, ext, ext_pos, ext_len);
  if (match_len === 0 && maxDepth > 0) {
    return 0.9 * getExtensionScore(candidate, ext, startPos, pos - 1, maxDepth - 1);
  }

  return match_len / len;
}

function getCommonSubsequenceLength(a: string, b: string, startIndex: number, length: number): number {
  let matched = 0;

  for (let i = 0; i < length; i++) {
    if (a[startIndex + i] === b[i]) {
      matched++;
    }
  }

  return matched;
}
