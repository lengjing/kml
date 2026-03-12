// ============================================================
// KerML AST Code Generator
//
// 将 AST 节点树完整地生成为合法的 KerML 文本语法。
// 支持所有 AST 节点类型：
//   - RootNamespace, Package, Namespace
//   - Type, Classifier, Class, Struct, Association, DataType, Enum
//   - Feature (所有 featureKind)
//   - Behavior, Function, Predicate, Interaction
//   - Connector, BindingConnector, Succession
//   - Specialization, Conjugation, Disjoining
//   - Multiplicity, Comment, Documentation
//   - Metaclass, Metadata
//   - Import, Alias, Dependency
//   - Expressions（完整运算符）
// ============================================================

import * as AST from '../parser/ast';
import { Printer } from './printer';

export interface GeneratorOptions {
  /** 缩进字符串 */
  indent: string;
  /** 空 body 时是否使用 {} 而非 ; */
  emptyBodyAsBraces: boolean;
  /** 每个 member 之间插入空行 */
  blankLineBetweenMembers: boolean;
  /** 顶部注释 */
  headerComment?: string;
}

const DEFAULT_OPTIONS: GeneratorOptions = {
  indent: '  ',
  emptyBodyAsBraces: false,
  blankLineBetweenMembers: true,
  headerComment: undefined,
};

export class ASTGenerator {
  private p: Printer;
  private opts: GeneratorOptions;

  constructor(opts?: Partial<GeneratorOptions>) {
    this.opts = { ...DEFAULT_OPTIONS, ...opts };
    this.p = new Printer({ indentStr: this.opts.indent });
  }

  /**
   * 从 RootNamespace AST 节点生成完整的 KerML 代码
   */
  generate(root: AST.RootNamespace): string {
    this.p.reset();

    if (this.opts.headerComment) {
      for (const line of this.opts.headerComment.split('\n')) {
        this.p.line(`// ${line}`);
      }
      this.p.blank();
    }

    this.emitMembers(root.members);

    return this.p.toString().trimEnd() + '\n';
  }

  /**
   * 从单个 AST 节点生成代码片段
   */
  generateNode(node: AST.NamespaceMember): string {
    this.p.reset();
    this.emitMember(node);
    return this.p.toString().trimEnd() + '\n';
  }

  // ================================================================
  // Member Dispatch
  // ================================================================

  private emitMembers(members: AST.NamespaceMember[]): void {
    for (let i = 0; i < members.length; i++) {
      this.emitMember(members[i]);
      if (this.opts.blankLineBetweenMembers && i < members.length - 1) {
        this.p.blank();
      }
    }
  }

  private emitMember(node: AST.NamespaceMember): void {
    switch (node.kind) {
      case 'PackageDeclaration':          return this.emitPackage(node);
      case 'NamespaceDeclaration':        return this.emitNamespace(node);
      case 'ImportDeclaration':           return this.emitImport(node);
      case 'AliasMember':                 return this.emitAlias(node);
      case 'DependencyDeclaration':       return this.emitDependency(node);
      case 'TypeDeclaration':             return this.emitTypeDecl(node);
      case 'ClassifierDeclaration':       return this.emitClassifier(node);
      case 'ClassDeclaration':            return this.emitClass(node);
      case 'StructDeclaration':           return this.emitStruct(node);
      case 'AssociationDeclaration':      return this.emitAssociation(node);
      case 'DataTypeDeclaration':         return this.emitDataType(node);
      case 'EnumDeclaration':             return this.emitEnum(node);
      case 'FeatureDeclaration':          return this.emitFeature(node);
      case 'BehaviorDeclaration':         return this.emitBehavior(node);
      case 'FunctionDeclaration':         return this.emitFunction(node);
      case 'PredicateDeclaration':        return this.emitPredicate(node);
      case 'InteractionDeclaration':      return this.emitInteraction(node);
      case 'ConnectorDeclaration':        return this.emitConnector(node);
      case 'BindingConnectorDeclaration': return this.emitBinding(node);
      case 'SuccessionDeclaration':       return this.emitSuccession(node);
      case 'SpecializationDeclaration':   return this.emitSpecialization(node);
      case 'ConjugationDeclaration':      return this.emitConjugation(node);
      case 'DisjoiningDeclaration':       return this.emitDisjoining(node);
      case 'MultiplicityDeclaration':     return this.emitMultiplicityDecl(node);
      case 'CommentNode':                 return this.emitComment(node);
      case 'DocumentationNode':           return this.emitDocumentation(node);
      case 'MetaclassDeclaration':        return this.emitMetaclass(node);
      case 'MetadataUsage':               return this.emitMetadata(node);
      default:
        this.p.line(`// [unknown node kind: ${(node as any).kind}]`);
    }
  }

