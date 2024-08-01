import { IFilterOptions } from './index';
import { pathScorer } from './pathScorer';
import { scorer } from './scorer';

interface ScoredCandidate<T> {
  candidate: T;
  score: number;
}

export function filterInternal<T>(candidates: T[], query: string, options: IFilterOptions<T>): T[] {
  const scoredCandidates: ScoredCandidate<T>[] = [];
  const { key, maxResults, maxInners, usePathScoring } = options;
  let spotLeft = (maxInners != null && maxInners > 0) ? maxInners : candidates.length + 1;
  const bKey = key != null;
  const scoreProvider = usePathScoring ? pathScorer : scorer;

  for (let candidate of candidates) {
    const string = bKey ? (candidate as any)[key] : candidate;
    if (!string) {
      continue;
    }
    const score = scoreProvider.score(string, query, options);
    if (score > 0) {
      scoredCandidates.push({ candidate, score });
      if (!--spotLeft) {
        break;
      }
    }
  }

  scoredCandidates.sort((a, b) => b.score - a.score);
  let result = scoredCandidates.map(({ candidate }) => candidate);
  if (maxResults != null) {
    result = result.slice(0, maxResults);
  }
  return result;
}
