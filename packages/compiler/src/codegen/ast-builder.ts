// ============================================================
// KerML AST Builder
// 提供 fluent API 以编程方式构建 AST 节点，
// 配合 ASTGenerator 实现代码生成。
//
// 用法示例：
//   const b = new ASTBuilder();
//   const ast = b.root(
//     b.package('VehicleModel',
//       b.abstractClass('Vehicle',
//         b.feature('mass', { typings: ['Real'] }),
//         b.feature('speed', { typings: ['Real'] }),
//       ),
//       b.class('Car', { specializations: ['Vehicle'] },
//         b.feature('doors', { typings: ['Integer'], defaultValue: '4' }),
//       ),
//       b.datatype('Real'),
//     ),
//   );
//   const code = new ASTGenerator().generate(ast);
// ============================================================

import * as AST from '../parser/ast';

type Members = AST.NamespaceMember[];

function qn(...segments: string[]): AST.QualifiedName {
  return { kind: 'QualifiedName', segments };
}

function qnFromStr(name: string): AST.QualifiedName {
  return { kind: 'QualifiedName', segments: name.split('::') };
}

function qnList(names: string[]): AST.QualifiedName[] {
  return names.map(n => qnFromStr(n));
}

function intLit(value: number | string): AST.LiteralExpression {
  return { kind: 'LiteralExpression', literalType: 'integer', value: String(value) };
}

function mult(lower: number | string, upper: number | string): AST.MultiplicityRange {
  return {
    kind: 'MultiplicityRange',
    lower: intLit(lower),
    upper: intLit(upper),
  };
}

// ---- Feature Options ----

interface FeatureOpts {
  visibility?: AST.Visibility;
  direction?: AST.FeatureDirection;
  featureKind?: AST.FeatureDeclaration['featureKind'];
  isAbstract?: boolean;
  isComposite?: boolean;
  isPortion?: boolean;
  isReadonly?: boolean;
  isDerived?: boolean;
  isOrdered?: boolean;
  isNonunique?: boolean;
  typings?: string[];
  subsets?: string[];
  redefines?: string[];
  references?: string[];
  multiplicity?: [number | string, number | string];
  defaultValue?: string;
}

// ---- Type Options ----

interface TypeOpts {
  visibility?: AST.Visibility;
  isAbstract?: boolean;
  specializations?: string[];
  multiplicity?: [number | string, number | string];
}

// ---- Builder ----

export class ASTBuilder {

  // ---- Root ----

  root(...members: AST.NamespaceMember[]): AST.RootNamespace {
    return { kind: 'RootNamespace', members };
  }

  // ---- Package ----

  package(name: string, ...members: AST.NamespaceMember[]): AST.PackageDeclaration {
    return { kind: 'PackageDeclaration', isLibrary: false, name, members };
  }

  libraryPackage(name: string, ...members: AST.NamespaceMember[]): AST.PackageDeclaration {
    return { kind: 'PackageDeclaration', isLibrary: true, name, members };
  }

  // ---- Import ----

  import(qualifiedName: string, opts?: { isAll?: boolean; isWildcard?: boolean; isRecursive?: boolean; visibility?: AST.Visibility }): AST.ImportDeclaration {
    return {
      kind: 'ImportDeclaration',
      visibility: opts?.visibility,
      isAll: opts?.isAll ?? false,
      isRecursive: opts?.isRecursive ?? false,
      qualifiedName: qnFromStr(qualifiedName),
      isWildcard: opts?.isWildcard ?? false,
    };
  }

  importAll(qualifiedName: string): AST.ImportDeclaration {
    return this.import(qualifiedName, { isAll: true, isWildcard: true });
  }

  // ---- Alias ----

  alias(name: string, target: string, visibility?: AST.Visibility): AST.AliasMember {
    return { kind: 'AliasMember', visibility, name, target: qnFromStr(target) };
  }

  // ---- Dependency ----

  dependency(clients: string[], suppliers: string[], name?: string): AST.DependencyDeclaration {
    return { kind: 'DependencyDeclaration', name, clients: qnList(clients), suppliers: qnList(suppliers) };
  }

  // ---- Type ----

  type(name: string, opts?: TypeOpts, ...members: AST.NamespaceMember[]): AST.TypeDeclaration {
    return {
      kind: 'TypeDeclaration',
      visibility: opts?.visibility,
      isAbstract: opts?.isAbstract ?? false,
      name,
      specializations: qnList(opts?.specializations ?? []),
      conjugates: [],
      disjointFrom: [],
      unions: [],
      intersects: [],
      differences: [],
      multiplicity: opts?.multiplicity ? mult(...opts.multiplicity) : undefined,
      members,
    };
  }