  // ================================================================
  // Package / Namespace
  // ================================================================

  private emitPackage(node: AST.PackageDeclaration): void {
    const kw = node.isLibrary ? 'library package' : 'package';
    const header = `${kw} ${this.name(node.name)}`;
    this.emitBody(header, node.members);
  }

  private emitNamespace(node: AST.NamespaceDeclaration): void {
    this.emitBody(`namespace ${this.name(node.name)}`, node.members);
  }

  // ================================================================
  // Import / Alias / Dependency
  // ================================================================

  private emitImport(node: AST.ImportDeclaration): void {
    const parts: string[] = [];
    if (node.visibility) parts.push(node.visibility);
    parts.push('import');
    if (node.isAll) parts.push('all');
    parts.push(this.qualifiedName(node.qualifiedName));
    if (node.isWildcard) parts.push('::*');
    if (node.isRecursive) parts.push('**');
    if (node.filterCondition) {
      parts.push(`[${this.expr(node.filterCondition)}]`);
    }
    this.p.line(parts.join(' ') + ';');
  }

  private emitAlias(node: AST.AliasMember): void {
    const vis = node.visibility ? `${node.visibility} ` : '';
    this.p.line(`${vis}alias ${this.name(node.name)} for ${this.qualifiedName(node.target)};`);
  }

  private emitDependency(node: AST.DependencyDeclaration): void {
    const n = node.name ? `${this.name(node.name)} ` : '';
    const clients = node.clients.map(c => this.qualifiedName(c)).join(', ');
    const suppliers = node.suppliers.map(s => this.qualifiedName(s)).join(', ');
    this.p.line(`dependency ${n}from ${clients} to ${suppliers};`);
  }

  // ================================================================
  // Type
  // ================================================================

  private emitTypeDecl(node: AST.TypeDeclaration): void {
    const header = this.buildTypeHeader('type', node.name, {
      visibility: node.visibility,
      isAbstract: node.isAbstract,
      specializations: node.specializations,
      multiplicity: node.multiplicity,
    });

    const bodyParts: AST.NamespaceMember[] = [...node.members];
    const extraLines: string[] = [];

    // Type-specific relationships
    if (node.conjugates.length > 0) {
      extraLines.push(`conjugate ~> ${node.conjugates.map(c => this.qualifiedName(c)).join(', ')};`);
    }
    for (const d of node.disjointFrom) {
      extraLines.push(`disjoining ${this.qualifiedName(d)};`);
    }
    if (node.unions.length > 0) {
      extraLines.push(`unioning ${node.unions.map(u => this.qualifiedName(u)).join(', ')};`);
    }
    if (node.intersects.length > 0) {
      extraLines.push(`intersecting ${node.intersects.map(i => this.qualifiedName(i)).join(', ')};`);
    }
    if (node.differences.length > 0) {
      extraLines.push(`differencing ${node.differences.map(d => this.qualifiedName(d)).join(', ')};`);
    }

    this.emitBodyWithExtraLines(header, bodyParts, extraLines);
  }

