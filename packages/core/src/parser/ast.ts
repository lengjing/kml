// ============================================================
// KerML Abstract Syntax Tree (AST) Node Definitions
// Covers all major KerML constructs per the specification
// ============================================================

import { SourceLocation } from '../lexer/token';

// ---- Base Types ----

export type Visibility = 'public' | 'private' | 'protected';
export type FeatureDirection = 'in' | 'out' | 'inout' | undefined;
export type PortionKind = 'composite' | 'portion' | 'reference' | undefined;

export interface ASTNode {
  kind: string;
  location?: SourceLocation;
}

// ---- Qualified Name ----

export interface QualifiedName extends ASTNode {
  kind: 'QualifiedName';
  segments: string[];
}

// ---- Root ----

export interface RootNamespace extends ASTNode {
  kind: 'RootNamespace';
  members: NamespaceMember[];
}

// ---- Namespace Members ----

export type NamespaceMember =
  | PackageDeclaration
  | ImportDeclaration
  | AliasMember
  | TypeDeclaration
  | ClassifierDeclaration
  | ClassDeclaration
  | StructDeclaration
  | AssociationDeclaration
  | DataTypeDeclaration
  | EnumDeclaration
  | FeatureDeclaration
  | BehaviorDeclaration
  | FunctionDeclaration
  | PredicateDeclaration
  | InteractionDeclaration
  | ConnectorDeclaration
  | BindingConnectorDeclaration
  | SuccessionDeclaration
  | MultiplicityDeclaration
  | SpecializationDeclaration
  | ConjugationDeclaration
  | DisjoiningDeclaration
  | CommentNode
  | DocumentationNode
  | MetadataUsage
  | MetaclassDeclaration
  | DependencyDeclaration
  | NamespaceDeclaration;

// ---- Package ----

export interface PackageDeclaration extends ASTNode {
  kind: 'PackageDeclaration';
  isLibrary: boolean;
  name: string;
  members: NamespaceMember[];
}

export interface NamespaceDeclaration extends ASTNode {
  kind: 'NamespaceDeclaration';
  name: string;
  members: NamespaceMember[];
}

// ---- Import ----

export interface ImportDeclaration extends ASTNode {
  kind: 'ImportDeclaration';
  visibility?: Visibility;
  isAll: boolean;
  isRecursive: boolean;
  qualifiedName: QualifiedName;
  isWildcard: boolean;  // ends with ::*
  filterCondition?: Expression;
}

// ---- Alias ----

export interface AliasMember extends ASTNode {
  kind: 'AliasMember';
  visibility?: Visibility;
  name: string;
  target: QualifiedName;
}

// ---- Dependency ----

export interface DependencyDeclaration extends ASTNode {
  kind: 'DependencyDeclaration';
  name?: string;
  clients: QualifiedName[];
  suppliers: QualifiedName[];
}

// ---- Multiplicity ----

export interface MultiplicityRange extends ASTNode {
  kind: 'MultiplicityRange';
  lower?: Expression;
  upper?: Expression; // '*' represented as special value
}

export interface MultiplicityDeclaration extends ASTNode {
  kind: 'MultiplicityDeclaration';
  name?: string;
  range: MultiplicityRange;
  featureTyping?: QualifiedName;
}

// ---- Type ----

export interface TypeDeclaration extends ASTNode {
  kind: 'TypeDeclaration';
  visibility?: Visibility;
  isAbstract: boolean;
  name: string;
  specializations: QualifiedName[];
  conjugates: QualifiedName[];
  disjointFrom: QualifiedName[];
  unions: QualifiedName[];
  intersects: QualifiedName[];
  differences: QualifiedName[];
  multiplicity?: MultiplicityRange;
  members: NamespaceMember[];
}

// ---- Classifier ----

export interface ClassifierDeclaration extends ASTNode {
  kind: 'ClassifierDeclaration';
  visibility?: Visibility;
  isAbstract: boolean;
  name: string;
  specializations: QualifiedName[];
  multiplicity?: MultiplicityRange;
  members: NamespaceMember[];
}