  // ---- Classifier ----

  classifier(name: string, opts?: TypeOpts, ...members: AST.NamespaceMember[]): AST.ClassifierDeclaration {
    return {
      kind: 'ClassifierDeclaration',
      visibility: opts?.visibility,
      isAbstract: opts?.isAbstract ?? false,
      name,
      specializations: qnList(opts?.specializations ?? []),
      multiplicity: opts?.multiplicity ? mult(...opts.multiplicity) : undefined,
      members,
    };
  }

  // ---- Class ----

  class(name: string, opts?: TypeOpts, ...members: AST.NamespaceMember[]): AST.ClassDeclaration {
    return {
      kind: 'ClassDeclaration',
      visibility: opts?.visibility,
      isAbstract: opts?.isAbstract ?? false,
      name,
      specializations: qnList(opts?.specializations ?? []),
      multiplicity: opts?.multiplicity ? mult(...opts.multiplicity) : undefined,
      members,
    };
  }

  abstractClass(name: string, ...members: AST.NamespaceMember[]): AST.ClassDeclaration {
    return this.class(name, { isAbstract: true }, ...members);
  }

  // ---- Struct ----

  struct(name: string, opts?: TypeOpts, ...members: AST.NamespaceMember[]): AST.StructDeclaration {
    return {
      kind: 'StructDeclaration',
      visibility: opts?.visibility,
      isAbstract: opts?.isAbstract ?? false,
      name,
      specializations: qnList(opts?.specializations ?? []),
      multiplicity: opts?.multiplicity ? mult(...opts.multiplicity) : undefined,
      members,
    };
  }

  // ---- DataType ----

  datatype(name: string, opts?: TypeOpts, ...members: AST.NamespaceMember[]): AST.DataTypeDeclaration {
    return {
      kind: 'DataTypeDeclaration',
      visibility: opts?.visibility,
      isAbstract: opts?.isAbstract ?? false,
      name,
      specializations: qnList(opts?.specializations ?? []),
      members,
    };
  }

  // ---- Enum ----

  enum(name: string, ...memberNames: string[]): AST.EnumDeclaration {
    return {
      kind: 'EnumDeclaration',
      name,
      specializations: [],
      members: memberNames.map(m => ({ kind: 'EnumMember' as const, name: m })),
    };
  }

  // ---- Association ----

  assoc(name: string, opts?: TypeOpts & { isStruct?: boolean }, ...members: AST.NamespaceMember[]): AST.AssociationDeclaration {
    return {
      kind: 'AssociationDeclaration',
      visibility: opts?.visibility,
      isAbstract: opts?.isAbstract ?? false,
      isStruct: opts?.isStruct ?? false,
      name,
      specializations: qnList(opts?.specializations ?? []),
      members,
    };
  }

  // ---- Feature ----

  feature(name: string, opts?: FeatureOpts): AST.FeatureDeclaration {
    return {
      kind: 'FeatureDeclaration',
      visibility: opts?.visibility,
      isAbstract: opts?.isAbstract ?? false,
      featureKind: opts?.featureKind ?? 'feature',
      direction: opts?.direction,
      isComposite: opts?.isComposite ?? false,
      isPortion: opts?.isPortion ?? false,
      isReadonly: opts?.isReadonly ?? false,
      isDerived: opts?.isDerived ?? false,
      isOrdered: opts?.isOrdered ?? false,
      isNonunique: opts?.isNonunique ?? false,
      name,
      typings: qnList(opts?.typings ?? []),
      subsets: qnList(opts?.subsets ?? []),
      redefines: qnList(opts?.redefines ?? []),
      references: qnList(opts?.references ?? []),
      multiplicity: opts?.multiplicity ? mult(...opts.multiplicity) : undefined,
      defaultValue: opts?.defaultValue
        ? { kind: 'LiteralExpression', literalType: 'integer', value: opts.defaultValue }
        : undefined,
      members: [],
    };
  }

  attribute(name: string, typeName: string, opts?: Partial<FeatureOpts>): AST.FeatureDeclaration {
    return this.feature(name, { featureKind: 'attribute', typings: [typeName], ...opts });
  }

  part(name: string, typeName: string, opts?: Partial<FeatureOpts>): AST.FeatureDeclaration {
    return this.feature(name, { featureKind: 'part', typings: [typeName], isComposite: true, ...opts });
  }

  port(name: string, typeName: string, opts?: Partial<FeatureOpts>): AST.FeatureDeclaration {
    return this.feature(name, { featureKind: 'port', typings: [typeName], ...opts });
  }

