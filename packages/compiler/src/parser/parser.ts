// ============================================================
// KerML Recursive Descent Parser
// Implements the KerML textual grammar specification
// ============================================================

import { Token, TokenType, SourceLocation } from '../lexer/token';
import * as AST from './ast';

export class ParseError extends Error {
  constructor(
    message: string,
    public location?: SourceLocation
  ) {
    super(
      location
        ? `Parse error at ${location.line}:${location.column}: ${message}`
        : `Parse error: ${message}`
    );
    this.name = 'ParseError';
  }
}

export class Parser {
  private tokens: Token[] = [];
  private pos: number = 0;
  private errors: ParseError[] = [];

  constructor(tokens: Token[]) {
    this.tokens = tokens;
  }

  parse(): AST.RootNamespace {
    const members: AST.NamespaceMember[] = [];

    while (!this.isAtEnd()) {
      try {
        const member = this.parseNamespaceMember();
        if (member) {
          members.push(member);
        }
      } catch (e) {
        if (e instanceof ParseError) {
          this.errors.push(e);
          this.synchronize();
        } else {
          throw e;
        }
      }
    }

    return {
      kind: 'RootNamespace',
      members,
      location: { line: 1, column: 1, offset: 0 },
    };
  }

  getErrors(): ParseError[] {
    return this.errors;
  }

  // ---- Utility Methods ----

  private current(): Token {
    return this.tokens[this.pos] ?? this.tokens[this.tokens.length - 1];
  }

  private peek(offset: number = 0): Token {
    const idx = this.pos + offset;
    return this.tokens[idx] ?? this.tokens[this.tokens.length - 1];
  }

  private isAtEnd(): boolean {
    return this.current().type === TokenType.EOF;
  }

  private advance(): Token {
    const tok = this.current();
    if (!this.isAtEnd()) this.pos++;
    return tok;
  }

  private check(type: TokenType): boolean {
    return this.current().type === type;
  }

  private checkAny(...types: TokenType[]): boolean {
    return types.includes(this.current().type);
  }

  private match(...types: TokenType[]): boolean {
    if (types.includes(this.current().type)) {
      this.advance();
      return true;
    }
    return false;
  }

  private expect(type: TokenType, message?: string): Token {
    if (this.current().type === type) {
      return this.advance();
    }
    throw new ParseError(
      message ?? `Expected ${type}, got ${this.current().type} ('${this.current().value}')`,
      this.current().location
    );
  }

  private expectSemicolon(): void {
    this.expect(TokenType.Semicolon, 'Expected ";"');
  }

  private synchronize(): void {
    this.advance();
    while (!this.isAtEnd()) {
      if (this.peek(-1).type === TokenType.Semicolon) return;
      if (this.peek(-1).type === TokenType.RBrace) return;

      const t = this.current().type;
      if (
        t === TokenType.KW_package || t === TokenType.KW_class ||
        t === TokenType.KW_feature || t === TokenType.KW_import ||
        t === TokenType.KW_type || t === TokenType.KW_classifier ||
        t === TokenType.KW_behavior || t === TokenType.KW_function ||
        t === TokenType.KW_datatype || t === TokenType.KW_assoc ||
        t === TokenType.KW_struct || t === TokenType.KW_enum ||
        t === TokenType.KW_connector || t === TokenType.KW_comment ||
        t === TokenType.KW_doc || t === TokenType.KW_metadata
      ) {
        return;
      }
      this.advance();
    }
  }

  // ---- Name Parsing ----

  private parseName(): string {
    if (this.check(TokenType.Identifier)) {
      return this.advance().value;
    }
    if (this.check(TokenType.UnrestrictedName)) {
      return this.advance().value;
    }
    throw new ParseError(
      `Expected identifier, got ${this.current().type} ('${this.current().value}')`,
      this.current().location
    );
  }

  private parseQualifiedName(): AST.QualifiedName {
    const loc = this.current().location;
    const segments: string[] = [this.parseName()];

    while (this.match(TokenType.ColonColon)) {
      segments.push(this.parseName());
    }

    // Also handle dot-separated names
    while (this.check(TokenType.Dot) && this.isNameNext(1)) {
      this.advance(); // .
      segments.push(this.parseName());
    }

    return { kind: 'QualifiedName', segments, location: loc };
  }

  private isNameNext(offset: number = 0): boolean {
    const t = this.peek(offset).type;
    return t === TokenType.Identifier || t === TokenType.UnrestrictedName;
  }

  private isNameStart(): boolean {
    return this.isNameNext(0);
  }

  // ---- Visibility ----

  private tryParseVisibility(): AST.Visibility | undefined {
    if (this.match(TokenType.KW_public)) return 'public';
    if (this.match(TokenType.KW_private)) return 'private';
    if (this.match(TokenType.KW_protected)) return 'protected';
    return undefined;
  }

  // ---- Namespace Member Parsing ----

