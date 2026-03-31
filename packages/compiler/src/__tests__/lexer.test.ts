/**
 * KerML Compiler Lexer Tests
 */

import { describe, it, expect } from 'vitest';
import { Lexer, LexerError, TokenType } from '../index';

describe('Lexer', () => {
  describe('Basic Tokenization', () => {
    it('should tokenize empty input', () => {
      const lexer = new Lexer('');
      const tokens = lexer.tokenize();
      expect(tokens).toHaveLength(1); // EOF only
      expect(tokens[0].type).toBe(TokenType.EOF);
    });

    it('should tokenize simple identifier', () => {
      const lexer = new Lexer('Package');
      const tokens = lexer.tokenize();
      expect(tokens).toHaveLength(2); // Identifier + EOF
      expect(tokens[0].type).toBe(TokenType.Identifier);
      expect(tokens[0].value).toBe('Package');
    });

    it('should tokenize multiple identifiers', () => {
      const lexer = new Lexer('package name space');
      const tokens = lexer.tokenize();
      expect(tokens.filter(t => t.type === TokenType.Identifier)).toHaveLength(2);
      expect(tokens.filter(t => t.type === TokenType.KW_package)).toHaveLength(1);
    });

    it('should tokenize keywords', () => {
      const keywords = [
        'package', 'class', 'feature', 'attribute', 'part', 'port',
        'behavior', 'function', 'predicate', 'interaction', 'connector',
        'binding', 'succession', 'specialization', 'conjugation', 'disjoining',
        'import', 'alias', 'dependency', 'type', 'classifier', 'struct',
        'assoc', 'datatype', 'enum', 'multiplicity', 'comment', 'doc',
        'metadata', 'metaclass'
      ];

      for (const keyword of keywords) {
        const lexer = new Lexer(keyword);
        const tokens = lexer.tokenize();
        expect(tokens[0].type).not.toBe(TokenType.Identifier);
        expect(tokens[0].value).toBe(keyword);
      }
    });
  });

  describe('Comments', () => {
    it('should tokenize line comments', () => {
      const lexer = new Lexer('// This is a comment\nfeature');
      const tokens = lexer.tokenize();
      const comments = lexer.getComments();
      expect(comments).toHaveLength(1);
      expect(comments[0].type).toBe(TokenType.LineComment);
      expect(comments[0].value).toContain('This is a comment');
    });

    it('should tokenize block comments', () => {
      const lexer = new Lexer('/* Block comment */ feature');
      const tokens = lexer.tokenize();
      const comments = lexer.getComments();
      expect(comments).toHaveLength(1);
      expect(comments[0].type).toBe(TokenType.BlockComment);
      expect(comments[0].value).toContain('Block comment');
    });

    it('should tokenize documentation comments', () => {
      const lexer = new Lexer('/** Documentation */ feature');
      const tokens = lexer.tokenize();
      const comments = lexer.getComments();
      expect(comments).toHaveLength(1);
      expect(comments[0].type).toBe(TokenType.DocComment);
    });
  });

  describe('String Literals', () => {
    it('should tokenize simple string', () => {
      const lexer = new Lexer('"Hello World"');
      const tokens = lexer.tokenize();
      expect(tokens[0].type).toBe(TokenType.StringLiteral);
      expect(tokens[0].value).toBe('Hello World');
    });

    it('should tokenize string with escape sequences', () => {
      const lexer = new Lexer('"Hello\\nWorld\\t!"');
      const tokens = lexer.tokenize();
      expect(tokens[0].type).toBe(TokenType.StringLiteral);
      expect(tokens[0].value).toBe('Hello\nWorld\t!');
    });

    it('should handle unterminated string', () => {
      const lexer = new Lexer('"Unterminated');
      expect(() => lexer.tokenize()).toThrow(LexerError);
    });
  });

  describe('Unrestricted Names', () => {
    it('should tokenize unrestricted name', () => {
      const lexer = new Lexer("'My Name With Spaces'");
      const tokens = lexer.tokenize();
      expect(tokens[0].type).toBe(TokenType.UnrestrictedName);
      expect(tokens[0].value).toBe('My Name With Spaces');
    });

    it('should handle unterminated unrestricted name', () => {
      const lexer = new Lexer("'Unterminated");
      expect(() => lexer.tokenize()).toThrow(LexerError);
    });
  });

  describe('Number Literals', () => {
    it('should tokenize integer literals', () => {
      const lexer = new Lexer('42');
      const tokens = lexer.tokenize();
      expect(tokens[0].type).toBe(TokenType.IntegerLiteral);
      expect(tokens[0].value).toBe('42');
    });

    it('should tokenize real literals', () => {
      const lexer = new Lexer('3.14159');
      const tokens = lexer.tokenize();
      expect(tokens[0].type).toBe(TokenType.RealLiteral);
      expect(tokens[0].value).toBe('3.14159');
    });

    it('should tokenize scientific notation', () => {
      const lexer = new Lexer('1.5e10');
      const tokens = lexer.tokenize();
      expect(tokens[0].type).toBe(TokenType.RealLiteral);
      expect(tokens[0].value).toBe('1.5e10');
    });

    it('should tokenize negative exponent', () => {
      const lexer = new Lexer('2.5e-3');
      const tokens = lexer.tokenize();
      expect(tokens[0].type).toBe(TokenType.RealLiteral);
      expect(tokens[0].value).toBe('2.5e-3');
    });
  });

  describe('Boolean and Null Literals', () => {
    it('should tokenize true', () => {
      const lexer = new Lexer('true');
      const tokens = lexer.tokenize();
      expect(tokens[0].type).toBe(TokenType.BooleanLiteral);
      expect(tokens[0].value).toBe('true');
    });

    it('should tokenize false', () => {
      const lexer = new Lexer('false');
      const tokens = lexer.tokenize();
      expect(tokens[0].type).toBe(TokenType.BooleanLiteral);
      expect(tokens[0].value).toBe('false');
    });

    it('should tokenize null', () => {
      const lexer = new Lexer('null');
      const tokens = lexer.tokenize();
      expect(tokens[0].type).toBe(TokenType.NullLiteral);
      expect(tokens[0].value).toBe('null');
    });
  });

  describe('Operators and Punctuation', () => {
    it('should tokenize basic punctuation', () => {
      const lexer = new Lexer('(){}[];,');
      const tokens = lexer.tokenize();
      expect(tokens.filter(t => !['EOF'].includes(t.type.toString()))).toHaveLength(6);
      expect(tokens.some(t => t.type === TokenType.LParen)).toBe(true);
      expect(tokens.some(t => t.type === TokenType.RParen)).toBe(true);
      expect(tokens.some(t => t.type === TokenType.LBrace)).toBe(true);
      expect(tokens.some(t => t.type === TokenType.RBrace)).toBe(true);
      expect(tokens.some(t => t.type === TokenType.LBracket)).toBe(true);
      expect(tokens.some(t => t.type === TokenType.RBracket)).toBe(true);
    });

    it('should tokenize comparison operators', () => {
      const lexer = new Lexer('< > <= >= == != === !==');
      const tokens = lexer.tokenize();
      expect(tokens.some(t => t.type === TokenType.Lt)).toBe(true);
      expect(tokens.some(t => t.type === TokenType.Gt)).toBe(true);
      expect(tokens.some(t => t.type === TokenType.LtEq)).toBe(true);
      expect(tokens.some(t => t.type === TokenType.GtEq)).toBe(true);
      expect(tokens.some(t => t.type === TokenType.EqEq)).toBe(true);
      expect(tokens.some(t => t.type === TokenType.BangEq)).toBe(true);
      expect(tokens.some(t => t.type === TokenType.EqEqEq)).toBe(true);
      expect(tokens.some(t => t.type === TokenType.BangEqEq)).toBe(true);
    });

    it('should tokenize arithmetic operators', () => {
      const lexer = new Lexer('+ - * / % **');
      const tokens = lexer.tokenize();
      expect(tokens.some(t => t.type === TokenType.Plus)).toBe(true);
      expect(tokens.some(t => t.type === TokenType.Minus)).toBe(true);
      expect(tokens.some(t => t.type === TokenType.Star)).toBe(true);
      expect(tokens.some(t => t.type === TokenType.Slash)).toBe(true);
      expect(tokens.some(t => t.type === TokenType.Percent)).toBe(true);
      expect(tokens.some(t => t.type === TokenType.StarStar)).toBe(true);
    });

    it('should tokenize special operators', () => {
      const lexer = new Lexer(': :: :> :>> . .. .> ~> ~>');
      const tokens = lexer.tokenize();
      expect(tokens.some(t => t.type === TokenType.Colon)).toBe(true);
      expect(tokens.some(t => t.type === TokenType.ColonColon)).toBe(true);
      expect(tokens.some(t => t.type === TokenType.ColonGt)).toBe(true);
      expect(tokens.some(t => t.type === TokenType.ColonGtGt)).toBe(true);
      expect(tokens.some(t => t.type === TokenType.Dot)).toBe(true);
      expect(tokens.some(t => t.type === TokenType.DotDot)).toBe(true);
      expect(tokens.some(t => t.type === TokenType.DotGt)).toBe(true);
      expect(tokens.some(t => t.type === TokenType.TildeGt)).toBe(true);
    });
  });

  describe('Source Location Tracking', () => {
    it('should track line numbers correctly', () => {
      const source = 'line1\nline2\nline3';
      const lexer = new Lexer(source);
      const tokens = lexer.tokenize();
      
      const line1Token = tokens.find(t => t.value === 'line1');
      const line2Token = tokens.find(t => t.value === 'line2');
      const line3Token = tokens.find(t => t.value === 'line3');
      
      expect(line1Token?.location.line).toBe(1);
      expect(line2Token?.location.line).toBe(2);
      expect(line3Token?.location.line).toBe(3);
    });

    it('should track column numbers correctly', () => {
      const source = 'a b c';
      const lexer = new Lexer(source);
      const tokens = lexer.tokenize();
      
      const aToken = tokens.find(t => t.value === 'a');
      const bToken = tokens.find(t => t.value === 'b');
      const cToken = tokens.find(t => t.value === 'c');
      
      expect(aToken?.location.column).toBe(1);
      expect(bToken?.location.column).toBe(3);
      expect(cToken?.location.column).toBe(5);
    });
  });

  describe('Complex Examples', () => {
    it('should tokenize a complete package declaration', () => {
      const source = `
        package MyPackage {
          import all Some::Type;
          
          class MyClass :> BaseType {
            feature myFeature: Integer;
          }
        }
      `;
      
      const lexer = new Lexer(source);
      const tokens = lexer.tokenize();
      
      expect(tokens.some(t => t.type === TokenType.KW_package)).toBe(true);
      expect(tokens.some(t => t.type === TokenType.Identifier && t.value === 'MyPackage')).toBe(true);
      expect(tokens.some(t => t.type === TokenType.KW_class)).toBe(true);
      expect(tokens.some(t => t.type === TokenType.Identifier && t.value === 'MyClass')).toBe(true);
      expect(tokens.some(t => t.type === TokenType.ColonGt)).toBe(true);
      expect(tokens.some(t => t.type === TokenType.KW_import)).toBe(true);
      expect(tokens.some(t => t.type === TokenType.KW_all)).toBe(true);
      expect(tokens.some(t => t.type === TokenType.KW_feature)).toBe(true);
    });
  });
});
