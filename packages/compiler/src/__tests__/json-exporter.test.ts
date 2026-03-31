/**
 * KerML Compiler JSON Exporter Tests
 */

import { describe, it, expect } from 'vitest';
import { Lexer } from '../lexer/lexer';
import { Parser } from '../parser/parser';
import { ModelBuilder } from '../model/model-builder';
import { NameResolver } from '../semantic/resolver';
import { JsonExporter } from '../codegen/json-exporter';
import * as M from '../model/elements';

describe('JsonExporter', () => {
  const buildModel = (source: string): M.Package => {
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens);
    const ast = parser.parse();
    const modelBuilder = new ModelBuilder();
    const model = modelBuilder.build(ast);
    
    // Resolve references
    const resolver = new NameResolver(model);
    resolver.resolve(modelBuilder.getUnresolvedRefs());
    
    return model;
  };

  describe('Basic Export', () => {
    it('should export empty package', () => {
      const source = 'package EmptyPackage;';
      const model = buildModel(source);
      const exporter = new JsonExporter();
      
      const json = exporter.export(model);
      const parsed = JSON.parse(json);
      
      expect(parsed).toBeDefined();
      expect(parsed['@type']).toBe('Package');
      expect(parsed.name).toBe('EmptyPackage');
    });

    it('should export package with members', () => {
      const source = `
        package TestPackage {
          class MyClass {}
          feature myFeature: Integer;
        }
      `;
      const model = buildModel(source);
      const exporter = new JsonExporter();
      
      const json = exporter.export(model);
      const parsed = JSON.parse(json);
      
      expect(parsed.ownedMember).toBeDefined();
      expect(Array.isArray(parsed.ownedMember)).toBe(true);
      expect(parsed.ownedMember.length).toBeGreaterThan(0);
    });
  });

  describe('Export Options', () => {
    it('should respect prettyPrint option', () => {
      const source = 'package P;';
      const model = buildModel(source);
      
      const exporterPretty = new JsonExporter({ prettyPrint: true });
      const jsonPretty = exporterPretty.export(model);
      
      const exporterCompact = new JsonExporter({ prettyPrint: false });
      const jsonCompact = exporterCompact.export(model);
      
      expect(jsonPretty.includes('\n')).toBe(true);
      expect(jsonCompact.includes('\n')).toBe(false);
    });

    it('should respect includeIds option', () => {
      const source = 'package P;';
      const model = buildModel(source);
      
      const exporterWithIds = new JsonExporter({ includeIds: true });
      const jsonWithIds = exporterWithIds.export(model);
      const parsedWithIds = JSON.parse(jsonWithIds);
      
      const exporterWithoutIds = new JsonExporter({ includeIds: false });
      const jsonWithoutIds = exporterWithoutIds.export(model);
      const parsedWithoutIds = JSON.parse(jsonWithoutIds);
      
      expect(parsedWithIds['@id']).toBeDefined();
      expect(parsedWithoutIds['@id']).toBeUndefined();
    });

    it('should respect includeMetaclass option', () => {
      const source = 'package P;';
      const model = buildModel(source);
      
      const exporterWithMeta = new JsonExporter({ includeMetaclass: true });
      const jsonWithMeta = exporterWithMeta.export(model);
      const parsedWithMeta = JSON.parse(jsonWithMeta);
      
      const exporterWithoutMeta = new JsonExporter({ includeMetaclass: false });
      const jsonWithoutMeta = exporterWithoutMeta.export(model);
      const parsedWithoutMeta = JSON.parse(jsonWithoutMeta);
      
      expect(parsedWithMeta['@type']).toBeDefined();
      expect(parsedWithoutMeta['@type']).toBeUndefined();
    });

    it('should respect includeQualifiedNames option', () => {
      const source = `
        package P {
          class C {}
        }
      `;
      const model = buildModel(source);
      
      const exporterWithQN = new JsonExporter({ includeQualifiedNames: true });
      const jsonWithQN = exporterWithQN.export(model);
      const parsedWithQN = JSON.parse(jsonWithQN);
      
      const exporterWithoutQN = new JsonExporter({ includeQualifiedNames: false });
      const jsonWithoutQN = exporterWithoutQN.export(model);
      const parsedWithoutQN = JSON.parse(jsonWithoutQN);
      
      expect(parsedWithQN.qualifiedName).toBeDefined();
      expect(parsedWithoutQN.qualifiedName).toBeUndefined();
    });
  });

  describe('Type Export', () => {
    it('should export type with properties', () => {
      const source = `
        abstract type MyType [1..5] {
          attribute x: Integer;
        }
      `;
      const model = buildModel(source);
      const exporter = new JsonExporter();
      
      const json = exporter.export(model);
      const parsed = JSON.parse(json);
      
      const typeDef = parsed.ownedMember[0];
      expect(typeDef.isAbstract).toBe(true);
      expect(typeDef.multiplicity).toBeDefined();
    });

    it('should export specialization relationships', () => {
      const source = `
        type Base {}
        type Derived :> Base {}
      `;
      const model = buildModel(source);
      const exporter = new JsonExporter({ includeRelationships: true });
      
      const json = exporter.export(model);
      const parsed = JSON.parse(json);
      
      const derivedType = parsed.ownedMember.find((m: any) => m.name === 'Derived');
      expect(derivedType.ownedSpecialization).toBeDefined();
    });
  });

  describe('Feature Export', () => {
    it('should export feature with typing', () => {
      const source = `
        feature myFeature: Integer;
      `;
      const model = buildModel(source);
      const exporter = new JsonExporter({ includeRelationships: true });
      
      const json = exporter.export(model);
      const parsed = JSON.parse(json);
      
      const feature = parsed.ownedMember[0];
      expect(feature.ownedTyping).toBeDefined();
    });

    it('should export feature with multiplicity', () => {
      const source = `
        feature items [*]: String;
      `;
      const model = buildModel(source);
      const exporter = new JsonExporter();
      
      const json = exporter.export(model);
      const parsed = JSON.parse(json);
      
      const feature = parsed.ownedMember[0];
      expect(feature.multiplicity).toBeDefined();
      expect(feature.multiplicity.upperUnbounded).toBe(true);
    });

    it('should export composite feature', () => {
      const source = `
        composite feature myPart: Component;
      `;
      const model = buildModel(source);
      const exporter = new JsonExporter();
      
      const json = exporter.export(model);
      const parsed = JSON.parse(json);
      
      const feature = parsed.ownedMember[0];
      expect(feature.isComposite).toBe(true);
    });

    it('should export feature direction', () => {
      const source = `
        behavior B {
          in parameter p: Integer;
        }
      `;
      const model = buildModel(source);
      const exporter = new JsonExporter();
      
      const json = exporter.export(model);
      const parsed = JSON.parse(json);
      
      const behavior = parsed.ownedMember[0];
      const param = behavior.parameter[0];
      expect(param.direction).toBe('in');
    });
  });

  describe('Enumeration Export', () => {
    it('should export enumeration with values', () => {
      const source = `
        enum Color {
          red;
          green;
          blue;
        }
      `;
      const model = buildModel(source);
      const exporter = new JsonExporter();
      
      const json = exporter.export(model);
      const parsed = JSON.parse(json);
      
      const enumDef = parsed.ownedMember[0];
      expect(enumDef.enumeratedValue).toBeDefined();
      expect(enumDef.enumeratedValue.length).toBe(3);
    });
  });

  describe('Function Export', () => {
    it('should export function with parameters and return type', () => {
      const source = `
        function add(x: Integer, y: Integer) return Integer;
      `;
      const model = buildModel(source);
      const exporter = new JsonExporter();
      
      const json = exporter.export(model);
      const parsed = JSON.parse(json);
      
      const func = parsed.ownedMember[0];
      expect(func.parameter).toBeDefined();
      expect(func.parameter.length).toBe(2);
      expect(func.result).toBeDefined();
    });
  });

  describe('Comment and Documentation Export', () => {
    it('should export comment with body', () => {
      const source = 'comment "This is a comment";';
      const model = buildModel(source);
      const exporter = new JsonExporter();
      
      const json = exporter.export(model);
      const parsed = JSON.parse(json);
      
      const comment = parsed.ownedMember[0];
      expect(comment.body).toBe('This is a comment');
    });

    it('should export documentation', () => {
      const source = 'doc "Documentation text";';
      const model = buildModel(source);
      const exporter = new JsonExporter();
      
      const json = exporter.export(model);
      const parsed = JSON.parse(json);
      
      const doc = parsed.ownedMember[0];
      expect(doc.body).toBe('Documentation text');
    });
  });

  describe('Flat Export Mode', () => {
    it('should export elements in flat format', () => {
      const source = `
        package P {
          class C1 {}
          class C2 {}
        }
      `;
      const model = buildModel(source);
      const exporter = new JsonExporter();
      
      const elements = exporter.exportElements(model);
      
      expect(Array.isArray(elements)).toBe(true);
      expect(elements.length).toBeGreaterThan(2); // Package + 2 classes
      
      // Each element should have owner reference
      const classes = elements.filter((e: any) => e['@type'] === 'Class');
      classes.forEach((cls: any) => {
        expect(cls.owner).toBeDefined();
      });
    });
  });

//   describe('Single Element Export', () => {
//     it('should export single element', () => {
//       const source = `
//         package P {
//           class MyClass {}
//         }
//       `;
//       const model = buildModel(source);
//       const exporter = new JsonExporter();
      
//       const pkg = model.members[0] as M.Package;
//       const cls = pkg.members[0] as M.Class;
      
//       const json = exporter.exportSingleElement(cls);
//       const parsed = JSON.parse(json);
      
//       expect(parsed['@type']).toBe('Class');
//       expect(parsed.name).toBe('MyClass');
//     });
//   });

  describe('Complex Model Export', () => {
    it('should export complex model correctly', () => {
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
          
          interface ServiceInterface {
            operation serve(): Boolean;
          }
          
          function createComponent(name: String) return Component;
        }
      `;
      const model = buildModel(source);
      const exporter = new JsonExporter({
        prettyPrint: true,
        includeIds: true,
        includeMetaclass: true,
        includeRelationships: true,
        includeQualifiedNames: true,
      });
      
      const json = exporter.export(model);
      const parsed = JSON.parse(json);
      
      expect(parsed.name).toBe('MySystem');
      expect(parsed.ownedMember.length).toBeGreaterThan(0);
      
      // Verify structure
      const component = parsed.ownedMember.find((m: any) => m.name === 'Component');
      expect(component).toBeDefined();
      expect(component.isAbstract).toBe(false);
      expect(component.ownedSpecialization).toBeDefined();
    });
  });

  describe('Circular Reference Handling', () => {
    it('should handle circular references gracefully', () => {
      const source = `
        package P {
          class A {
            part b: B;
          }
          class B {
            part a: A;
          }
        }
      `;
      const model = buildModel(source);
      const exporter = new JsonExporter();
      
      // Should not throw or cause infinite loop
      expect(() => {
        const json = exporter.export(model);
        JSON.parse(json);
      }).not.toThrow();
    });
  });
});