  private parseNamespaceMember(): AST.NamespaceMember | null {
    const visibility = this.tryParseVisibility();

    switch (this.current().type) {
      case TokenType.KW_package:
      case TokenType.KW_LibraryPackage:
        return this.parsePackage(visibility);
      case TokenType.KW_namespace:
        return this.parseNamespace(visibility);
      case TokenType.KW_import:
        return this.parseImport(visibility);
      case TokenType.KW_alias:
        return this.parseAlias(visibility);
      case TokenType.KW_dependency:
        return this.parseDependency();
      case TokenType.KW_abstract:
        return this.parseAbstractMember(visibility);
      case TokenType.KW_type:
        return this.parseTypeDecl(visibility, false);
      case TokenType.KW_classifier:
        return this.parseClassifier(visibility, false);
      case TokenType.KW_class:
        return this.parseClass(visibility, false);
      case TokenType.KW_struct:
        return this.parseStruct(visibility, false);
      case TokenType.KW_assoc:
        return this.parseAssociation(visibility, false);
      case TokenType.KW_datatype:
        return this.parseDataType(visibility, false);
      case TokenType.KW_enum:
        return this.parseEnum(visibility);
      case TokenType.KW_feature:
      case TokenType.KW_attribute:
      case TokenType.KW_item:
      case TokenType.KW_part:
      case TokenType.KW_port:
      case TokenType.KW_connection:
      case TokenType.KW_flow:
      case TokenType.KW_interface:
      case TokenType.KW_allocation:
      case TokenType.KW_end:
      case TokenType.KW_in:
      case TokenType.KW_out:
      case TokenType.KW_inout:
      case TokenType.KW_readonly:
      case TokenType.KW_derived:
      case TokenType.KW_composite:
      case TokenType.KW_portion:
      case TokenType.KW_references:
        return this.parseFeature(visibility);
      case TokenType.KW_behavior:
        return this.parseBehavior(visibility, false);
      case TokenType.KW_step:
        return this.parseStep(visibility);
      case TokenType.KW_function:
        return this.parseFunction(visibility, false);
      case TokenType.KW_predicate:
        return this.parsePredicate(visibility, false);
      case TokenType.KW_interaction:
        return this.parseInteraction(visibility, false);
      case TokenType.KW_connector:
        return this.parseConnector(visibility);
      case TokenType.KW_binding:
        return this.parseBindingConnector(visibility);
      case TokenType.KW_succession:
        return this.parseSuccession(visibility);
      case TokenType.KW_specialization:
        return this.parseSpecialization();
      case TokenType.KW_conjugation:
        return this.parseConjugation();
      case TokenType.KW_disjoining:
        return this.parseDisjoining();
      case TokenType.KW_multiplicity:
        return this.parseMultiplicityDecl();
      case TokenType.KW_comment:
        return this.parseComment();
      case TokenType.KW_doc:
        return this.parseDocumentation();
      case TokenType.KW_metaclass:
        return this.parseMetaclass(visibility, false);
      case TokenType.KW_metadata:
      case TokenType.At:
        return this.parseMetadata();
      default:
        // Try as feature if it starts with a name
        if (this.isNameStart() && visibility !== undefined) {
          return this.parseFeature(visibility);
        }
        if (this.isNameStart()) {
          return this.parseFeature(undefined);
        }
        throw new ParseError(
          `Unexpected token: ${this.current().type} ('${this.current().value}')`,
          this.current().location
        );
    }
  }

  // ---- Abstract prefix ----

  private parseAbstractMember(visibility?: AST.Visibility): AST.NamespaceMember {
    this.expect(TokenType.KW_abstract);
    switch (this.current().type) {
      case TokenType.KW_type: return this.parseTypeDecl(visibility, true);
      case TokenType.KW_classifier: return this.parseClassifier(visibility, true);
      case TokenType.KW_class: return this.parseClass(visibility, true);
      case TokenType.KW_struct: return this.parseStruct(visibility, true);
      case TokenType.KW_assoc: return this.parseAssociation(visibility, true);
      case TokenType.KW_datatype: return this.parseDataType(visibility, true);
      case TokenType.KW_behavior: return this.parseBehavior(visibility, true);
      case TokenType.KW_function: return this.parseFunction(visibility, true);
      case TokenType.KW_predicate: return this.parsePredicate(visibility, true);
      case TokenType.KW_interaction: return this.parseInteraction(visibility, true);
      case TokenType.KW_metaclass: return this.parseMetaclass(visibility, true);
      case TokenType.KW_feature:
      case TokenType.KW_attribute:
      case TokenType.KW_item:
      case TokenType.KW_part:
      case TokenType.KW_port:
        return this.parseFeatureWithAbstract(visibility);
      default:
        throw new ParseError(
          `Unexpected token after 'abstract': ${this.current().type}`,
          this.current().location
        );
    }
  }

  // ---- Package ----

  private parsePackage(visibility?: AST.Visibility): AST.PackageDeclaration {
    const loc = this.current().location;
    const isLibrary = this.match(TokenType.KW_LibraryPackage);
    if (!isLibrary) this.expect(TokenType.KW_package);

    const name = this.parseName();
    const members = this.parseBody();

    return {
      kind: 'PackageDeclaration',
      isLibrary,
      name,
      members,
      location: loc,
    };
  }

  private parseNamespace(visibility?: AST.Visibility): AST.NamespaceDeclaration {
    const loc = this.current().location;
    this.expect(TokenType.KW_namespace);
    const name = this.parseName();
    const members = this.parseBody();
    return { kind: 'NamespaceDeclaration', name, members, location: loc };
  }

  // ---- Body ----

  private parseBody(): AST.NamespaceMember[] {
    if (this.match(TokenType.LBrace)) {
      const members: AST.NamespaceMember[] = [];
      while (!this.check(TokenType.RBrace) && !this.isAtEnd()) {
        try {
          const m = this.parseNamespaceMember();
          if (m) members.push(m);
        } catch (e) {
          if (e instanceof ParseError) {
            this.errors.push(e);
            this.synchronize();
          } else throw e;
        }
      }
      this.expect(TokenType.RBrace);
      return members;
    }
    if (this.match(TokenType.Semicolon)) {
      return [];
    }
    // empty body
    return [];
  }

  // ---- Import ----

  private parseImport(visibility?: AST.Visibility): AST.ImportDeclaration {
    const loc = this.current().location;
    this.expect(TokenType.KW_import);
    const isAll = this.match(TokenType.KW_all);

    const qualifiedName = this.parseQualifiedName();

    // Check for ::* (wildcard)
    let isWildcard = false;
    if (this.match(TokenType.ColonColon)) {
      if (this.match(TokenType.Star)) {
        isWildcard = true;
      }
    }

    // Check for recursive import
    let isRecursive = false;
    if (this.match(TokenType.StarStar)) {
      isRecursive = true;
    }

    // Optional filter condition
    let filterCondition: AST.Expression | undefined;
    if (this.match(TokenType.LBracket)) {
      filterCondition = this.parseExpression();
      this.expect(TokenType.RBracket);
    }

    this.expectSemicolon();

    return {
      kind: 'ImportDeclaration',
      visibility,
      isAll,
      isRecursive,
      qualifiedName,
      isWildcard,
      filterCondition,
      location: loc,
    };
  }

  // ---- Alias ----

