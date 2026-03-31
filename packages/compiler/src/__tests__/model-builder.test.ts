/**
 * KerML Compiler Model Builder Tests
 */

import { describe, it, expect } from 'vitest';
import { Lexer } from '../lexer/lexer';
import { Parser } from '../parser/parser';
import { ModelBuilder } from '../model/model-builder';
import * as M from '../model/elements';

describe('ModelBuilder', () => {
  const buildModel = (source: string): M.Package => {
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens);
    const ast = parser.parse();
    const builder = new ModelBuilder();
    return builder.build(ast);
  };

  describe('Package Building', () => {
    it('should build package from AST', () => {
      const source = 'package TestPackage;';
      const model = buildModel(source);
      
      expect(model).toBeInstanceOf(M.Package);
      expect(model.name).toBe('<root>');
      expect(model.members).toHaveLength(1);
      
      const pkg = model.members[0] as M.Package;
      expect(pkg.name).toBe('TestPackage');
    });

    it('should build nested packages', () => {
      const source = `
        package Outer {
          package Inner {
            class MyClass {}
          }
        }
      `;
      const model = buildModel(source);
      const outerPkg = model.members[0] as M.Package;
      expect(outerPkg.members).toHaveLength(1);
      
      const innerPkg = outerPkg.members[0] as M.Namespace;
      expect(innerPkg.members).toHaveLength(1);
    });
  });

  describe('Import Building', () => {
    it('should build import with unresolved reference', () => {
      const source = 'import all Some::Package;';
      const model = buildModel(source);
      const builder = new ModelBuilder();
      // Rebuild to get unresolved refs
      const lexer = new Lexer(source);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);
      const ast = parser.parse();
      builder.build(ast);
      
      const refs = builder.getUnresolvedRefs();
      expect(refs.length).toBeGreaterThan(0);
      expect(refs[0].kind).toBe('import');
    });
  });

  describe('Type Building', () => {
    it('should build type declaration', () => {
      const source = 'type MyType;';
      const model = buildModel(source);
      const type = model.members[0] as M.Type;
      
      expect(type).toBeInstanceOf(M.Type);
      expect(type.name).toBe('MyType');
      expect(type.isAbstract).toBe(false);
    });

    it('should build abstract type', () => {
      const source = 'abstract type BaseType;';
      const model = buildModel(source);
      const type = model.members[0] as M.Type;
      expect(type.isAbstract).toBe(true);
    });

    it('should build type with specialization', () => {
      const source = 'type Derived :> Base;';
      const model = buildModel(source);
      const type = model.members[0] as M.Type;
      
      expect(type.ownedSpecializations).toHaveLength(1);
      const spec = type.ownedSpecializations[0];
      expect(spec.specific).toBe(type);
    });

    it('should build type with multiplicity', () => {
      const source = 'type MyType [1..5];';
      const model = buildModel(source);
      const type = model.members[0] as M.Type;
      
      expect(type.multiplicity).toBeDefined();
      expect(type.multiplicity?.lowerBound).toBe(1);
      expect(type.multiplicity?.upperBound).toBe(5);
    });
  });

  describe('Classifier Building', () => {
    it('should build classifier', () => {
      const source = 'classifier MyClass;';
      const model = buildModel(source);
      const cls = model.members[0] as M.Classifier;
      
      expect(cls).toBeInstanceOf(M.Classifier);
      expect(cls.name).toBe('MyClass');
    });

    it('should build class', () => {
      const source = 'class MyClass;';
      const model = buildModel(source);
      const cls = model.members[0] as M.Class;
      
      expect(cls).toBeInstanceOf(M.Class);
      expect(cls.name).toBe('MyClass');
    });

    it('should build struct', () => {
      const source = 'struct MyStruct;';
      const model = buildModel(source);
      const struct = model.members[0] as M.Structure;
      
      expect(struct).toBeInstanceOf(M.Structure);
      expect(struct.name).toBe('MyStruct');
    });
  });

  describe('Feature Building', () => {
    it('should build feature', () => {
      const source = 'feature myFeature;';
      const model = buildModel(source);
      const feat = model.members[0] as M.Feature;
      
      expect(feat).toBeInstanceOf(M.Feature);
      expect(feat.name).toBe('myFeature');
    });

    it('should build typed feature', () => {
      const source = 'feature myFeature: Integer;';
      const model = buildModel(source);
      const feat = model.members[0] as M.Feature;
      
      expect(feat.ownedTypings).toHaveLength(1);
    });

    it('should build attribute', () => {
      const source = 'attribute myAttr: String;';
      const model = buildModel(source);
      const attr = model.members[0] as M.Feature;
      
      expect(attr).toBe('attribute');
    });

    // it('should build part', () => {
    //   const source = 'part myPart: Component;';
    //   const model = buildModel(source);
    //   const part = model.members[0] as M.Feature;
      
    //   expect(part.featureKind).toBe('part');
    // });

    it('should build feature with default value', () => {
      const source = 'feature count: Integer = 42;';
      const model = buildModel(source);
      const feat = model.members[0] as M.Feature;
      
      expect(feat.defaultValue).toBeDefined();
    });

    it('should build composite feature', () => {
      const source = 'composite feature myPart: Component;';
      const model = buildModel(source);
      const feat = model.members[0] as M.Feature;
      
      expect(feat.isComposite).toBe(true);
    });
  });

  describe('Behavior Building', () => {
    it('should build behavior', () => {
      const source = 'behavior MyBehavior;';
      const model = buildModel(source);
      const beh = model.members[0] as M.Behavior;
      
      expect(beh).toBeInstanceOf(M.Behavior);
      expect(beh.name).toBe('MyBehavior');
    });

    it('should build function', () => {
      const source = 'function add(x: Integer, y: Integer) return Integer;';
      const model = buildModel(source);
      const func = model.members[0] as M.Function;
      
      expect(func).toBeInstanceOf(M.Function);
      expect(func.name).toBe('add');
      expect(func.parameters).toHaveLength(2);
      expect(func.result).toBeDefined();
    });
  });

  describe('Connector Building', () => {
    it('should build connector', () => {
      const source = 'connector myConn: ConnectionType;';
      const model = buildModel(source);
      const conn = model.members[0] as M.Connector;
      
      expect(conn).toBeInstanceOf(M.Connector);
      expect(conn.name).toBe('myConn');
    });

    it('should build binding connector', () => {
      const source = 'binding of A::x = B::y;';
      const model = buildModel(source);
      const binding = model.members[0] as M.BindingConnector;
      
      expect(binding).toBeInstanceOf(M.BindingConnector);
    });
  });

  describe('Enumeration Building', () => {
    it('should build enumeration', () => {
      const source = `
        enum Color {
          red;
          green;
          blue;
        }
      `;
      const model = buildModel(source);
      const enm = model.members[0] as M.Enumeration;
      
      expect(enm).toBeInstanceOf(M.Enumeration);
      expect(enm.name).toBe('Color');
      expect(enm.variants).toHaveLength(3);
    });
  });

  describe('Comment Building', () => {
    it('should build comment', () => {
      const source = 'comment "This is a comment";';
      const model = buildModel(source);
      const comment = model.members[0] as M.Comment;
      
      expect(comment).toBeInstanceOf(M.Comment);
      expect(comment.body).toBe('This is a comment');
    });

    it('should build documentation', () => {
      const source = 'doc "Documentation text";';
      const model = buildModel(source);
      const doc = model.members[0] as M.Documentation;
      
      expect(doc).toBeInstanceOf(M.Documentation);
      expect(doc.body).toBe('Documentation text');
    });
  });

  describe('Complex Model Building', () => {
    it('should build complete model', () => {
      const source = `
        package MySystem {
          type EntityType {
            attribute id: String;
            attribute name: String;
          }
          
          class Component :> EntityType {
            part subComponents [*]: Component;
            operation start(): Boolean;
          }
          
          function compute(x: Integer) return Integer {
            return x * 2;
          }
        }
      `;
      
      const model = buildModel(source);
      expect(model.members).toHaveLength(1);
      
      const pkg = model.members[0] as M.Package;
      expect(pkg.name).toBe('MySystem');
      expect(pkg.members.length).toBeGreaterThan(0);
      
      // Find and verify the Component class
      const component = pkg.members.find(m => m.name === 'Component') as M.Class;
      expect(component).toBeDefined();
      expect(component.ownedFeatures.length).toBeGreaterThan(0);
    });
  });

  describe('Element IDs', () => {
    it('should generate unique element IDs', () => {
      const source = `
        package P1 {
          class C1 {}
          class C2 {}
        }
      `;
      const model = buildModel(source);
      
      const ids = new Set<string>();
      const collectIds = (element: M.Element) => {
        expect(ids.has(element.elementId)).toBe(false);
        ids.add(element.elementId);
        
        for (const owned of element.ownedElements) {
          collectIds(owned);
        }
      };
      
      collectIds(model);
      expect(ids.size).toBeGreaterThan(2);
    });
  });
});
