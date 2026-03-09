// ============================================================
// KerML Lexer - Full Tokenizer
// ============================================================

import { Token, TokenType, SourceLocation, KEYWORDS } from './token';

export class LexerError extends Error {
  constructor(
    message: string,
    public location: SourceLocation
  ) {
    super(`Lexer error at ${location.line}:${location.column}: ${message}`);
    this.name = 'LexerError';
  }
}

export class Lexer {
  private source: string;
  private pos: number = 0;
  private line: number = 1;
  private column: number = 1;
  private file: string;
  private tokens: Token[] = [];
  private comments: Token[] = [];

  constructor(source: string, file: string = '<stdin>') {
    this.source = source;
    this.file = file;
  }

  tokenize(): Token[] {
    this.tokens = [];
    this.comments = [];

    while (this.pos < this.source.length) {
      this.skipWhitespace();
      if (this.pos >= this.source.length) break;

      const token = this.readNextToken();
      if (token) {
        if (
          token.type === TokenType.LineComment ||
          token.type === TokenType.BlockComment ||
          token.type === TokenType.DocComment
        ) {
          this.comments.push(token);
        } else {
          this.tokens.push(token);
        }
      }
    }

    this.tokens.push(this.makeToken(TokenType.EOF, '', this.currentLocation()));
    return this.tokens;
  }

  getComments(): Token[] {
    return this.comments;
  }

  private currentLocation(): SourceLocation {
    return {
      line: this.line,
      column: this.column,
      offset: this.pos,
      file: this.file,
    };
  }

  private makeToken(type: TokenType, value: string, location: SourceLocation): Token {
    return { type, value, location };
  }

  private peek(offset: number = 0): string {
    return this.source[this.pos + offset] ?? '\0';
  }

  private advance(): string {
    const ch = this.source[this.pos];
    if (ch === '\n') {
      this.line++;
      this.column = 1;
    } else {
      this.column++;
    }
    this.pos++;
    return ch;
  }

  private match(expected: string): boolean {
    if (this.pos < this.source.length && this.source[this.pos] === expected) {
      this.advance();
      return true;
    }
    return false;
  }

  private skipWhitespace(): void {
    while (this.pos < this.source.length) {
      const ch = this.source[this.pos];
      if (ch === ' ' || ch === '\t' || ch === '\r' || ch === '\n') {
        this.advance();
      } else {
        break;
      }
    }
  }

  private readNextToken(): Token | null {
    const loc = this.currentLocation();
    const ch = this.peek();

    // Comments
    if (ch === '/' && this.peek(1) === '/') {
      return this.readLineComment(loc);
    }
    if (ch === '/' && this.peek(1) === '*') {
      return this.readBlockComment(loc);
    }

    // String literal
    if (ch === '"') {
      return this.readStringLiteral(loc);
    }

    // Unrestricted name (single-quoted identifier)
    if (ch === "'") {
      return this.readUnrestrictedName(loc);
    }

    // Number literal
    if (this.isDigit(ch) || (ch === '.' && this.isDigit(this.peek(1)))) {
      return this.readNumberLiteral(loc);
    }

    // Identifier or keyword
    if (this.isIdentStart(ch)) {
      return this.readIdentifierOrKeyword(loc);
    }

    // Operators and punctuation
    return this.readOperator(loc);
  }

  private readLineComment(loc: SourceLocation): Token {
    let value = '';
    this.advance(); // /
    this.advance(); // /
    while (this.pos < this.source.length && this.peek() !== '\n') {
      value += this.advance();
    }
    return this.makeToken(TokenType.LineComment, value.trim(), loc);
  }

  private readBlockComment(loc: SourceLocation): Token {
    let value = '';
    this.advance(); // /
    this.advance(); // *
    const isDoc = this.peek() === '*';

    while (this.pos < this.source.length) {
      if (this.peek() === '*' && this.peek(1) === '/') {
        this.advance(); // *
        this.advance(); // /
        break;
      }
      value += this.advance();
    }

    return this.makeToken(
      isDoc ? TokenType.DocComment : TokenType.BlockComment,
      value.trim(),
      loc
    );
  }

  private readStringLiteral(loc: SourceLocation): Token {
    this.advance(); // opening "
    let value = '';
    while (this.pos < this.source.length && this.peek() !== '"') {
      if (this.peek() === '\\') {
        this.advance();
        const esc = this.advance();
        switch (esc) {
          case 'n': value += '\n'; break;
          case 't': value += '\t'; break;
          case 'r': value += '\r'; break;
          case '\\': value += '\\'; break;
          case '"': value += '"'; break;
          default: value += '\\' + esc;
        }
      } else {
        value += this.advance();
      }
    }
    if (this.pos < this.source.length) {
      this.advance(); // closing "
    } else {
      throw new LexerError('Unterminated string literal', loc);
    }
    return this.makeToken(TokenType.StringLiteral, value, loc);
  }

  private readUnrestrictedName(loc: SourceLocation): Token {
    this.advance(); // opening '
    let value = '';
    while (this.pos < this.source.length && this.peek() !== "'") {
      if (this.peek() === '\\') {
        this.advance();
        value += this.advance();
      } else {
        value += this.advance();
      }
    }
    if (this.pos < this.source.length) {
      this.advance(); // closing '
    } else {
      throw new LexerError('Unterminated unrestricted name', loc);
    }
    return this.makeToken(TokenType.UnrestrictedName, value, loc);
  }