  private parseAlias(visibility?: AST.Visibility): AST.AliasMember {
    const loc = this.current().location;
    this.expect(TokenType.KW_alias);
    const name = this.parseName();
    
    // 'for' 不是 keyword，作为 identifier 处理
    if (this.current().type === TokenType.Identifier && this.current().value === 'for') {
        this.advance();
    } else {
        throw new ParseError(`Expected 'for' in alias declaration`, this.current().location);
    }
    
    const target = this.parseQualifiedName();
    this.expectSemicolon();
    return { kind: 'AliasMember', visibility, name, target, location: loc };
    }

  // ---- Dependency ----

  private parseDependency(): AST.DependencyDeclaration {
    const loc = this.current().location;
    this.expect(TokenType.KW_dependency);
    let name: string | undefined;
    if (this.isNameStart() && !this.check(TokenType.KW_from)) {
      name = this.parseName();
    }
    this.expect(TokenType.KW_from);
    const clients: AST.QualifiedName[] = [this.parseQualifiedName()];
    while (this.match(TokenType.Comma)) {
      clients.push(this.parseQualifiedName());
    }
    this.expect(TokenType.KW_to);
    const suppliers: AST.QualifiedName[] = [this.parseQualifiedName()];
    while (this.match(TokenType.Comma)) {
      suppliers.push(this.parseQualifiedName());
    }
    this.expectSemicolon();
    return { kind: 'DependencyDeclaration', name, clients, suppliers, location: loc };
  }

  // ---- Type Declaration ----

  private parseTypeDecl(visibility?: AST.Visibility, isAbstract: boolean = false): AST.TypeDeclaration {
    const loc = this.current().location;
    this.expect(TokenType.KW_type);
    const name = this.parseName();

    const spec = this.parseTypeRelationships();
    const multiplicity = this.tryParseMultiplicityRange();
    const members = this.parseBody();

    return {
      kind: 'TypeDeclaration',
      visibility,
      isAbstract,
      name,
      specializations: spec.specializations,
      conjugates: spec.conjugates,
      disjointFrom: spec.disjointFrom,
      unions: spec.unions,
      intersects: spec.intersects,
      differences: spec.differences,
      multiplicity,
      members,
      location: loc,
    };
  }

  private parseTypeRelationships() {
    const specializations: AST.QualifiedName[] = [];
    const conjugates: AST.QualifiedName[] = [];
    const disjointFrom: AST.QualifiedName[] = [];
    const unions: AST.QualifiedName[] = [];
    const intersects: AST.QualifiedName[] = [];
    const differences: AST.QualifiedName[] = [];

    // :> (specialization)
    if (this.match(TokenType.ColonGt)) {
      specializations.push(this.parseQualifiedName());
      while (this.match(TokenType.Comma)) {
        specializations.push(this.parseQualifiedName());
      }
    }

    // ~> (conjugation)
    if (this.match(TokenType.TildeGt)) {
      conjugates.push(this.parseQualifiedName());
    }

    // keyword-based relationships
    while (this.checkAny(
      TokenType.KW_unioning, TokenType.KW_intersecting,
      TokenType.KW_differencing, TokenType.KW_disjoining
    )) {
      if (this.match(TokenType.KW_unioning)) {
        unions.push(this.parseQualifiedName());
        while (this.match(TokenType.Comma)) unions.push(this.parseQualifiedName());
      }
      if (this.match(TokenType.KW_intersecting)) {
        intersects.push(this.parseQualifiedName());
        while (this.match(TokenType.Comma)) intersects.push(this.parseQualifiedName());
      }
      if (this.match(TokenType.KW_differencing)) {
        differences.push(this.parseQualifiedName());
        while (this.match(TokenType.Comma)) differences.push(this.parseQualifiedName());
      }
      if (this.match(TokenType.KW_disjoining)) {
        disjointFrom.push(this.parseQualifiedName());
        while (this.match(TokenType.Comma)) disjointFrom.push(this.parseQualifiedName());
      }
    }

    return { specializations, conjugates, disjointFrom, unions, intersects, differences };
  }

  // ---- Classifier ----

  private parseClassifier(visibility?: AST.Visibility, isAbstract: boolean = false): AST.ClassifierDeclaration {
    const loc = this.current().location;
    this.expect(TokenType.KW_classifier);
    const name = this.parseName();
    const specializations = this.parseSpecializationList();
    const multiplicity = this.tryParseMultiplicityRange();
    const members = this.parseBody();
    return {
      kind: 'ClassifierDeclaration',
      visibility, isAbstract, name, specializations, multiplicity, members, location: loc,
    };
  }

  // ---- Class ----

  private parseClass(visibility?: AST.Visibility, isAbstract: boolean = false): AST.ClassDeclaration {
    const loc = this.current().location;
    this.expect(TokenType.KW_class);
    const name = this.parseName();
    const specializations = this.parseSpecializationList();
    const multiplicity = this.tryParseMultiplicityRange();
    const members = this.parseBody();
    return {
      kind: 'ClassDeclaration',
      visibility, isAbstract, name, specializations, multiplicity, members, location: loc,
    };
  }

  // ---- Struct ----

  private parseStruct(visibility?: AST.Visibility, isAbstract: boolean = false): AST.StructDeclaration {
    const loc = this.current().location;
    this.expect(TokenType.KW_struct);
    const name = this.parseName();
    const specializations = this.parseSpecializationList();
    const multiplicity = this.tryParseMultiplicityRange();
    const members = this.parseBody();
    return {
      kind: 'StructDeclaration',
      visibility, isAbstract, name, specializations, multiplicity, members, location: loc,
    };
  }

  // ---- Association ----

  private parseAssociation(visibility?: AST.Visibility, isAbstract: boolean = false): AST.AssociationDeclaration {
    const loc = this.current().location;
    this.expect(TokenType.KW_assoc);
    const isStruct = this.match(TokenType.KW_struct);
    const name = this.parseName();
    const specializations = this.parseSpecializationList();
    const members = this.parseBody();
    return {
      kind: 'AssociationDeclaration',
      visibility, isAbstract, isStruct, name, specializations, members, location: loc,
    };
  }

  // ---- DataType ----

