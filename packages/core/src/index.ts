// ============================================================
// KerML Compiler - Main Entry Point
// Complete compilation pipeline:
//   Source → Lexer → Parser → Model Builder → Name Resolution
//   → Type Checking → Code Generation
// ============================================================

import * as fs from 'fs';
import * as path from 'path';

import { Lexer, LexerError } from './lexer/lexer';
import { Token } from './lexer/token';
import { Parser, ParseError } from './parser/parser';
import * as AST from './parser/ast';
import { ModelBuilder, UnresolvedRef } from './model/model-builder';
import * as M from './model/elements';
import { NameResolver, ResolutionError } from './semantic/resolver';
import { ScopeBuilder } from './semantic/scope';
import { TypeChecker, TypeCheckError } from './semantic/type-checker';
import { JsonExporter } from './codegen/json-exporter';
import { PlantUMLExporter } from './codegen/plantuml-exporter';

// ---- Compiler Options ----

export interface CompilerOptions {
  inputFile?: string;
  inputSource?: string;
  outputFormat: 'json' | 'plantuml' | 'ast' | 'model' | 'scope' | 'all';
  outputDir?: string;
  prettyPrint: boolean;
  verbose: boolean;
  strictMode: boolean;
}

const DEFAULT_OPTIONS: CompilerOptions = {
  outputFormat: 'json',
  prettyPrint: true,
  verbose: false,
  strictMode: false,
};

// ---- Compilation Result ----

export interface CompilationResult {
  success: boolean;
  tokens?: Token[];
  ast?: AST.RootNamespace;
  model?: M.Package;
  scopeDump?: string;
  lexerErrors: LexerError[];
  parseErrors: ParseError[];
  resolutionErrors: ResolutionError[];
  typeCheckErrors: TypeCheckError[];
  outputs: Map<string, string>;
  statistics: CompilationStatistics;
}

export interface CompilationStatistics {
  tokenCount: number;
  astNodeCount: number;
  modelElementCount: number;
  unresolvedRefCount: number;
  errorCount: number;
  warningCount: number;
  compilationTimeMs: number;
}

// ---- KerML Compiler ----

export class KerMLCompiler {
  private options: CompilerOptions;