  endFeature(name: string, typeName: string, opts?: Partial<FeatureOpts>): AST.FeatureDeclaration {
    return this.feature(name, { featureKind: 'end', typings: [typeName], ...opts });
  }

  inFeature(name: string, typeName: string): AST.FeatureDeclaration {
    return this.feature(name, { direction: 'in', typings: [typeName] });
  }

  outFeature(name: string, typeName: string): AST.FeatureDeclaration {
    return this.feature(name, { direction: 'out', typings: [typeName] });
  }

  // ---- Behavior ----

  behavior(name: string, params: AST.FeatureDeclaration[], opts?: TypeOpts, ...members: AST.NamespaceMember[]): AST.BehaviorDeclaration {
    return {
      kind: 'BehaviorDeclaration',
      visibility: opts?.visibility,
      isAbstract: opts?.isAbstract ?? false,
      name,
      specializations: qnList(opts?.specializations ?? []),
      parameters: params,
      members,
    };
  }

  // ---- Function ----

  func(name: string, params: AST.FeatureDeclaration[], returnType?: string, opts?: TypeOpts, ...members: AST.NamespaceMember[]): AST.FunctionDeclaration {
    return {
      kind: 'FunctionDeclaration',
      visibility: opts?.visibility,
      isAbstract: opts?.isAbstract ?? false,
      name,
      specializations: qnList(opts?.specializations ?? []),
      parameters: params,
      returnType: returnType ? qnFromStr(returnType) : undefined,
      resultExpression: undefined,
      members,
    };
  }

  // ---- Predicate ----

  predicate(name: string, params: AST.FeatureDeclaration[], opts?: TypeOpts, ...members: AST.NamespaceMember[]): AST.PredicateDeclaration {
    return {
      kind: 'PredicateDeclaration',
      visibility: opts?.visibility,
      isAbstract: opts?.isAbstract ?? false,
      name,
      specializations: qnList(opts?.specializations ?? []),
      parameters: params,
      members,
    };
  }

  // ---- Connector ----

  connector(name: string | undefined, source: string, target: string): AST.ConnectorDeclaration {
    return {
      kind: 'ConnectorDeclaration',
      name,
      typings: [],
      ends: [
        { kind: 'ConnectorEnd', reference: qnFromStr(source) },
        { kind: 'ConnectorEnd', reference: qnFromStr(target) },
      ],
      members: [],
    };
  }

  binding(source: string, target: string, name?: string): AST.BindingConnectorDeclaration {
    return {
      kind: 'BindingConnectorDeclaration',
      name,
      source: qnFromStr(source),
      target: qnFromStr(target),
    };
  }

  succession(source: string, target: string, name?: string): AST.SuccessionDeclaration {
    return {
      kind: 'SuccessionDeclaration',
      name,
      source: qnFromStr(source),
      target: qnFromStr(target),
    };
  }

  // ---- Comment / Doc ----

  comment(body: string, about?: string[]): AST.CommentNode {
    return {
      kind: 'CommentNode',
      about: qnList(about ?? []),
      body,
    };
  }

  doc(body: string): AST.DocumentationNode {
    return { kind: 'DocumentationNode', body };
  }

  // ---- Metaclass / Metadata ----

  metaclass(name: string, opts?: TypeOpts, ...members: AST.NamespaceMember[]): AST.MetaclassDeclaration {
    return {
      kind: 'MetaclassDeclaration',
      visibility: opts?.visibility,
      isAbstract: opts?.isAbstract ?? false,
      name,
      specializations: qnList(opts?.specializations ?? []),
      members,
    };
  }

  metadata(metaclass: string, about?: string[]): AST.MetadataUsage {
    return {
      kind: 'MetadataUsage',
      metaclass: qnFromStr(metaclass),
      about: qnList(about ?? []),
      members: [],
    };
  }

  // ---- Explicit Relationships ----

  specialization(specific: string, general: string): AST.SpecializationDeclaration {
    return { kind: 'SpecializationDeclaration', specific: qnFromStr(specific), general: qnFromStr(general) };
  }

  conjugation(conjugated: string, original: string): AST.ConjugationDeclaration {
    return { kind: 'ConjugationDeclaration', conjugated: qnFromStr(conjugated), original: qnFromStr(original) };
  }

  disjoining(type1: string, type2: string): AST.DisjoiningDeclaration {
    return { kind: 'DisjoiningDeclaration', type1: qnFromStr(type1), type2: qnFromStr(type2) };
  }
}