  private parseDataType(visibility?: AST.Visibility, isAbstract: boolean = false): AST.DataTypeDeclaration {
    const loc = this.current().location;
    this.expect(TokenType.KW_datatype);
    const name = this.parseName();
    const specializations = this.parseSpecializationList();
    const members = this.parseBody();
    return {
      kind: 'DataTypeDeclaration',
      visibility, isAbstract, name, specializations, members, location: loc,
    };
  }

  // ---- Enum ----

  private parseEnum(visibility?: AST.Visibility): AST.EnumDeclaration {
    const loc = this.current().location;
    this.expect(TokenType.KW_enum);
    const name = this.parseName();
    const specializations = this.parseSpecializationList();
    const members: AST.EnumMember[] = [];

    if (this.match(TokenType.LBrace)) {
      while (!this.check(TokenType.RBrace) && !this.isAtEnd()) {
        const eLoc = this.current().location;
        const eName = this.parseName();
        this.match(TokenType.Semicolon);
        members.push({ kind: 'EnumMember', name: eName, location: eLoc });
      }
      this.expect(TokenType.RBrace);
    } else {
      this.expectSemicolon();
    }

    return { kind: 'EnumDeclaration', visibility, name, specializations, members, location: loc };
  }

  // ---- Feature ----

  private parseFeatureWithAbstract(visibility?: AST.Visibility): AST.FeatureDeclaration {
    const feat = this.parseFeature(visibility);
    feat.isAbstract = true;
    return feat;
  }

  private parseFeature(visibility?: AST.Visibility): AST.FeatureDeclaration {
    const loc = this.current().location;

    // Parse modifiers
    let direction: AST.FeatureDirection;
    let isComposite = false;
    let isPortion = false;
    let isReadonly = false;
    let isDerived = false;
    let isOrdered = false;
    let isNonunique = false;
    let isAbstract = false;
    let isEnd = false;
    let isReference = false;

    // Direction
    if (this.match(TokenType.KW_in)) direction = 'in';
    else if (this.match(TokenType.KW_out)) direction = 'out';
    else if (this.match(TokenType.KW_inout)) direction = 'inout';

    // Modifiers loop
    let parsing = true;
    while (parsing) {
      switch (this.current().type) {
        case TokenType.KW_abstract: this.advance(); isAbstract = true; break;
        case TokenType.KW_readonly: this.advance(); isReadonly = true; break;
        case TokenType.KW_derived: this.advance(); isDerived = true; break;
        case TokenType.KW_ordered: this.advance(); isOrdered = true; break;
        case TokenType.KW_nonunique: this.advance(); isNonunique = true; break;
        case TokenType.KW_composite: this.advance(); isComposite = true; break;
        case TokenType.KW_portion: this.advance(); isPortion = true; break;
        case TokenType.KW_end: this.advance(); isEnd = true; break;
        default: parsing = false;
      }
    }

    // Feature kind
    let featureKind: AST.FeatureDeclaration['featureKind'] = 'feature';
    if (this.match(TokenType.KW_feature)) featureKind = 'feature';
    else if (this.match(TokenType.KW_attribute)) featureKind = 'attribute';
    else if (this.match(TokenType.KW_item)) featureKind = 'item';
    else if (this.match(TokenType.KW_part)) featureKind = 'part';
    else if (this.match(TokenType.KW_port)) featureKind = 'port';
    else if (this.match(TokenType.KW_connection)) featureKind = 'connection';
    else if (this.match(TokenType.KW_flow)) featureKind = 'flow';
    else if (this.match(TokenType.KW_interface)) featureKind = 'interface';
    else if (this.match(TokenType.KW_allocation)) featureKind = 'allocation';
    else if (this.match(TokenType.KW_references)) { featureKind = 'reference'; isReference = true; }
    else if (isEnd) featureKind = 'end';

    // Name (optional)
    let name: string | undefined;
    if (this.isNameStart() && !this.checkAny(TokenType.Colon, TokenType.ColonGt, TokenType.ColonGtGt, TokenType.LBracket, TokenType.LBrace, TokenType.Semicolon)) {
      name = this.parseName();
    }

    // Feature relationships
    const typings: AST.QualifiedName[] = [];
    const subsets: AST.QualifiedName[] = [];
    const redefines: AST.QualifiedName[] = [];
    const references: AST.QualifiedName[] = [];

    // Typing (:)
    if (this.match(TokenType.Colon)) {
      typings.push(this.parseQualifiedName());
      while (this.match(TokenType.Comma)) {
        typings.push(this.parseQualifiedName());
      }
    }

    // Subsetting (:>)
    if (this.match(TokenType.ColonGt)) {
      subsets.push(this.parseQualifiedName());
      while (this.match(TokenType.Comma)) {
        subsets.push(this.parseQualifiedName());
      }
    }

    // Redefinition (:>>)
    if (this.match(TokenType.ColonGtGt)) {
      redefines.push(this.parseQualifiedName());
      while (this.match(TokenType.Comma)) {
        redefines.push(this.parseQualifiedName());
      }
    }

    // keyword-based relationships
    while (this.checkAny(TokenType.KW_subsets, TokenType.KW_redefines, TokenType.KW_references, TokenType.KW_typed)) {
      if (this.match(TokenType.KW_subsets)) {
        subsets.push(this.parseQualifiedName());
        while (this.match(TokenType.Comma)) subsets.push(this.parseQualifiedName());
      }
      if (this.match(TokenType.KW_redefines)) {
        redefines.push(this.parseQualifiedName());
        while (this.match(TokenType.Comma)) redefines.push(this.parseQualifiedName());
      }
      if (this.match(TokenType.KW_references)) {
        references.push(this.parseQualifiedName());
        while (this.match(TokenType.Comma)) references.push(this.parseQualifiedName());
      }
      if (this.match(TokenType.KW_typed)) {
        this.expect(TokenType.KW_by);
        typings.push(this.parseQualifiedName());
        while (this.match(TokenType.Comma)) typings.push(this.parseQualifiedName());
      }
    }

    // Multiplicity
    const multiplicity = this.tryParseMultiplicityRange();

    // ordered/nonunique after multiplicity
    if (this.match(TokenType.KW_ordered)) isOrdered = true;
    if (this.match(TokenType.KW_nonunique)) isNonunique = true;

    // Default value
    let defaultValue: AST.Expression | undefined;
    if (this.match(TokenType.Eq)) {
      defaultValue = this.parseExpression();
    }

    // Body
    const members = this.parseBody();

    return {
      kind: 'FeatureDeclaration',
      visibility,
      isAbstract,
      featureKind,
      direction,
      isComposite,
      isPortion,
      isReadonly,
      isDerived,
      isOrdered,
      isNonunique,
      name,
      typings,
      subsets,
      redefines,
      references,
      multiplicity,
      defaultValue,
      members,
      location: loc,
    };
  }