  // ================================================================
  // Classifier / Class / Struct / DataType / Association
  // ================================================================

  private emitClassifier(node: AST.ClassifierDeclaration): void {
    const header = this.buildTypeHeader('classifier', node.name, {
      visibility: node.visibility,
      isAbstract: node.isAbstract,
      specializations: node.specializations,
      multiplicity: node.multiplicity,
    });
    this.emitBody(header, node.members);
  }

  private emitClass(node: AST.ClassDeclaration): void {
    const header = this.buildTypeHeader('class', node.name, {
      visibility: node.visibility,
      isAbstract: node.isAbstract,
      specializations: node.specializations,
      multiplicity: node.multiplicity,
    });
    this.emitBody(header, node.members);
  }

  private emitStruct(node: AST.StructDeclaration): void {
    const header = this.buildTypeHeader('struct', node.name, {
      visibility: node.visibility,
      isAbstract: node.isAbstract,
      specializations: node.specializations,
      multiplicity: node.multiplicity,
    });
    this.emitBody(header, node.members);
  }

  private emitDataType(node: AST.DataTypeDeclaration): void {
    const header = this.buildTypeHeader('datatype', node.name, {
      visibility: node.visibility,
      isAbstract: node.isAbstract,
      specializations: node.specializations,
    });
    this.emitBody(header, node.members);
  }

  private emitAssociation(node: AST.AssociationDeclaration): void {
    const kw = node.isStruct ? 'assoc struct' : 'assoc';
    const header = this.buildTypeHeader(kw, node.name, {
      visibility: node.visibility,
      isAbstract: node.isAbstract,
      specializations: node.specializations,
    });
    this.emitBody(header, node.members);
  }

  // ================================================================
  // Enum
  // ================================================================

  private emitEnum(node: AST.EnumDeclaration): void {
    const vis = this.vis(node.visibility);
    const specs = this.specList(node.specializations);
    const header = `${vis}enum ${this.name(node.name)}${specs}`;

    if (node.members.length === 0) {
      this.p.line(header + ';');
    } else {
      this.p.line(header + ' {');
      this.p.indent();
      for (const member of node.members) {
        this.p.line(`${this.name(member.name)};`);
      }
      this.p.dedent();
      this.p.line('}');
    }
  }

  // ================================================================
  // Feature
  // ================================================================

  private emitFeature(node: AST.FeatureDeclaration): void {
    const parts: string[] = [];

    // visibility
    if (node.visibility && node.visibility !== 'public') {
      parts.push(node.visibility);
    }

    // direction
    if (node.direction) parts.push(node.direction);

    // modifiers
    if (node.isAbstract) parts.push('abstract');
    if (node.isReadonly) parts.push('readonly');
    if (node.isDerived) parts.push('derived');
    if (node.isComposite && node.featureKind !== 'part') parts.push('composite');
    if (node.isPortion) parts.push('portion');

    // featureKind keyword
    if (node.featureKind === 'end') {
      parts.push('end');
      parts.push('feature');
    } else if (node.featureKind === 'reference') {
      parts.push('references');
    } else {
      parts.push(node.featureKind);
    }

    // name
    if (node.name) parts.push(this.name(node.name));

    // typing (:)
    if (node.typings.length > 0) {
      parts.push(':');
      parts.push(node.typings.map(t => this.qualifiedName(t)).join(', '));
    }

    // subsetting (:>)
    if (node.subsets.length > 0) {
      parts.push(':>');
      parts.push(node.subsets.map(s => this.qualifiedName(s)).join(', '));
    }

    // redefinition (:>>)
    if (node.redefines.length > 0) {
      parts.push(':>>');
      parts.push(node.redefines.map(r => this.qualifiedName(r)).join(', '));
    }

    // keyword-based relationships
    if (node.references.length > 0) {
      parts.push('references');
      parts.push(node.references.map(r => this.qualifiedName(r)).join(', '));
    }

    // multiplicity
    if (node.multiplicity) {
      parts.push(this.multiplicityRange(node.multiplicity));
    }

    // ordered / nonunique
    if (node.isOrdered) parts.push('ordered');
    if (node.isNonunique) parts.push('nonunique');

    // default value
    if (node.defaultValue) {
      parts.push('=');
      parts.push(this.expr(node.defaultValue));
    }

    const header = parts.join(' ');
    this.emitBody(header, node.members);
  }

