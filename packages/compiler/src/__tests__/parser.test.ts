/**
 * KerML Compiler Parser Tests
 */

import { describe, it, expect } from 'vitest';
import { Lexer } from '../lexer/lexer';
import { Parser, ParseError } from '../parser/parser';
import * as AST from '../parser/ast';

describe('Parser', () => {
  const parse = (source: string): AST.RootNamespace => {
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens);
    return parser.parse();
  };

  describe('Package Parsing', () => {
    it('should parse empty package', () => {
      const ast = parse('package MyPackage;');
      expect(ast.members).toHaveLength(1);
      const pkg = ast.members[0] as AST.PackageDeclaration;
      expect(pkg.kind).toBe('PackageDeclaration');
      expect(pkg.name).toBe('MyPackage');
      expect(pkg.isLibrary).toBe(false);
    });

    it('should parse package with members', () => {
      const source = `
        package TestPackage {
          class Class1 {}
          feature feature1: Integer;
        }
      `;
      const ast = parse(source);
      const pkg = ast.members[0] as AST.PackageDeclaration;
      expect(pkg.members.length).toBeGreaterThan(0);
    });

    it('should parse library package', () => {
      const source = 'library package MyLib;';
      const ast = parse(source);
      const pkg = ast.members[0] as AST.PackageDeclaration;
      expect(pkg.isLibrary).toBe(true);
      expect(pkg.name).toBe('MyLib');
    });
  });

  describe('Import Parsing', () => {
    it('should parse simple import', () => {
      const source = 'import Some::Package;';
      const ast = parse(source);
      const imp = ast.members[0] as AST.ImportDeclaration;
      expect(imp.kind).toBe('ImportDeclaration');
      expect(imp.qualifiedName.segments).toEqual(['Some', 'Package']);
      expect(imp.isAll).toBe(false);
      expect(imp.isRecursive).toBe(false);
    });

    it('should parse import all', () => {
      const source = 'import all Some::Package;';
      const ast = parse(source);
      const imp = ast.members[0] as AST.ImportDeclaration;
      expect(imp.isAll).toBe(true);
    });

    it('should parse recursive import', () => {
      const source = 'import Some::Package**;';
      const ast = parse(source);
      const imp = ast.members[0] as AST.ImportDeclaration;
      expect(imp.isRecursive).toBe(true);
    });

    it('should parse wildcard import', () => {
      const source = 'import Some::Package::*;';
      const ast = parse(source);
      const imp = ast.members[0] as AST.ImportDeclaration;
      expect(imp.isWildcard).toBe(true);
    });
  });

  describe('Alias Parsing', () => {
    it('should parse alias declaration', () => {
      const source = 'alias MyAlias for Original::Type;';
      const ast = parse(source);
      const alias = ast.members[0] as AST.AliasMember;
      expect(alias.kind).toBe('AliasMember');
      expect(alias.name).toBe('MyAlias');
      expect(alias.target.segments).toEqual(['Original', 'Type']);
    });
  });

  describe('Dependency Parsing', () => {
    it('should parse dependency declaration', () => {
      const source = 'dependency dep1 from Client to Supplier;';
      const ast = parse(source);
      const dep = ast.members[0] as AST.DependencyDeclaration;
      expect(dep.kind).toBe('DependencyDeclaration');
      expect(dep.name).toBe('dep1');
      expect(dep.clients).toHaveLength(1);
      expect(dep.suppliers).toHaveLength(1);
    });

    it('should parse dependency with multiple clients and suppliers', () => {
      const source = 'dependency from Client1, Client2 to Supplier1, Supplier2;';
      const ast = parse(source);
      const dep = ast.members[0] as AST.DependencyDeclaration;
      expect(dep.clients).toHaveLength(2);
      expect(dep.suppliers).toHaveLength(2);
    });
  });

  describe('Type Declaration Parsing', () => {
    it('should parse simple type declaration', () => {
      const source = 'type MyType;';
      const ast = parse(source);
      const type = ast.members[0] as AST.TypeDeclaration;
      expect(type.kind).toBe('TypeDeclaration');
      expect(type.name).toBe('MyType');
      expect(type.isAbstract).toBe(false);
    });

    it('should parse abstract type', () => {
      const source = 'abstract type BaseType;';
      const ast = parse(source);
      const type = ast.members[0] as AST.TypeDeclaration;
      expect(type.isAbstract).toBe(true);
    });

    it('should parse type with specialization', () => {
      const source = 'type DerivedType :> BaseType;';
      const ast = parse(source);
      const type = ast.members[0] as AST.TypeDeclaration;
      expect(type.specializations).toHaveLength(1);
      expect(type.specializations[0].segments).toEqual(['BaseType']);
    });

    it('should parse type with multiplicity', () => {
      const source = 'type MyType [1..5];';
      const ast = parse(source);
      const type = ast.members[0] as AST.TypeDeclaration;
      expect(type.multiplicity).toBeDefined();
    });
  });

  describe('Classifier Parsing', () => {
    it('should parse classifier', () => {
      const source = 'classifier MyClass;';
      const ast = parse(source);
      const cls = ast.members[0] as AST.ClassifierDeclaration;
      expect(cls.kind).toBe('ClassifierDeclaration');
      expect(cls.name).toBe('MyClass');
    });

    it('should parse class', () => {
      const source = 'class MyClass;';
      const ast = parse(source);
      const cls = ast.members[0] as AST.ClassDeclaration;
      expect(cls.kind).toBe('ClassDeclaration');
      expect(cls.name).toBe('MyClass');
    });

    it('should parse struct', () => {
      const source = 'struct MyStruct;';
      const ast = parse(source);
      const struct = ast.members[0] as AST.StructDeclaration;
      expect(struct.kind).toBe('StructDeclaration');
      expect(struct.name).toBe('MyStruct');
    });
  });

  describe('Feature Parsing', () => {
    it('should parse simple feature', () => {
      const source = 'feature myFeature;';
      const ast = parse(source);
      const feat = ast.members[0] as AST.FeatureDeclaration;
      expect(feat.kind).toBe('FeatureDeclaration');
      expect(feat.name).toBe('myFeature');
    });

    it('should parse typed feature', () => {
      const source = 'feature myFeature: Integer;';
      const ast = parse(source);
      const feat = ast.members[0] as AST.FeatureDeclaration;
      expect(feat.typings).toHaveLength(1);
      expect(feat.typings[0].segments).toEqual(['Integer']);
    });

    it('should parse attribute', () => {
      const source = 'attribute myAttr: String;';
      const ast = parse(source);
      const attr = ast.members[0] as AST.FeatureDeclaration;
      expect(attr.featureKind).toBe('attribute');
    });

    it('should parse part', () => {
      const source = 'part myPart: Component;';
      const ast = parse(source);
      const part = ast.members[0] as AST.FeatureDeclaration;
      expect(part.featureKind).toBe('part');
    });

    it('should parse feature with subsetting', () => {
      const source = 'feature myFeature :> BaseFeature;';
      const ast = parse(source);
      const feat = ast.members[0] as AST.FeatureDeclaration;
      expect(feat.subsets).toHaveLength(1);
    });

    it('should parse feature with default value', () => {
      const source = 'feature count: Integer = 42;';
      const ast = parse(source);
      const feat = ast.members[0] as AST.FeatureDeclaration;
      expect(feat.defaultValue).toBeDefined();
    });
  });

  describe('Behavior Parsing', () => {
    it('should parse behavior', () => {
      const source = 'behavior MyBehavior;';
      const ast = parse(source);
      const beh = ast.members[0] as AST.BehaviorDeclaration;
      expect(beh.kind).toBe('BehaviorDeclaration');
      expect(beh.name).toBe('MyBehavior');
    });

    it('should parse function', () => {
      const source = 'function myFunction(x: Integer) return Boolean;';
      const ast = parse(source);
      const func = ast.members[0] as AST.FunctionDeclaration;
      expect(func.kind).toBe('FunctionDeclaration');
      expect(func.name).toBe('myFunction');
      expect(func.parameters).toHaveLength(1);
      expect(func.returnType).toBeDefined();
    });

    it('should parse predicate', () => {
      const source = 'predicate isValid;';
      const ast = parse(source);
      const pred = ast.members[0] as AST.PredicateDeclaration;
      expect(pred.kind).toBe('PredicateDeclaration');
      expect(pred.name).toBe('isValid');
    });
  });

  describe('Connector Parsing', () => {
    it('should parse connector', () => {
      const source = 'connector myConnector: ConnectionType;';
      const ast = parse(source);
      const conn = ast.members[0] as AST.ConnectorDeclaration;
      expect(conn.kind).toBe('ConnectorDeclaration');
      expect(conn.name).toBe('myConnector');
    });

    it('should parse binding connector', () => {
      const source = 'binding of Source::feature = Target::feature;';
      const ast = parse(source);
      const binding = ast.members[0] as AST.BindingConnectorDeclaration;
      expect(binding.kind).toBe('BindingConnectorDeclaration');
    });

    it('should parse succession', () => {
      const source = 'succession first StateA then StateB;';
      const ast = parse(source);
      const succ = ast.members[0] as AST.SuccessionDeclaration;
      expect(succ.kind).toBe('SuccessionDeclaration');
    });
  });

  describe('Enum Parsing', () => {
    it('should parse enum with members', () => {
      const source = `
        enum Color {
          red;
          green;
          blue;
        }
      `;
      const ast = parse(source);
      const enm = ast.members[0] as AST.EnumDeclaration;
      expect(enm.kind).toBe('EnumDeclaration');
      expect(enm.name).toBe('Color');
      expect(enm.members).toHaveLength(3);
    });
  });

  describe('Comment Parsing', () => {
    it('should parse comment', () => {
      const source = 'comment "This is a comment";';
      const ast = parse(source);
      const comment = ast.members[0] as AST.CommentNode;
      expect(comment.kind).toBe('CommentNode');
      expect(comment.body).toBe('This is a comment');
    });

    it('should parse documentation', () => {
      const source = 'doc "Documentation text";';
      const ast = parse(source);
      const doc = ast.members[0] as AST.DocumentationNode;
      expect(doc.kind).toBe('DocumentationNode');
      expect(doc.body).toBe('Documentation text');
    });
  });

  describe('Expression Parsing', () => {
    it('should parse arithmetic expression', () => {
      const source = 'feature result = 2 + 3 * 4;';
      const ast = parse(source);
      const feat = ast.members[0] as AST.FeatureDeclaration;
      expect(feat.defaultValue).toBeDefined();
      expect(feat.defaultValue?.kind).toBe('OperatorExpression');
    });

    it('should parse comparison expression', () => {
      const source = 'feature check = x > 5;';
      const ast = parse(source);
      const feat = ast.members[0] as AST.FeatureDeclaration;
      expect(feat.defaultValue).toBeDefined();
    });

    it('should parse logical expression', () => {
      const source = 'feature result = a and b or c;';
      const ast = parse(source);
      const feat = ast.members[0] as AST.FeatureDeclaration;
      expect(feat.defaultValue).toBeDefined();
    });

    it('should parse if expression', () => {
      const source = 'feature result = if condition then 1 else 0;';
      const ast = parse(source);
      const feat = ast.members[0] as AST.FeatureDeclaration;
      expect(feat.defaultValue?.kind).toBe('IfExpression');
    });
  });

  describe('Multiplicity Parsing', () => {
    it('should parse single value multiplicity', () => {
      const source = 'feature item [1];';
      const ast = parse(source);
      const feat = ast.members[0] as AST.FeatureDeclaration;
      expect(feat.multiplicity).toBeDefined();
    });

    it('should parse range multiplicity', () => {
      const source = 'feature items [1..10];';
      const ast = parse(source);
      const feat = ast.members[0] as AST.FeatureDeclaration;
      expect(feat.multiplicity).toBeDefined();
    });

    it('should parse unbounded multiplicity', () => {
      const source = 'feature items [*];';
      const ast = parse(source);
      const feat = ast.members[0] as AST.FeatureDeclaration;
      expect(feat.multiplicity).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle syntax errors gracefully', () => {
      const source = 'package { invalid syntax';
      const lexer = new Lexer(source);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);
      
      const ast = parser.parse();
      const errors = parser.getErrors();
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should continue parsing after error', () => {
      const source = `
        package Pkg1 {
          class Invalid {
          class Valid {}
        }
      `;
      const lexer = new Lexer(source);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);
      
      const ast = parser.parse();
      // Should have detected errors but continued parsing
      expect(parser.getErrors().length).toBeGreaterThan(0);
    });
  });

  describe('Complex Examples', () => {
    it('should parse a complete model', () => {
      const source = `
        package MySystem {
          import all Base::Types;
          
          abstract type EntityType :> BaseType {
            attribute id: String;
            attribute name: String [1];
          }
          
          class Component :> EntityType {
            part subComponents [*]: Component;
            operation start(): Boolean;
          }
          
          behavior ComponentBehavior {
            attribute state: StateEnum;
            
            enum StateEnum {
              idle;
              running;
              stopped;
            }
          }
          
          function computeValue(x: Integer, y: Integer) return Integer {
            return x + y;
          }
        }
      `;
      
      const ast = parse(source);
      expect(ast.members.length).toBeGreaterThan(0);
      
      const pkg = ast.members[0] as AST.PackageDeclaration;
      expect(pkg.name).toBe('MySystem');
      expect(pkg.members.length).toBeGreaterThan(0);
    });
  });
});