  // ---- Behavior ----

  private parseBehavior(visibility?: AST.Visibility, isAbstract: boolean = false): AST.BehaviorDeclaration {
    const loc = this.current().location;
    this.expect(TokenType.KW_behavior);
    const name = this.parseName();
    const specializations = this.parseSpecializationList();
    const parameters = this.tryParseParameterList();
    const members = this.parseBody();
    return {
      kind: 'BehaviorDeclaration',
      visibility, isAbstract, name, specializations, parameters, members, location: loc,
    };
  }

  // ---- Step ----

  private parseStep(visibility?: AST.Visibility): AST.FeatureDeclaration {
    const loc = this.current().location;
    this.expect(TokenType.KW_step);
    let name: string | undefined;
    if (this.isNameStart()) name = this.parseName();
    const typings: AST.QualifiedName[] = [];
    if (this.match(TokenType.Colon)) {
      typings.push(this.parseQualifiedName());
      while (this.match(TokenType.Comma)) typings.push(this.parseQualifiedName());
    }
    const members = this.parseBody();
    return {
      kind: 'FeatureDeclaration',
      visibility,
      isAbstract: false,
      featureKind: 'feature',
      direction: undefined,
      isComposite: false, isPortion: false, isReadonly: false,
      isDerived: false, isOrdered: false, isNonunique: false,
      name, typings, subsets: [], redefines: [], references: [],
      multiplicity: undefined, defaultValue: undefined,
      members, location: loc,
    };
  }

  // ---- Function ----

  private parseFunction(visibility?: AST.Visibility, isAbstract: boolean = false): AST.FunctionDeclaration {
    const loc = this.current().location;
    this.expect(TokenType.KW_function);
    const name = this.parseName();
    const specializations = this.parseSpecializationList();
    const parameters = this.tryParseParameterList();

    let returnType: AST.QualifiedName | undefined;
    if (this.match(TokenType.KW_return)) {
      returnType = this.parseQualifiedName();
    } else if (this.match(TokenType.Colon)) {
      returnType = this.parseQualifiedName();
    }

    let resultExpression: AST.Expression | undefined;
    if (this.match(TokenType.Eq)) {
      resultExpression = this.parseExpression();
    }

    const members = this.parseBody();

    return {
      kind: 'FunctionDeclaration',
      visibility, isAbstract, name, specializations,
      parameters, returnType, resultExpression, members, location: loc,
    };
  }

  // ---- Predicate ----

  private parsePredicate(visibility?: AST.Visibility, isAbstract: boolean = false): AST.PredicateDeclaration {
    const loc = this.current().location;
    this.expect(TokenType.KW_predicate);
    const name = this.parseName();
    const specializations = this.parseSpecializationList();
    const parameters = this.tryParseParameterList();
    const members = this.parseBody();
    return {
      kind: 'PredicateDeclaration',
      visibility, isAbstract, name, specializations, parameters, members, location: loc,
    };
  }

  // ---- Interaction ----

  private parseInteraction(visibility?: AST.Visibility, isAbstract: boolean = false): AST.InteractionDeclaration {
    const loc = this.current().location;
    this.expect(TokenType.KW_interaction);
    const name = this.parseName();
    const specializations = this.parseSpecializationList();
    const members = this.parseBody();
    return {
      kind: 'InteractionDeclaration',
      visibility, isAbstract, name, specializations, members, location: loc,
    };
  }

  // ---- Connector ----

  private parseConnector(visibility?: AST.Visibility): AST.ConnectorDeclaration {
    const loc = this.current().location;
    this.expect(TokenType.KW_connector);

    let name: string | undefined;
    const typings: AST.QualifiedName[] = [];

    if (this.isNameStart() && !this.check(TokenType.KW_from)) {
      name = this.parseName();
      if (this.match(TokenType.Colon)) {
        typings.push(this.parseQualifiedName());
        while (this.match(TokenType.Comma)) typings.push(this.parseQualifiedName());
      }
    }

    const ends: AST.ConnectorEnd[] = [];

    // from ... to ... syntax or ( ... , ... ) syntax
    if (this.match(TokenType.KW_from)) {
      ends.push(this.parseConnectorEnd());
      this.expect(TokenType.KW_to);
      ends.push(this.parseConnectorEnd());
    } else if (this.match(TokenType.LParen)) {
      ends.push(this.parseConnectorEnd());
      while (this.match(TokenType.Comma)) {
        ends.push(this.parseConnectorEnd());
      }
      this.expect(TokenType.RParen);
    }

    const members = this.parseBody();

    return {
      kind: 'ConnectorDeclaration',
      visibility, name, typings, ends, members, location: loc,
    };
  }

  private parseConnectorEnd(): AST.ConnectorEnd {
    const loc = this.current().location;
    let name: string | undefined;

    // Check if there's a name followed by references
    const savedPos = this.pos;
    if (this.isNameStart()) {
      const potentialName = this.parseName();
      if (this.match(TokenType.KW_references) || this.match(TokenType.ColonGtGt)) {
        name = potentialName;
      } else {
        this.pos = savedPos; // backtrack
      }
    }

    const reference = this.parseQualifiedName();
    const multiplicity = this.tryParseMultiplicityRange();

    return { kind: 'ConnectorEnd', name, reference, multiplicity, location: loc };
  }

  // ---- Binding Connector ----