  // ================================================================
  // Behavior / Function / Predicate / Interaction
  // ================================================================

  private emitBehavior(node: AST.BehaviorDeclaration): void {
    const vis = this.vis(node.visibility);
    const abs = node.isAbstract ? 'abstract ' : '';
    const specs = this.specList(node.specializations);
    const params = this.paramList(node.parameters);
    const header = `${vis}${abs}behavior ${this.name(node.name)}${specs}${params}`;
    this.emitBody(header, node.members);
  }

  private emitFunction(node: AST.FunctionDeclaration): void {
    const vis = this.vis(node.visibility);
    const abs = node.isAbstract ? 'abstract ' : '';
    const specs = this.specList(node.specializations);
    const params = this.paramList(node.parameters);
    const ret = node.returnType ? ` : ${this.qualifiedName(node.returnType)}` : '';
    const resultExpr = node.resultExpression ? ` = ${this.expr(node.resultExpression)}` : '';
    const header = `${vis}${abs}function ${this.name(node.name)}${specs}${params}${ret}${resultExpr}`;
    this.emitBody(header, node.members);
  }

  private emitPredicate(node: AST.PredicateDeclaration): void {
    const vis = this.vis(node.visibility);
    const abs = node.isAbstract ? 'abstract ' : '';
    const specs = this.specList(node.specializations);
    const params = this.paramList(node.parameters);
    const header = `${vis}${abs}predicate ${this.name(node.name)}${specs}${params}`;
    this.emitBody(header, node.members);
  }

  private emitInteraction(node: AST.InteractionDeclaration): void {
    const vis = this.vis(node.visibility);
    const abs = node.isAbstract ? 'abstract ' : '';
    const specs = this.specList(node.specializations);
    const header = `${vis}${abs}interaction ${this.name(node.name)}${specs}`;
    this.emitBody(header, node.members);
  }

  // ================================================================
  // Connector / Binding / Succession
  // ================================================================

  private emitConnector(node: AST.ConnectorDeclaration): void {
    const parts: string[] = ['connector'];

    if (node.name) parts.push(this.name(node.name));

    if (node.typings.length > 0) {
      parts.push(':');
      parts.push(node.typings.map(t => this.qualifiedName(t)).join(', '));
    }

    if (node.ends.length >= 2) {
      parts.push('from');
      parts.push(this.connectorEnd(node.ends[0]));
      parts.push('to');
      parts.push(this.connectorEnd(node.ends[1]));
    } else if (node.ends.length > 2) {
      // n-ary connector: (end1, end2, ...)
      parts.push('(');
      parts.push(node.ends.map(e => this.connectorEnd(e)).join(', '));
      parts.push(')');
    }

    this.emitBody(parts.join(' '), node.members);
  }

  private emitBinding(node: AST.BindingConnectorDeclaration): void {
    const parts: string[] = ['binding'];
    if (node.name) parts.push(this.name(node.name));
    parts.push(this.qualifiedName(node.source));
    parts.push('=');
    parts.push(this.qualifiedName(node.target));
    this.p.line(parts.join(' ') + ';');
  }

  private emitSuccession(node: AST.SuccessionDeclaration): void {
    const parts: string[] = ['succession'];
    if (node.name) parts.push(this.name(node.name));
    parts.push('first');
    parts.push(this.qualifiedName(node.source));
    parts.push('then');
    parts.push(this.qualifiedName(node.target));
    if (node.guardCondition) {
      parts.push(`[${this.expr(node.guardCondition)}]`);
    }
    this.p.line(parts.join(' ') + ';');
  }

