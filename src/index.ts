import { filterInternal } from './filter';
import { match as matcher, wrap } from './matcher';
import { Query } from './query';
import { scorer } from './scorer';

export { Query };

export interface IOptions {
  allowErrors?: boolean;
  usePathScoring?: boolean;
  useExtensionBonus?: boolean;
  pathSeparator?: "/" | "\\" | string;
  optCharRegEx?: RegExp;
  wrap?: {
    tagOpen?: string;
    tagClass?: string;
    tagClose?: string;
  };
  preparedQuery?: Query;
}

export interface IFilterOptions<T> extends IOptions {
  key?: T extends string ? never : keyof T;
  maxResults?: number;
  maxInners?: number;
}

export function filter<T>(
    candidates: T[],
    query: string,
    options?: IFilterOptions<T>,
): T[] {
  return filterInternal(candidates, query, options || {});
}

export function score(
    string: string,
    query: string,
    options?: IOptions,
): number {
  return scorer.score(string, query, options || {});
}

export function match(
    string: string,
    query: string,
    options?: IOptions,
): number[] {
  return matcher(string, query, {
    allowErrors: options?.allowErrors || false,
    preparedQuery: options?.preparedQuery || new Query(query, options),
    pathSeparator: options?.pathSeparator || '/',
  });
}

export { wrap };

export function prepareQuery(
    query: string,
    options?: IOptions,
): Query {
  return new Query(query, options);
}