  private parseBindingConnector(visibility?: AST.Visibility): AST.BindingConnectorDeclaration {
    const loc = this.current().location;
    this.expect(TokenType.KW_binding);
    let name: string | undefined;
    if (this.isNameStart() && !this.check(TokenType.KW_of)) {
      name = this.parseName();
    }
    if (this.match(TokenType.KW_of)) { /* optional 'of' */ }
    const source = this.parseQualifiedName();
    this.expect(TokenType.Eq);
    const target = this.parseQualifiedName();
    this.expectSemicolon();
    return {
      kind: 'BindingConnectorDeclaration',
      visibility, name, source, target, location: loc,
    };
  }

  // ---- Succession ----

  private parseSuccession(visibility?: AST.Visibility): AST.SuccessionDeclaration {
    const loc = this.current().location;
    this.expect(TokenType.KW_succession);
    let name: string | undefined;
    if (this.isNameStart() && !this.check(TokenType.KW_first)) {
      name = this.parseName();
    }
    this.match(TokenType.KW_first);
    const source = this.parseQualifiedName();
    this.expect(TokenType.KW_then);
    const target = this.parseQualifiedName();
    let guardCondition: AST.Expression | undefined;
    if (this.match(TokenType.LBracket)) {
      guardCondition = this.parseExpression();
      this.expect(TokenType.RBracket);
    }
    this.expectSemicolon();
    return {
      kind: 'SuccessionDeclaration',
      visibility, name, source, target, guardCondition, location: loc,
    };
  }

  // ---- Explicit Specialization ----

  private parseSpecialization(): AST.SpecializationDeclaration {
    const loc = this.current().location;
    this.expect(TokenType.KW_specialization);
    // optional name
    if (this.isNameStart() && this.peek(1).type !== TokenType.ColonGt) {
      this.parseName(); // discard name for now
    }
    const specific = this.parseQualifiedName();
    this.expect(TokenType.ColonGt);
    const general = this.parseQualifiedName();
    this.expectSemicolon();
    return { kind: 'SpecializationDeclaration', specific, general, location: loc };
  }

  // ---- Conjugation ----

  private parseConjugation(): AST.ConjugationDeclaration {
    const loc = this.current().location;
    this.expect(TokenType.KW_conjugation);
    if (this.isNameStart() && this.peek(1).type !== TokenType.TildeGt) {
      this.parseName();
    }
    const conjugated = this.parseQualifiedName();
    this.expect(TokenType.TildeGt);
    const original = this.parseQualifiedName();
    this.expectSemicolon();
    return { kind: 'ConjugationDeclaration', conjugated, original, location: loc };
  }

  // ---- Disjoining ----

  private parseDisjoining(): AST.DisjoiningDeclaration {
    const loc = this.current().location;
    this.expect(TokenType.KW_disjoining);
    if (this.isNameStart() && this.peek(1).type !== TokenType.KW_from) {
      this.parseName();
    }
    const type1 = this.parseQualifiedName();
    this.expect(TokenType.KW_from);
    const type2 = this.parseQualifiedName();
    this.expectSemicolon();
    return { kind: 'DisjoiningDeclaration', type1, type2, location: loc };
  }

  // ---- Multiplicity Declaration ----

  private parseMultiplicityDecl(): AST.MultiplicityDeclaration {
    const loc = this.current().location;
    this.expect(TokenType.KW_multiplicity);
    let name: string | undefined;
    if (this.isNameStart()) {
      name = this.parseName();
    }
    const range = this.parseMultiplicityRangeRequired();
    let featureTyping: AST.QualifiedName | undefined;
    if (this.match(TokenType.Colon)) {
      featureTyping = this.parseQualifiedName();
    }
    this.expectSemicolon();
    return { kind: 'MultiplicityDeclaration', name, range, featureTyping, location: loc };
  }

  // ---- Comment ----

  private parseComment(): AST.CommentNode {
    const loc = this.current().location;
    this.expect(TokenType.KW_comment);
    let name: string | undefined;
    if (this.isNameStart() && !this.check(TokenType.KW_about)) {
      name = this.parseName();
    }
    const about: AST.QualifiedName[] = [];
    if (this.match(TokenType.KW_about)) {
      about.push(this.parseQualifiedName());
      while (this.match(TokenType.Comma)) {
        about.push(this.parseQualifiedName());
      }
    }
    let locale: string | undefined;
    if (this.match(TokenType.KW_locale)) {
      locale = this.expect(TokenType.StringLiteral).value;
    }

    // Body is a string literal or /*** ... ***/
    let body = '';
    if (this.check(TokenType.StringLiteral)) {
      body = this.advance().value;
    } else if (this.check(TokenType.Slash)) {
      // read until end of comment block
      body = this.advance().value;
    }

    this.match(TokenType.Semicolon);

    return { kind: 'CommentNode', name, about, locale, body, location: loc };
  }

  // ---- Documentation ----

  private parseDocumentation(): AST.DocumentationNode {
    const loc = this.current().location;
    this.expect(TokenType.KW_doc);

    let locale: string | undefined;
    if (this.match(TokenType.KW_locale)) {
      locale = this.expect(TokenType.StringLiteral).value;
    }

    let body = '';
    if (this.check(TokenType.StringLiteral)) {
      body = this.advance().value;
    }

    this.match(TokenType.Semicolon);

    return { kind: 'DocumentationNode', locale, body, location: loc };
  }

  // ---- Metaclass ----

  private parseMetaclass(visibility?: AST.Visibility, isAbstract: boolean = false): AST.MetaclassDeclaration {
    const loc = this.current().location;
    this.expect(TokenType.KW_metaclass);
    const name = this.parseName();
    const specializations = this.parseSpecializationList();
    const members = this.parseBody();
    return {
      kind: 'MetaclassDeclaration',
      visibility, isAbstract, name, specializations, members, location: loc,
    };
  }

  // ---- Metadata Usage ----

  private parseMetadata(): AST.MetadataUsage {
    const loc = this.current().location;
    const isAt = this.match(TokenType.At);
    if (!isAt) this.expect(TokenType.KW_metadata);

    let name: string | undefined;
    const metaclass = this.parseQualifiedName();

    const about: AST.QualifiedName[] = [];
    if (this.match(TokenType.KW_about)) {
      about.push(this.parseQualifiedName());
      while (this.match(TokenType.Comma)) {
        about.push(this.parseQualifiedName());
      }
    }

    const members = this.parseBody();

    return {
      kind: 'MetadataUsage',
      name, metaclass, about, members, location: loc,
    };
  }