  // ================================================================
  // Explicit Relationships
  // ================================================================

  private emitSpecialization(node: AST.SpecializationDeclaration): void {
    this.p.line(`specialization ${this.qualifiedName(node.specific)} :> ${this.qualifiedName(node.general)};`);
  }

  private emitConjugation(node: AST.ConjugationDeclaration): void {
    this.p.line(`conjugation ${this.qualifiedName(node.conjugated)} ~> ${this.qualifiedName(node.original)};`);
  }

  private emitDisjoining(node: AST.DisjoiningDeclaration): void {
    this.p.line(`disjoining ${this.qualifiedName(node.type1)} from ${this.qualifiedName(node.type2)};`);
  }

  // ================================================================
  // Multiplicity
  // ================================================================

  private emitMultiplicityDecl(node: AST.MultiplicityDeclaration): void {
    const n = node.name ? `${this.name(node.name)} ` : '';
    const range = this.multiplicityRange(node.range);
    const typing = node.featureTyping ? ` : ${this.qualifiedName(node.featureTyping)}` : '';
    this.p.line(`multiplicity ${n}${range}${typing};`);
  }

  // ================================================================
  // Comment / Documentation
  // ================================================================

  private emitComment(node: AST.CommentNode): void {
    const parts: string[] = ['comment'];
    if (node.name) parts.push(this.name(node.name));
    if (node.about.length > 0) {
      parts.push('about');
      parts.push(node.about.map(a => this.qualifiedName(a)).join(', '));
    }
    if (node.locale) {
      parts.push(`locale "${this.escapeStr(node.locale)}"`);
    }
    this.p.line(parts.join(' '));
    this.p.indent();
    this.p.line(`"${this.escapeStr(node.body)}";`);
    this.p.dedent();
  }

  private emitDocumentation(node: AST.DocumentationNode): void {
    const locale = node.locale ? ` locale "${this.escapeStr(node.locale)}"` : '';
    this.p.line(`doc${locale} "${this.escapeStr(node.body)}";`);
  }

  // ================================================================
  // Metaclass / Metadata
  // ================================================================

  private emitMetaclass(node: AST.MetaclassDeclaration): void {
    const vis = this.vis(node.visibility);
    const abs = node.isAbstract ? 'abstract ' : '';
    const specs = this.specList(node.specializations);
    const header = `${vis}${abs}metaclass ${this.name(node.name)}${specs}`;
    this.emitBody(header, node.members);
  }

  private emitMetadata(node: AST.MetadataUsage): void {
    const parts: string[] = ['@' + this.qualifiedName(node.metaclass)];
    if (node.about.length > 0) {
      parts.push('about');
      parts.push(node.about.map(a => this.qualifiedName(a)).join(', '));
    }
    if (node.members.length > 0) {
      this.emitBody(parts.join(' '), node.members);
    } else {
      this.p.line(parts.join(' ') + ';');
    }
  }

  // ================================================================
  // Expression → Code
  // ================================================================

  private expr(node: AST.Expression): string {
    switch (node.kind) {
      case 'LiteralExpression':
        return this.literalExpr(node);

      case 'NullExpression':
        return 'null';

      case 'NameExpression':
        return this.qualifiedName(node.name);

      case 'OperatorExpression':
        return this.operatorExpr(node);

      case 'InvocationExpression':
        return `${this.qualifiedName(node.name)}(${node.arguments.map(a => this.expr(a)).join(', ')})`;

      case 'IfExpression':
        return this.ifExpr(node);

      case 'FeatureChainExpression':
        return `${this.expr(node.source)}.${this.escapeName(node.feature)}`;

      case 'BodyExpression':
        return `(${this.expr(node.body)})`;

      case 'CollectExpression':
        return `${this.expr(node.source)}.${this.expr(node.body)}`;

      case 'SelectExpression':
        return `${this.expr(node.source)}.?${this.expr(node.body)}`;

      default:
        return `/* unknown expr: ${(node as any).kind} */`;
    }
  }