// ---- Class ----

export interface ClassDeclaration extends ASTNode {
  kind: 'ClassDeclaration';
  visibility?: Visibility;
  isAbstract: boolean;
  name: string;
  specializations: QualifiedName[];
  multiplicity?: MultiplicityRange;
  members: NamespaceMember[];
}

// ---- Struct ----

export interface StructDeclaration extends ASTNode {
  kind: 'StructDeclaration';
  visibility?: Visibility;
  isAbstract: boolean;
  name: string;
  specializations: QualifiedName[];
  multiplicity?: MultiplicityRange;
  members: NamespaceMember[];
}

// ---- Association ----

export interface AssociationDeclaration extends ASTNode {
  kind: 'AssociationDeclaration';
  visibility?: Visibility;
  isAbstract: boolean;
  isStruct: boolean;
  name: string;
  specializations: QualifiedName[];
  members: NamespaceMember[];
}

// ---- DataType ----

export interface DataTypeDeclaration extends ASTNode {
  kind: 'DataTypeDeclaration';
  visibility?: Visibility;
  isAbstract: boolean;
  name: string;
  specializations: QualifiedName[];
  members: NamespaceMember[];
}

// ---- Enum ----

export interface EnumDeclaration extends ASTNode {
  kind: 'EnumDeclaration';
  visibility?: Visibility;
  name: string;
  specializations: QualifiedName[];
  members: EnumMember[];
}

export interface EnumMember extends ASTNode {
  kind: 'EnumMember';
  name: string;
}

// ---- Feature ----

export interface FeatureDeclaration extends ASTNode {
  kind: 'FeatureDeclaration';
  visibility?: Visibility;
  isAbstract: boolean;
  featureKind: 'feature' | 'attribute' | 'item' | 'part' | 'port' | 'connection' |
               'flow' | 'interface' | 'allocation' | 'reference' | 'end';
  direction?: FeatureDirection;
  isComposite: boolean;
  isPortion: boolean;
  isReadonly: boolean;
  isDerived: boolean;
  isOrdered: boolean;
  isNonunique: boolean;
  name?: string;
  typings: QualifiedName[];
  subsets: QualifiedName[];
  redefines: QualifiedName[];
  references: QualifiedName[];
  multiplicity?: MultiplicityRange;
  defaultValue?: Expression;
  members: NamespaceMember[];
}

// ---- Behavior ----

export interface BehaviorDeclaration extends ASTNode {
  kind: 'BehaviorDeclaration';
  visibility?: Visibility;
  isAbstract: boolean;
  name: string;
  specializations: QualifiedName[];
  parameters: FeatureDeclaration[];
  members: NamespaceMember[];
}

// ---- Step (Usage of Behavior) ----

export interface StepDeclaration extends ASTNode {
  kind: 'StepDeclaration';
  visibility?: Visibility;
  name?: string;
  typings: QualifiedName[];
  members: NamespaceMember[];
}

// ---- Function ----

export interface FunctionDeclaration extends ASTNode {
  kind: 'FunctionDeclaration';
  visibility?: Visibility;
  isAbstract: boolean;
  name: string;
  specializations: QualifiedName[];
  parameters: FeatureDeclaration[];
  returnType?: QualifiedName;
  resultExpression?: Expression;
  members: NamespaceMember[];
}

// ---- Predicate ----

export interface PredicateDeclaration extends ASTNode {
  kind: 'PredicateDeclaration';
  visibility?: Visibility;
  isAbstract: boolean;
  name: string;
  specializations: QualifiedName[];
  parameters: FeatureDeclaration[];
  members: NamespaceMember[];
}

// ---- Interaction ----

export interface InteractionDeclaration extends ASTNode {
  kind: 'InteractionDeclaration';
  visibility?: Visibility;
  isAbstract: boolean;
  name: string;
  specializations: QualifiedName[];
  members: NamespaceMember[];
}

// ---- Connector ----