  // ---- Helper: Specialization List ----

  private parseSpecializationList(): AST.QualifiedName[] {
    const result: AST.QualifiedName[] = [];
    if (this.match(TokenType.ColonGt)) {
      result.push(this.parseQualifiedName());
      while (this.match(TokenType.Comma)) {
        result.push(this.parseQualifiedName());
      }
    }
    // Also check for 'subtype of' / 'specializes'
    while (this.match(TokenType.KW_subtype)) {
      result.push(this.parseQualifiedName());
      while (this.match(TokenType.Comma)) result.push(this.parseQualifiedName());
    }
    return result;
  }

  // ---- Helper: Parameter List ----

  private tryParseParameterList(): AST.FeatureDeclaration[] {
    if (!this.match(TokenType.LParen)) return [];
    const params: AST.FeatureDeclaration[] = [];
    if (!this.check(TokenType.RParen)) {
      params.push(this.parseParameterDecl());
      while (this.match(TokenType.Comma)) {
        params.push(this.parseParameterDecl());
      }
    }
    this.expect(TokenType.RParen);
    return params;
  }

  private parseParameterDecl(): AST.FeatureDeclaration {
    const loc = this.current().location;
    let direction: AST.FeatureDirection;
    if (this.match(TokenType.KW_in)) direction = 'in';
    else if (this.match(TokenType.KW_out)) direction = 'out';
    else if (this.match(TokenType.KW_inout)) direction = 'inout';

    let name: string | undefined;
    if (this.isNameStart() && this.peek(1).type === TokenType.Colon) {
      name = this.parseName();
    }

    const typings: AST.QualifiedName[] = [];
    if (this.match(TokenType.Colon)) {
      typings.push(this.parseQualifiedName());
    }

    const multiplicity = this.tryParseMultiplicityRange();

    let defaultValue: AST.Expression | undefined;
    if (this.match(TokenType.Eq)) {
      defaultValue = this.parseExpression();
    }

    return {
      kind: 'FeatureDeclaration',
      visibility: undefined,
      isAbstract: false,
      featureKind: 'feature',
      direction,
      isComposite: false, isPortion: false, isReadonly: false,
      isDerived: false, isOrdered: false, isNonunique: false,
      name, typings, subsets: [], redefines: [], references: [],
      multiplicity, defaultValue, members: [],
      location: loc,
    };
  }

  // ---- Multiplicity Range ----

  private tryParseMultiplicityRange(): AST.MultiplicityRange | undefined {
    if (!this.check(TokenType.LBracket)) return undefined;
    return this.parseMultiplicityRangeRequired();
  }

  private parseMultiplicityRangeRequired(): AST.MultiplicityRange {
    const loc = this.current().location;
    this.expect(TokenType.LBracket);

    if (this.match(TokenType.Star)) {
      this.expect(TokenType.RBracket);
      return {
        kind: 'MultiplicityRange',
        lower: { kind: 'LiteralExpression', literalType: 'integer', value: '0' },
        upper: { kind: 'LiteralExpression', literalType: 'integer', value: '*' },
        location: loc,
      };
    }

    const first = this.parseExpression();

    if (this.match(TokenType.DotDot)) {
      let upper: AST.Expression;
      if (this.match(TokenType.Star)) {
        upper = { kind: 'LiteralExpression', literalType: 'integer', value: '*' };
      } else {
        upper = this.parseExpression();
      }
      this.expect(TokenType.RBracket);
      return { kind: 'MultiplicityRange', lower: first, upper, location: loc };
    }

    this.expect(TokenType.RBracket);
    return { kind: 'MultiplicityRange', lower: first, upper: first, location: loc };
  }

  // ---- Expression Parsing (Pratt-style precedence climbing) ----

  private parseExpression(): AST.Expression {
    return this.parseConditional();
  }

  private parseConditional(): AST.Expression {
    if (this.match(TokenType.KW_if)) {
      const condition = this.parseOr();
      const thenExpr = this.parseConditional();
      let elseExpr: AST.Expression | undefined;
      if (this.match(TokenType.KW_else)) {
        elseExpr = this.parseConditional();
      }
      return {
        kind: 'IfExpression',
        condition, thenExpr, elseExpr,
      };
    }
    return this.parseImplies();
  }

  private parseImplies(): AST.Expression {
    let left = this.parseOr();
    while (this.match(TokenType.KW_implies)) {
      const right = this.parseOr();
      left = { kind: 'OperatorExpression', operator: 'implies', operands: [left, right] };
    }
    return left;
  }

  private parseOr(): AST.Expression {
    let left = this.parseXor();
    while (this.match(TokenType.KW_or) || this.match(TokenType.Pipe)) {
      const right = this.parseXor();
      left = { kind: 'OperatorExpression', operator: 'or', operands: [left, right] };
    }
    return left;
  }

  private parseXor(): AST.Expression {
    let left = this.parseAnd();
    while (this.match(TokenType.KW_xor)) {
      const right = this.parseAnd();
      left = { kind: 'OperatorExpression', operator: 'xor', operands: [left, right] };
    }
    return left;
  }

  private parseAnd(): AST.Expression {
    let left = this.parseEquality();
    while (this.match(TokenType.KW_and) || this.match(TokenType.Amp)) {
      const right = this.parseEquality();
      left = { kind: 'OperatorExpression', operator: 'and', operands: [left, right] };
    }
    return left;
  }

  private parseEquality(): AST.Expression {
    let left = this.parseComparison();
    while (true) {
      if (this.match(TokenType.EqEq)) {
        left = { kind: 'OperatorExpression', operator: '==', operands: [left, this.parseComparison()] };
      } else if (this.match(TokenType.BangEq)) {
        left = { kind: 'OperatorExpression', operator: '!=', operands: [left, this.parseComparison()] };
      } else if (this.match(TokenType.EqEqEq)) {
        left = { kind: 'OperatorExpression', operator: '===', operands: [left, this.parseComparison()] };
      } else if (this.match(TokenType.BangEqEq)) {
        left = { kind: 'OperatorExpression', operator: '!==', operands: [left, this.parseComparison()] };
      } else break;
    }
    return left;
  }