  constructor(options: Partial<CompilerOptions> = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  compile(source?: string): CompilationResult {
    const startTime = Date.now();

    const result: CompilationResult = {
      success: false,
      lexerErrors: [],
      parseErrors: [],
      resolutionErrors: [],
      typeCheckErrors: [],
      outputs: new Map(),
      statistics: {
        tokenCount: 0,
        astNodeCount: 0,
        modelElementCount: 0,
        unresolvedRefCount: 0,
        errorCount: 0,
        warningCount: 0,
        compilationTimeMs: 0,
      },
    };

    try {
      // ---- Step 0: Get source ----
      const sourceCode = source ?? this.options.inputSource ?? this.readInputFile();
      if (!sourceCode) {
        throw new Error('No input source provided');
      }

      this.log('=== KerML Compilation Started ===');
      this.log(`Input: ${this.options.inputFile ?? '<inline>'}`);
      this.log(`Source length: ${sourceCode.length} characters`);

      // ---- Step 1: Lexical Analysis ----
      this.log('\n--- Phase 1: Lexical Analysis ---');
      const lexer = new Lexer(sourceCode, this.options.inputFile);

      let tokens: Token[];
      try {
        tokens = lexer.tokenize();
      } catch (e) {
        if (e instanceof LexerError) {
          result.lexerErrors.push(e);
          this.logError(`Lexer error: ${e.message}`);
          result.statistics.compilationTimeMs = Date.now() - startTime;
          return result;
        }
        throw e;
      }

      result.tokens = tokens;
      result.statistics.tokenCount = tokens.length;
      this.log(`Tokens: ${tokens.length}`);
      this.log(`Comments: ${lexer.getComments().length}`);

      // ---- Step 2: Parsing ----
      this.log('\n--- Phase 2: Parsing ---');
      const parser = new Parser(tokens);
      const ast = parser.parse();
      result.ast = ast;
      result.parseErrors = parser.getErrors();

      const astNodeCount = this.countASTNodes(ast);
      result.statistics.astNodeCount = astNodeCount;
      this.log(`AST nodes: ${astNodeCount}`);

      if (result.parseErrors.length > 0) {
        this.log(`Parse errors: ${result.parseErrors.length}`);
        for (const err of result.parseErrors) {
          this.logError(`  ${err.message}`);
        }
        if (this.options.strictMode) {
          result.statistics.errorCount = result.parseErrors.length;
          result.statistics.compilationTimeMs = Date.now() - startTime;
          return result;
        }
      }

      // ---- Step 3: Model Building ----
      this.log('\n--- Phase 3: Model Building ---');
      const modelBuilder = new ModelBuilder();
      const model = modelBuilder.build(ast);
      result.model = model;

      const unresolvedRefs = modelBuilder.getUnresolvedRefs();
      result.statistics.unresolvedRefCount = unresolvedRefs.length;
      result.statistics.modelElementCount = this.countModelElements(model);
      this.log(`Model elements: ${result.statistics.modelElementCount}`);
      this.log(`Unresolved references: ${unresolvedRefs.length}`);

      // ---- Step 4: Name Resolution ----
      this.log('\n--- Phase 4: Name Resolution ---');
      const resolver = new NameResolver(model);
      const resolutionErrors = resolver.resolve(unresolvedRefs);
      result.resolutionErrors = resolutionErrors;

      this.log(`Resolution errors: ${resolutionErrors.length}`);
      for (const err of resolutionErrors) {
        this.logError(`  ${err.message}`);
      }

      // Get scope dump
      result.scopeDump = resolver.getRootScope().dump();

      // ---- Step 5: Type Checking ----
      this.log('\n--- Phase 5: Type Checking ---');
      const typeChecker = new TypeChecker(resolver.getScopeBuilder());
      const typeCheckErrors = typeChecker.check(model);
      result.typeCheckErrors = typeCheckErrors;

      const errors = typeCheckErrors.filter(e => e.severity === 'error');
      const warnings = typeCheckErrors.filter(e => e.severity === 'warning');
      result.statistics.errorCount = result.parseErrors.length + resolutionErrors.length + errors.length;
      result.statistics.warningCount = warnings.length;

      this.log(`Type errors: ${errors.length}`);
      this.log(`Type warnings: ${warnings.length}`);
      for (const err of typeCheckErrors) {
        if (err.severity === 'error') {
          this.logError(`  ERROR: ${err.message}`);
        } else {
          this.logWarning(`  WARNING: ${err.message}`);
        }
      }

      // ---- Step 6: Code Generation ----
      this.log('\n--- Phase 6: Code Generation ---');
      this.generateOutputs(result, model, ast);

      // ---- Final Statistics ----
      result.statistics.compilationTimeMs = Date.now() - startTime;
      result.success = result.statistics.errorCount === 0;

      this.log('\n=== Compilation Summary ===');
      this.log(`Success: ${result.success}`);
      this.log(`Errors: ${result.statistics.errorCount}`);
      this.log(`Warnings: ${result.statistics.warningCount}`);
      this.log(`Time: ${result.statistics.compilationTimeMs}ms`);
      this.log('===========================');

    } catch (e) {
      this.logError(`Fatal error: ${(e as Error).message}`);
      result.statistics.errorCount++;
      result.statistics.compilationTimeMs = Date.now() - startTime;
    }

    return result;
  }

  // ---- Output Generation ----

  private generateOutputs(
    result: CompilationResult,
    model: M.Package,
    ast: AST.RootNamespace
  ): void {
    const format = this.options.outputFormat;

    if (format === 'json' || format === 'all') {
      const jsonExporter = new JsonExporter({ prettyPrint: this.options.prettyPrint });
      const jsonOutput = jsonExporter.export(model);
      result.outputs.set('model.json', jsonOutput);
      this.log(`Generated: model.json (${jsonOutput.length} bytes)`);

      if (this.options.outputDir) {
        this.writeOutput('model.json', jsonOutput);
      }
    }

    if (format === 'plantuml' || format === 'all') {
      const pumlExporter = new PlantUMLExporter();
      const pumlOutput = pumlExporter.export(model);
      result.outputs.set('model.puml', pumlOutput);
      this.log(`Generated: model.puml (${pumlOutput.length} bytes)`);

      if (this.options.outputDir) {
        this.writeOutput('model.puml', pumlOutput);
      }
    }

    if (format === 'ast' || format === 'all') {
      const astJson = JSON.stringify(ast, null, this.options.prettyPrint ? 2 : undefined);
      result.outputs.set('ast.json', astJson);
      this.log(`Generated: ast.json (${astJson.length} bytes)`);

      if (this.options.outputDir) {
        this.writeOutput('ast.json', astJson);
      }
    }

    if (format === 'scope' || format === 'all') {
      if (result.scopeDump) {
        result.outputs.set('scopes.txt', result.scopeDump);
        this.log(`Generated: scopes.txt`);

        if (this.options.outputDir) {
          this.writeOutput('scopes.txt', result.scopeDump);
        }
      }
    }

    if (format === 'model' || format === 'all') {
      const jsonExporter = new JsonExporter({ prettyPrint: this.options.prettyPrint });
      const elements = jsonExporter.exportElements(model);
      const flatJson = JSON.stringify(elements, null, this.options.prettyPrint ? 2 : undefined);
      result.outputs.set('elements.json', flatJson);
      this.log(`Generated: elements.json (${elements.length} elements)`);

      if (this.options.outputDir) {
        this.writeOutput('elements.json', flatJson);
      }
    }
  }

  // ---- I/O ----

  private readInputFile(): string | null {
    if (!this.options.inputFile) return null;
    try {
      return fs.readFileSync(this.options.inputFile, 'utf-8');
    } catch (e) {
      throw new Error(`Cannot read input file: ${this.options.inputFile}`);
    }
  }

  private writeOutput(filename: string, content: string): void {
    if (!this.options.outputDir) return;
    const outputPath = path.join(this.options.outputDir, filename);
    fs.mkdirSync(this.options.outputDir, { recursive: true });
    fs.writeFileSync(outputPath, content, 'utf-8');
  }

  // ---- Counting ----

  private countASTNodes(node: any): number {
    if (!node || typeof node !== 'object') return 0;
    let count = 1;
    if (Array.isArray(node)) {
      for (const item of node) {
        count += this.countASTNodes(item);
      }
    } else {
      for (const key of Object.keys(node)) {
        if (key !== 'location') {
          count += this.countASTNodes(node[key]);
        }
      }
    }
    return count;
  }

  private countModelElements(element: M.Element): number {
    let count = 1;
    for (const owned of element.ownedElements) {
      count += this.countModelElements(owned);
    }
    return count;
  }

  // ---- Logging ----

  private log(message: string): void {
    if (this.options.verbose) {
      console.log(message);
    }
  }

  private logError(message: string): void {
    console.error(`\x1b[31m${message}\x1b[0m`);
  }

  private logWarning(message: string): void {
    if (this.options.verbose) {
      console.warn(`\x1b[33m${message}\x1b[0m`);
    }
  }
}

// ============================================================
// CLI Entry Point
// ============================================================

function main(): void {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    // Run demo
    runDemo();
    return;
  }

