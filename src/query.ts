import { IOptions } from "./index";
import { countDir, getExtension } from "./pathScorer";

export class Query {
  readonly $$__internal: Symbol = Symbol('Query');

  query: string;
  query_lw: string;
  core: string;
  core_lw: string;
  core_up: string;
  depth: number;
  ext: string;
  charCodes: boolean[];

  constructor(query: string, options: IOptions={}) {
    if (!query?.length)
      throw "query string can't be empty";
    this.query = query;
    this.query_lw = query.toLowerCase();
    this.core = coreChars(query, options.optCharRegEx);
    this.core_lw = this.core.toLowerCase();
    this.core_up = truncatedUpperCase(this.core);
    this.depth = countDir(query, query.length, options.pathSeparator);
    this.ext = getExtension(this.query_lw);
    this.charCodes = getCharCodes(this.query_lw);
  }
}

const opt_char_re = /[ _\-:\/\\]/g;

function coreChars(query: string, optCharRegEx: RegExp = opt_char_re): string {
  return query.replace(optCharRegEx, '');
}

function truncatedUpperCase(str: string): string {
  return str.split('').map(char => char.toUpperCase()[0]).join('');
}

function getCharCodes(str: string): boolean[] {
  const charCodes: boolean[] = [];
  for (let i = 0; i < str.length; i++) {
    charCodes[str.charCodeAt(i)] = true;
  }
  return charCodes;
}