  private parseComparison(): AST.Expression {
    let left = this.parseAdditive();
    while (true) {
      if (this.match(TokenType.Lt)) {
        left = { kind: 'OperatorExpression', operator: '<', operands: [left, this.parseAdditive()] };
      } else if (this.match(TokenType.Gt)) {
        left = { kind: 'OperatorExpression', operator: '>', operands: [left, this.parseAdditive()] };
      } else if (this.match(TokenType.LtEq)) {
        left = { kind: 'OperatorExpression', operator: '<=', operands: [left, this.parseAdditive()] };
      } else if (this.match(TokenType.GtEq)) {
        left = { kind: 'OperatorExpression', operator: '>=', operands: [left, this.parseAdditive()] };
      } else if (this.match(TokenType.KW_istype)) {
        left = { kind: 'OperatorExpression', operator: 'istype', operands: [left, this.parseAdditive()] };
      } else if (this.match(TokenType.KW_hastype)) {
        left = { kind: 'OperatorExpression', operator: 'hastype', operands: [left, this.parseAdditive()] };
      } else if (this.match(TokenType.KW_as)) {
        left = { kind: 'OperatorExpression', operator: 'as', operands: [left, this.parseAdditive()] };
      } else break;
    }
    return left;
  }

  private parseAdditive(): AST.Expression {
    let left = this.parseMultiplicative();
    while (true) {
      if (this.match(TokenType.Plus)) {
        left = { kind: 'OperatorExpression', operator: '+', operands: [left, this.parseMultiplicative()] };
      } else if (this.match(TokenType.Minus)) {
        left = { kind: 'OperatorExpression', operator: '-', operands: [left, this.parseMultiplicative()] };
      } else break;
    }
    return left;
  }

  private parseMultiplicative(): AST.Expression {
    let left = this.parseExponent();
    while (true) {
      if (this.match(TokenType.Star)) {
        left = { kind: 'OperatorExpression', operator: '*', operands: [left, this.parseExponent()] };
      } else if (this.match(TokenType.Slash)) {
        left = { kind: 'OperatorExpression', operator: '/', operands: [left, this.parseExponent()] };
      } else if (this.match(TokenType.Percent)) {
        left = { kind: 'OperatorExpression', operator: '%', operands: [left, this.parseExponent()] };
      } else break;
    }
    return left;
  }

  private parseExponent(): AST.Expression {
    let left = this.parseUnary();
    if (this.match(TokenType.StarStar)) {
      const right = this.parseUnary();
      left = { kind: 'OperatorExpression', operator: '**', operands: [left, right] };
    }
    return left;
  }

  private parseUnary(): AST.Expression {
    if (this.match(TokenType.KW_not) || this.match(TokenType.Bang)) {
      return { kind: 'OperatorExpression', operator: 'not', operands: [this.parseUnary()] };
    }
    if (this.match(TokenType.Minus)) {
      return { kind: 'OperatorExpression', operator: '-', operands: [this.parseUnary()] };
    }
    if (this.match(TokenType.Tilde)) {
      return { kind: 'OperatorExpression', operator: '~', operands: [this.parseUnary()] };
    }
    return this.parsePostfix();
  }

  private parsePostfix(): AST.Expression {
    let expr = this.parsePrimary();

    // Feature chain: .name
    while (this.check(TokenType.Dot) && this.isNameNext(1)) {
      this.advance(); // .
      const feature = this.parseName();
      expr = { kind: 'FeatureChainExpression', source: expr, feature };
    }

    // Invocation: (args)
    if (this.check(TokenType.LParen) && expr.kind === 'NameExpression') {
      this.advance(); // (
      const args: AST.Expression[] = [];
      if (!this.check(TokenType.RParen)) {
        args.push(this.parseExpression());
        while (this.match(TokenType.Comma)) {
          args.push(this.parseExpression());
        }
      }
      this.expect(TokenType.RParen);
      return { kind: 'InvocationExpression', name: (expr as AST.NameExpression).name, arguments: args };
    }

    // Index/bracket: [expr]
    while (this.check(TokenType.LBracket)) {
      this.advance();
      const index = this.parseExpression();
      this.expect(TokenType.RBracket);
      expr = { kind: 'OperatorExpression', operator: '#', operands: [expr, index] };
    }

    return expr;
  }

  private parsePrimary(): AST.Expression {
    const tok = this.current();

    // Null
    if (this.match(TokenType.NullLiteral) || this.match(TokenType.KW_null)) {
      return { kind: 'NullExpression' };
    }

    // Boolean
    if (tok.type === TokenType.BooleanLiteral || tok.type === TokenType.KW_true || tok.type === TokenType.KW_false) {
      this.advance();
      return { kind: 'LiteralExpression', literalType: 'boolean', value: tok.value };
    }

    // Integer
    if (this.match(TokenType.IntegerLiteral)) {
      return { kind: 'LiteralExpression', literalType: 'integer', value: tok.value };
    }

    // Real
    if (this.match(TokenType.RealLiteral)) {
      return { kind: 'LiteralExpression', literalType: 'real', value: tok.value };
    }

    // String
    if (this.match(TokenType.StringLiteral)) {
      return { kind: 'LiteralExpression', literalType: 'string', value: tok.value };
    }

    // Parenthesized expression
    if (this.match(TokenType.LParen)) {
      const expr = this.parseExpression();
      this.expect(TokenType.RParen);
      return expr;
    }

    // Name expression
    if (this.isNameStart()) {
      const name = this.parseQualifiedName();
      return { kind: 'NameExpression', name };
    }

    throw new ParseError(
      `Unexpected token in expression: ${tok.type} ('${tok.value}')`,
      tok.location
    );
  }

  // workaround for 'for' in alias parsing (not a keyword)
  private expectForKeyword(): void {
    if (this.current().value === 'for') {
      this.advance();
    } else {
      throw new ParseError(`Expected 'for'`, this.current().location);
    }
  }
}