  private literalExpr(node: AST.LiteralExpression): string {
    switch (node.literalType) {
      case 'string':  return `"${this.escapeStr(node.value)}"`;
      case 'boolean': return node.value;
      case 'integer': return node.value;
      case 'real':    return node.value;
    }
  }

  private operatorExpr(node: AST.OperatorExpression): string {
    const ops = node.operands;

    // 一元运算符
    if (ops.length === 1) {
      const operand = this.exprParen(ops[0], node.operator);
      switch (node.operator) {
        case 'not': return `not ${operand}`;
        case '-':   return `-${operand}`;
        case '~':   return `~${operand}`;
        default:    return `${node.operator} ${operand}`;
      }
    }

    // 二元运算符
    if (ops.length === 2) {
      const left = this.exprParen(ops[0], node.operator);
      const right = this.exprParen(ops[1], node.operator);

      // 特殊运算符用关键字
      switch (node.operator) {
        case 'and':     return `${left} and ${right}`;
        case 'or':      return `${left} or ${right}`;
        case 'xor':     return `${left} xor ${right}`;
        case 'implies': return `${left} implies ${right}`;
        case 'istype':  return `${left} istype ${right}`;
        case 'hastype': return `${left} hastype ${right}`;
        case 'as':      return `${left} as ${right}`;
        case '#':       return `${left}[${this.expr(ops[1])}]`;
        default:        return `${left} ${node.operator} ${right}`;
      }
    }

    return ops.map(o => this.expr(o)).join(` ${node.operator} `);
  }

  private ifExpr(node: AST.IfExpression): string {
    const cond = this.expr(node.condition);
    const then = this.expr(node.thenExpr);
    if (node.elseExpr) {
      return `if ${cond} ${then} else ${this.expr(node.elseExpr)}`;
    }
    return `if ${cond} ${then}`;
  }

  /** 必要时给子表达式加括号 */
  private exprParen(node: AST.Expression, parentOp: string): string {
    const s = this.expr(node);
    if (node.kind === 'OperatorExpression') {
      const childPrec = this.precedence((node as AST.OperatorExpression).operator);
      const parentPrec = this.precedence(parentOp);
      if (childPrec < parentPrec) {
        return `(${s})`;
      }
    }
    return s;
  }

  private precedence(op: string): number {
    const table: Record<string, number> = {
      'implies': 1,
      'or': 2, '|': 2,
      'xor': 3,
      'and': 4, '&': 4,
      '==': 5, '!=': 5, '===': 5, '!==': 5,
      '<': 6, '>': 6, '<=': 6, '>=': 6, 'istype': 6, 'hastype': 6, 'as': 6,
      '+': 7, '-': 7,
      '*': 8, '/': 8, '%': 8,
      '**': 9,
      'not': 10, '~': 10,
    };
    return table[op] ?? 0;
  }

  // ================================================================
  // Common Helpers
  // ================================================================

  /** 发射带 body 的块 */
  private emitBody(header: string, members: AST.NamespaceMember[]): void {
    if (members.length === 0) {
      if (this.opts.emptyBodyAsBraces) {
        this.p.line(header + ' {}');
      } else {
        this.p.line(header + ';');
      }
    } else {
      this.p.line(header + ' {');
      this.p.indent();
      this.emitMembers(members);
      this.p.dedent();
      this.p.line('}');
    }
  }