  private readNumberLiteral(loc: SourceLocation): Token {
    let value = '';
    let isReal = false;

    // Integer part
    while (this.pos < this.source.length && this.isDigit(this.peek())) {
      value += this.advance();
    }

    // Decimal part
    if (this.peek() === '.' && this.isDigit(this.peek(1))) {
      isReal = true;
      value += this.advance(); // .
      while (this.pos < this.source.length && this.isDigit(this.peek())) {
        value += this.advance();
      }
    }

    // Exponent
    if (this.peek() === 'e' || this.peek() === 'E') {
      isReal = true;
      value += this.advance();
      if (this.peek() === '+' || this.peek() === '-') {
        value += this.advance();
      }
      while (this.pos < this.source.length && this.isDigit(this.peek())) {
        value += this.advance();
      }
    }

    return this.makeToken(
      isReal ? TokenType.RealLiteral : TokenType.IntegerLiteral,
      value,
      loc
    );
  }

  private readIdentifierOrKeyword(loc: SourceLocation): Token {
    let value = '';
    while (this.pos < this.source.length && this.isIdentPart(this.peek())) {
      value += this.advance();
    }

    // Check for keywords
    const kwType = KEYWORDS[value];
    if (kwType !== undefined) {
      // Boolean and null literals
      if (value === 'true' || value === 'false') {
        return this.makeToken(TokenType.BooleanLiteral, value, loc);
      }
      if (value === 'null') {
        return this.makeToken(TokenType.NullLiteral, value, loc);
      }
      return this.makeToken(kwType, value, loc);
    }

    return this.makeToken(TokenType.Identifier, value, loc);
  }

  private readOperator(loc: SourceLocation): Token {
    const ch = this.advance();

    switch (ch) {
      case ';': return this.makeToken(TokenType.Semicolon, ';', loc);
      case ',': return this.makeToken(TokenType.Comma, ',', loc);
      case '(': return this.makeToken(TokenType.LParen, '(', loc);
      case ')': return this.makeToken(TokenType.RParen, ')', loc);
      case '[': return this.makeToken(TokenType.LBracket, '[', loc);
      case ']': return this.makeToken(TokenType.RBracket, ']', loc);
      case '{': return this.makeToken(TokenType.LBrace, '{', loc);
      case '}': return this.makeToken(TokenType.RBrace, '}', loc);
      case '@': return this.makeToken(TokenType.At, '@', loc);
      case '#': return this.makeToken(TokenType.Hash, '#', loc);
      case '%': return this.makeToken(TokenType.Percent, '%', loc);
      case '&': return this.makeToken(TokenType.Amp, '&', loc);
      case '|': return this.makeToken(TokenType.Pipe, '|', loc);
      case '^': return this.makeToken(TokenType.Caret, '^', loc);
      case '?': return this.makeToken(TokenType.Question, '?', loc);

      case ':':
        if (this.match(':')) return this.makeToken(TokenType.ColonColon, '::', loc);
        if (this.match('>')) {
          if (this.match('>')) return this.makeToken(TokenType.ColonGtGt, ':>>', loc);
          return this.makeToken(TokenType.ColonGt, ':>', loc);
        }
        return this.makeToken(TokenType.Colon, ':', loc);

      case '.':
        if (this.match('.')) return this.makeToken(TokenType.DotDot, '..', loc);
        if (this.match('>')) return this.makeToken(TokenType.DotGt, '.>', loc);
        return this.makeToken(TokenType.Dot, '.', loc);

      case '=':
        if (this.match('=')) {
          if (this.match('=')) return this.makeToken(TokenType.EqEqEq, '===', loc);
          return this.makeToken(TokenType.EqEq, '==', loc);
        }
        if (this.match('>')) return this.makeToken(TokenType.FatArrow, '=>', loc);
        return this.makeToken(TokenType.Eq, '=', loc);

      case '!':
        if (this.match('=')) {
          if (this.match('=')) return this.makeToken(TokenType.BangEqEq, '!==', loc);
          return this.makeToken(TokenType.BangEq, '!=', loc);
        }
        return this.makeToken(TokenType.Bang, '!', loc);

      case '<':
        if (this.match('=')) return this.makeToken(TokenType.LtEq, '<=', loc);
        return this.makeToken(TokenType.Lt, '<', loc);

      case '>':
        if (this.match('=')) return this.makeToken(TokenType.GtEq, '>=', loc);
        return this.makeToken(TokenType.Gt, '>', loc);

      case '+': return this.makeToken(TokenType.Plus, '+', loc);
      case '-':
        if (this.match('>')) return this.makeToken(TokenType.Arrow, '->', loc);
        return this.makeToken(TokenType.Minus, '-', loc);

      case '*':
        if (this.match('*')) return this.makeToken(TokenType.StarStar, '**', loc);
        return this.makeToken(TokenType.Star, '*', loc);

      case '/': return this.makeToken(TokenType.Slash, '/', loc);

      case '~':
        if (this.match('>')) return this.makeToken(TokenType.TildeGt, '~>', loc);
        return this.makeToken(TokenType.Tilde, '~', loc);

      default:
        return this.makeToken(TokenType.Unknown, ch, loc);
    }
  }

  private isDigit(ch: string): boolean {
    return ch >= '0' && ch <= '9';
  }

  private isIdentStart(ch: string): boolean {
    return (ch >= 'a' && ch <= 'z') || (ch >= 'A' && ch <= 'Z') || ch === '_';
  }

  private isIdentPart(ch: string): boolean {
    return this.isIdentStart(ch) || this.isDigit(ch);
  }
}