  // Parse CLI arguments
  const options: Partial<CompilerOptions> = { verbose: true };
  let inputFile: string | undefined;

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--format':
      case '-f':
        options.outputFormat = args[++i] as any;
        break;
      case '--output':
      case '-o':
        options.outputDir = args[++i];
        break;
      case '--verbose':
      case '-v':
        options.verbose = true;
        break;
      case '--strict':
        options.strictMode = true;
        break;
      case '--help':
      case '-h':
        printHelp();
        return;
      default:
        if (!args[i].startsWith('-')) {
          inputFile = args[i];
        }
        break;
    }
  }

  if (!inputFile) {
    console.error('Error: No input file specified');
    printHelp();
    process.exit(1);
  }

  options.inputFile = inputFile;
  const compiler = new KerMLCompiler(options);
  const result = compiler.compile();

  if (!result.success) {
    process.exit(1);
  }

  // If no output dir specified, print to stdout
  if (!options.outputDir) {
    for (const [name, content] of result.outputs) {
      console.log(`\n--- ${name} ---`);
      console.log(content);
    }
  }
}

function printHelp(): void {
  console.log(`
KerML Compiler v1.0.0

Usage: kerml-compiler [options] <input.kerml>

Options:
  -f, --format <format>  Output format: json, plantuml, ast, model, scope, all
                         (default: json)
  -o, --output <dir>     Output directory
  -v, --verbose          Verbose output
  --strict               Strict mode (stop on any error)
  -h, --help             Show this help
  `);
}