  /** 发射带 body 和额外文本行的块 */
  private emitBodyWithExtraLines(header: string, members: AST.NamespaceMember[], extraLines: string[]): void {
    if (members.length === 0 && extraLines.length === 0) {
      if (this.opts.emptyBodyAsBraces) {
        this.p.line(header + ' {}');
      } else {
        this.p.line(header + ';');
      }
    } else {
      this.p.line(header + ' {');
      this.p.indent();
      for (const line of extraLines) {
        this.p.line(line);
      }
      if (extraLines.length > 0 && members.length > 0) {
        this.p.blank();
      }
      this.emitMembers(members);
      this.p.dedent();
      this.p.line('}');
    }
  }

  /** 构建 type-like 声明的头部 */
  private buildTypeHeader(keyword: string, name: string, opts: {
    visibility?: AST.Visibility;
    isAbstract?: boolean;
    specializations?: AST.QualifiedName[];
    multiplicity?: AST.MultiplicityRange;
  }): string {
    const vis = this.vis(opts.visibility);
    const abs = opts.isAbstract ? 'abstract ' : '';
    const specs = this.specList(opts.specializations ?? []);
    const mult = opts.multiplicity ? ' ' + this.multiplicityRange(opts.multiplicity) : '';
    return `${vis}${abs}${keyword} ${this.name(name)}${specs}${mult}`;
  }

  /** 生成 :> spec1, spec2 */
  private specList(specializations: AST.QualifiedName[]): string {
    if (specializations.length === 0) return '';
    return ' :> ' + specializations.map(s => this.qualifiedName(s)).join(', ');
  }

  /** 生成参数列表 (p1 : T1, p2 : T2) */
  private paramList(params: AST.FeatureDeclaration[]): string {
    if (params.length === 0) return '';
    const ps = params.map(p => this.paramDecl(p));
    return '(' + ps.join(', ') + ')';
  }

  private paramDecl(p: AST.FeatureDeclaration): string {
    const parts: string[] = [];
    if (p.direction) parts.push(p.direction);
    if (p.name) parts.push(this.name(p.name));
    if (p.typings.length > 0) {
      parts.push(':');
      parts.push(p.typings.map(t => this.qualifiedName(t)).join(', '));
    }
    if (p.multiplicity) {
      parts.push(this.multiplicityRange(p.multiplicity));
    }
    if (p.defaultValue) {
      parts.push('=');
      parts.push(this.expr(p.defaultValue));
    }
    return parts.join(' ');
  }

  /** 生成 connector end 引用 */
  private connectorEnd(end: AST.ConnectorEnd): string {
    const parts: string[] = [];
    if (end.name) {
      parts.push(this.name(end.name));
      parts.push('references');
    }
    parts.push(this.qualifiedName(end.reference));
    if (end.multiplicity) {
      parts.push(this.multiplicityRange(end.multiplicity));
    }
    return parts.join(' ');
  }

  /** 生成多重性范围 [lower..upper] */
  private multiplicityRange(range: AST.MultiplicityRange): string {
    if (!range.lower && !range.upper) return '[*]';

    const lower = range.lower ? this.expr(range.lower) : '0';
    const upper = range.upper ? this.expr(range.upper) : '*';

    if (lower === upper) return `[${lower}]`;
    return `[${lower}..${upper}]`;
  }

  /** 限定名 A::B::C */
  private qualifiedName(qn: AST.QualifiedName): string {
    return qn.segments.map(s => this.escapeName(s)).join('::');
  }

  /** 可见性前缀 */
  private vis(v?: AST.Visibility): string {
    if (!v || v === 'public') return '';
    return v + ' ';
  }

  /** 名称转义 */
  private name(n: string): string {
    return this.escapeName(n);
  }

  private escapeName(name: string): string {
    if (!name) return '<unnamed>';
    if (/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name)) return name;
    return `'${name.replace(/'/g, "\\'")}'`;
  }

  private escapeStr(s: string): string {
    return s
      .replace(/\\/g, '\\\\')
      .replace(/"/g, '\\"')
      .replace(/\n/g, '\\n')
      .replace(/\r/g, '\\r')
      .replace(/\t/g, '\\t');
  }
}