export interface ConnectorDeclaration extends ASTNode {
  kind: 'ConnectorDeclaration';
  visibility?: Visibility;
  name?: string;
  typings: QualifiedName[];
  ends: ConnectorEnd[];
  members: NamespaceMember[];
}

export interface ConnectorEnd extends ASTNode {
  kind: 'ConnectorEnd';
  name?: string;
  reference: QualifiedName;
  multiplicity?: MultiplicityRange;
}

// ---- Binding Connector ----

export interface BindingConnectorDeclaration extends ASTNode {
  kind: 'BindingConnectorDeclaration';
  visibility?: Visibility;
  name?: string;
  source: QualifiedName;
  target: QualifiedName;
}

// ---- Succession ----

export interface SuccessionDeclaration extends ASTNode {
  kind: 'SuccessionDeclaration';
  visibility?: Visibility;
  name?: string;
  source: QualifiedName;
  target: QualifiedName;
  guardCondition?: Expression;
}

// ---- Specialization (explicit) ----

export interface SpecializationDeclaration extends ASTNode {
  kind: 'SpecializationDeclaration';
  specific: QualifiedName;
  general: QualifiedName;
}

// ---- Conjugation ----

export interface ConjugationDeclaration extends ASTNode {
  kind: 'ConjugationDeclaration';
  conjugated: QualifiedName;
  original: QualifiedName;
}

// ---- Disjoining ----

export interface DisjoiningDeclaration extends ASTNode {
  kind: 'DisjoiningDeclaration';
  type1: QualifiedName;
  type2: QualifiedName;
}

// ---- Comment / Documentation ----

export interface CommentNode extends ASTNode {
  kind: 'CommentNode';
  name?: string;
  about: QualifiedName[];
  locale?: string;
  body: string;
}

export interface DocumentationNode extends ASTNode {
  kind: 'DocumentationNode';
  locale?: string;
  body: string;
}

// ---- Metadata ----

export interface MetaclassDeclaration extends ASTNode {
  kind: 'MetaclassDeclaration';
  visibility?: Visibility;
  isAbstract: boolean;
  name: string;
  specializations: QualifiedName[];
  members: NamespaceMember[];
}

export interface MetadataUsage extends ASTNode {
  kind: 'MetadataUsage';
  name?: string;
  metaclass: QualifiedName;
  about: QualifiedName[];
  members: NamespaceMember[];
}

// ---- Expressions ----

export type Expression =
  | LiteralExpression
  | NameExpression
  | OperatorExpression
  | InvocationExpression
  | BodyExpression
  | IfExpression
  | FeatureChainExpression
  | CollectExpression
  | SelectExpression
  | NullExpression;

export interface LiteralExpression extends ASTNode {
  kind: 'LiteralExpression';
  literalType: 'integer' | 'real' | 'string' | 'boolean';
  value: string;
}

export interface NullExpression extends ASTNode {
  kind: 'NullExpression';
}

export interface NameExpression extends ASTNode {
  kind: 'NameExpression';
  name: QualifiedName;
}

export interface OperatorExpression extends ASTNode {
  kind: 'OperatorExpression';
  operator: string;
  operands: Expression[];
}

export interface InvocationExpression extends ASTNode {
  kind: 'InvocationExpression';
  name: QualifiedName;
  arguments: Expression[];
}

export interface BodyExpression extends ASTNode {
  kind: 'BodyExpression';
  body: Expression;
}

export interface IfExpression extends ASTNode {
  kind: 'IfExpression';
  condition: Expression;
  thenExpr: Expression;
  elseExpr?: Expression;
}

export interface FeatureChainExpression extends ASTNode {
  kind: 'FeatureChainExpression';
  source: Expression;
  feature: string;
}

export interface CollectExpression extends ASTNode {
  kind: 'CollectExpression';
  source: Expression;
  body: Expression;
}

export interface SelectExpression extends ASTNode {
  kind: 'SelectExpression';
  source: Expression;
  body: Expression;
}