// ============================================================
// Demo with example KerML code
// ============================================================

function runDemo(): void {
  const demoSource = `
    // KerML Demo - Vehicle modeling
    package VehicleModel {

      // Base types
      abstract class Vehicle {
        feature mass : Real;
        feature maxSpeed : Real;
        feature numWheels : Integer [1];
      }

      class Engine {
        feature horsepower : Real;
        feature displacement : Real;
        feature fuelType : FuelType;
      }

      datatype Real;
      datatype Integer;
      datatype String;
      datatype Boolean;

      enum FuelType {
        gasoline;
        diesel;
        electric;
        hybrid;
      }

      // Specialized vehicle types
      class Car :> Vehicle {
        feature engine : Engine [1];
        feature doors : Integer [1] = 4;
        feature trunk : Compartment [0..1];
      }

      class Truck :> Vehicle {
        feature engine : Engine [1..2];
        feature payloadCapacity : Real;
        feature trailerAttachment : Boolean;
      }

      class ElectricCar :> Car {
        feature batteryCapacity : Real;
        feature range : Real;
        feature engine : Engine [1] :>> Car::engine;
      }

      abstract class Compartment {
        feature volume : Real;
      }

      // Behavior
      behavior Driving {
        in feature vehicle : Vehicle;
        in feature destination : String;
        out feature arrived : Boolean;
      }

      // Function
      function calculateRange(in batteryCapacity : Real, in efficiency : Real) : Real;

      // Predicate
      predicate isElectric(in vehicle : Vehicle);

      // Connector
      connector powerTrain from Car::engine to Car;

      // Association
      assoc Ownership {
        end feature owner : Person;
        end feature ownedVehicle : Vehicle [*];
      }

      class Person {
        feature name : String;
        feature age : Integer;
      }

      // Comments
      comment about Vehicle
        "Base class for all vehicle types in the model";

      doc "Vehicle Model Package - demonstrates KerML features";
    }
  `;

  console.log('╔══════════════════════════════════════════╗');
  console.log('║     KerML Compiler v1.0.0 - Demo        ║');
  console.log('╚══════════════════════════════════════════╝');
  console.log();

  const compiler = new KerMLCompiler({
    outputFormat: 'all',
    verbose: true,
    prettyPrint: true,
  });

  const result = compiler.compile(demoSource);

  console.log('\n╔══════════════════════════════════════════╗');
  console.log('║            Output Results                ║');
  console.log('╚══════════════════════════════════════════╝');

  for (const [name, content] of result.outputs) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`  📄 ${name}`);
    console.log('='.repeat(60));
    // Print first 150 lines max
    const lines = content.split('\n');
    const maxLines = 150;
    for (let i = 0; i < Math.min(lines.length, maxLines); i++) {
      console.log(lines[i]);
    }
    if (lines.length > maxLines) {
      console.log(`... (${lines.length - maxLines} more lines)`);
    }
  }

  console.log('\n╔══════════════════════════════════════════╗');
  console.log('║          Compilation Statistics          ║');
  console.log('╚══════════════════════════════════════════╝');
  console.log(`  Tokens:            ${result.statistics.tokenCount}`);
  console.log(`  AST Nodes:         ${result.statistics.astNodeCount}`);
  console.log(`  Model Elements:    ${result.statistics.modelElementCount}`);
  console.log(`  Unresolved Refs:   ${result.statistics.unresolvedRefCount}`);
  console.log(`  Errors:            ${result.statistics.errorCount}`);
  console.log(`  Warnings:          ${result.statistics.warningCount}`);
  console.log(`  Compilation Time:  ${result.statistics.compilationTimeMs}ms`);
  console.log(`  Success:           ${result.success ? '✅' : '❌'}`);
}

// Run
main();

// Export for library usage
export { Lexer } from './lexer/lexer';
export { Token, TokenType } from './lexer/token';
export { Parser } from './parser/parser';
export * as AST from './parser/ast';
export { ModelBuilder } from './model/model-builder';
export * as Model from './model/elements';
export { NameResolver } from './semantic/resolver';
export { ScopeBuilder, Scope } from './semantic/scope';
export { TypeChecker } from './semantic/type-checker';
export { JsonExporter } from './codegen/json-exporter';
export { PlantUMLExporter } from './codegen/plantuml-exporter';