// ============================================================
// KerML Compiler — Main Exports
// ============================================================

// Lexer
export { Lexer, LexerError } from './lexer/lexer';
export { Token, TokenType } from './lexer/token';

// Parser
export { Parser, ParseError } from './parser/parser';
export * as AST from './parser/ast';

// Model
export { ModelBuilder } from './model/model-builder';
export * as Model from './model/elements';

// Semantic
export { NameResolver } from './semantic/resolver';
export { ScopeBuilder, Scope } from './semantic/scope';
export { TypeChecker } from './semantic/type-checker';

// Code Generation
export { JsonExporter } from './codegen/json-exporter';
export { PlantUMLExporter } from './codegen/plantuml-exporter';
export { ASTGenerator } from './codegen/ast-generator';
export { ASTBuilder } from './codegen/ast-builder';
export { Printer } from './codegen/printer';
