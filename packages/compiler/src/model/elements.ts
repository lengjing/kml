// ============================================================
// KerML Semantic Model Elements
// Represents the in-memory model after parsing and resolution
// ============================================================

import { v4 as uuidv4 } from 'uuid';

export type ElementId = string;

export abstract class Element {
  readonly elementId: ElementId;
  metaclass: string;
  name?: string;
  qualifiedName?: string;
  owner?: Element;
  ownedElements: Element[] = [];
  documentation: string[] = [];
  annotations: MetadataFeature[] = [];

  constructor(metaclass: string, name?: string) {
    this.elementId = uuidv4();
    this.metaclass = metaclass;
    this.name = name;
  }

  addOwnedElement(el: Element): void {
    el.owner = this;
    this.ownedElements.push(el);
  }

  resolveQualifiedName(): string {
    if (this.qualifiedName) return this.qualifiedName;
    const parts: string[] = [];
    let current: Element | undefined = this;
    while (current) {
      if (current.name) parts.unshift(current.name);
      current = current.owner;
    }
    this.qualifiedName = parts.join('::');
    return this.qualifiedName;
  }
}

// ---- Relationships ----

export abstract class Relationship extends Element {
  source: Element[] = [];
  target: Element[] = [];

  constructor(metaclass: string, name?: string) {
    super(metaclass, name);
  }
}

// ---- Namespace ----

export class Namespace extends Element {
  imports: Import[] = [];
  members: Element[] = [];

  constructor(name?: string) {
    super('Namespace', name);
  }

  addMember(el: Element): void {
    this.members.push(el);
    this.addOwnedElement(el);
  }
}

// ---- Package ----

export class Package extends Namespace {
  isLibrary: boolean = false;

  constructor(name: string, isLibrary: boolean = false) {
    super(name);
    this.metaclass = isLibrary ? 'LibraryPackage' : 'Package';
    this.isLibrary = isLibrary;
  }
}

// ---- Import ----

export class Import extends Relationship {
  importedNamespace?: Namespace;
  isWildcard: boolean = false;
  isAll: boolean = false;
  isRecursive: boolean = false;
  visibility: string = 'public';

  constructor() {
    super('Import');
  }
}

// ---- Dependency ----

export class Dependency extends Relationship {
  clients: Element[] = [];
  suppliers: Element[] = [];

  constructor(name?: string) {
    super('Dependency', name);
  }
}

// ---- Type ----

export class Type extends Namespace {
  isAbstract: boolean = false;
  isSufficient: boolean = false;
  multiplicity?: Multiplicity;
  ownedSpecializations: Specialization[] = [];
  ownedConjugation?: Conjugation;
  ownedDisjoinings: Disjoining[] = [];
  ownedUnionings: Unioning[] = [];
  ownedIntersectings: Intersecting[] = [];
  ownedDifferencings: Differencing[] = [];
  ownedFeatures: Feature[] = [];

  constructor(name?: string) {
    super(name);
    this.metaclass = 'Type';
  }

  addFeature(f: Feature): void {
    this.ownedFeatures.push(f);
    this.addMember(f);
  }

  getAllSupertypes(): Type[] {
    const result: Type[] = [];
    for (const s of this.ownedSpecializations) {
      if (s.general) {
        result.push(s.general);
        result.push(...s.general.getAllSupertypes());
      }
    }
    return result;
  }
}

// ---- Classifier ----

export class Classifier extends Type {
  constructor(name?: string) {
    super(name);
    this.metaclass = 'Classifier';
  }
}

// ---- Class ----

export class Class extends Classifier {
  constructor(name?: string) {
    super(name);
    this.metaclass = 'Class';
  }
}

// ---- Structure ----

export class Structure extends Class {
  constructor(name?: string) {
    super(name);
    this.metaclass = 'Structure';
  }
}

// ---- Association ----

export class Association extends Classifier {
  isStruct: boolean = false;

  constructor(name?: string, isStruct: boolean = false) {
    super(name);
    this.metaclass = isStruct ? 'AssociationStructure' : 'Association';
    this.isStruct = isStruct;
  }
}

// ---- DataType ----

export class DataType extends Classifier {
  constructor(name?: string) {
    super(name);
    this.metaclass = 'DataType';
  }
}

// ---- Enumeration ----

export class Enumeration extends DataType {
  variants: EnumerationMember[] = [];

  constructor(name?: string) {
    super(name);
    this.metaclass = 'Enumeration';
  }
}

export class EnumerationMember extends Element {
  constructor(name: string) {
    super('EnumerationMember', name);
  }
}

// ---- Feature ----

export class Feature extends Type {
  direction?: 'in' | 'out' | 'inout';
  isComposite: boolean = false;
  isPortion: boolean = false;
  isReadonly: boolean = false;
  isDerived: boolean = false;
  isEnd: boolean = false;
  isOrdered: boolean = false;
  isUnique: boolean = true;
  ownedTypings: FeatureTyping[] = [];
  ownedSubsettings: Subsetting[] = [];
  ownedRedefinitions: Redefinition[] = [];
  ownedReferenceSubsettings: ReferenceSubsetting[] = [];
  defaultValue?: Expression;

  constructor(name?: string) {
    super(name);
    this.metaclass = 'Feature';
  }
}

// ---- Specialized Feature Types ----

export class AttributeFeature extends Feature {
  constructor(name?: string) { super(name); this.metaclass = 'AttributeUsage'; }
}

export class ItemFeature extends Feature {
  constructor(name?: string) { super(name); this.metaclass = 'ItemUsage'; }
}

export class PartFeature extends Feature {
  constructor(name?: string) { super(name); this.metaclass = 'PartUsage'; this.isComposite = true; }
}

export class PortFeature extends Feature {
  constructor(name?: string) { super(name); this.metaclass = 'PortUsage'; }
}

export class ConnectionFeature extends Feature {
  constructor(name?: string) { super(name); this.metaclass = 'ConnectionUsage'; }
}

export class FlowFeature extends Feature {
  constructor(name?: string) { super(name); this.metaclass = 'FlowConnectionUsage'; }
}

export class InterfaceFeature extends Feature {
  constructor(name?: string) { super(name); this.metaclass = 'InterfaceUsage'; }
}

export class AllocationFeature extends Feature {
  constructor(name?: string) { super(name); this.metaclass = 'AllocationUsage'; }
}

export class EndFeature extends Feature {
  constructor(name?: string) { super(name); this.metaclass = 'EndFeature'; this.isEnd = true; }
}

// ---- Behavior ----

export class Behavior extends Class {
  parameters: Feature[] = [];

  constructor(name?: string) {
    super(name);
    this.metaclass = 'Behavior';
  }
}

export class Step extends Feature {
  constructor(name?: string) { super(name); this.metaclass = 'Step'; }
}

// ---- Function ----

export class Function extends Behavior {
  result?: Feature;
  resultExpression?: Expression;

  constructor(name?: string) {
    super(name);
    this.metaclass = 'Function';
  }
}

export class Expression extends Feature {
  constructor(name?: string) { super(name); this.metaclass = 'Expression'; }
}

// ---- Predicate ----

export class Predicate extends Function {
  constructor(name?: string) {
    super(name);
    this.metaclass = 'Predicate';
  }
}

// ---- Interaction ----

export class Interaction extends Association {
  constructor(name?: string) {
    super(name);
    this.metaclass = 'Interaction';
  }
}

// ---- Connector ----

export class Connector extends Feature {
  connectorEnds: ConnectorEnd[] = [];

  constructor(name?: string) {
    super(name);
    this.metaclass = 'Connector';
  }
}

export class ConnectorEnd extends Feature {
  referencedFeature?: Feature;
  constructor(name?: string) { super(name); this.metaclass = 'ConnectorEnd'; }
}

// ---- Binding Connector ----

export class BindingConnector extends Connector {
  constructor(name?: string) {
    super(name);
    this.metaclass = 'BindingConnector';
  }
}

// ---- Succession ----

export class Succession extends Connector {
  guardExpression?: Expression;

  constructor(name?: string) {
    super(name);
    this.metaclass = 'Succession';
  }
}

// ---- Multiplicity ----

export class Multiplicity extends Feature {
  lowerBound?: number;
  upperBound?: number | '*';

  constructor(name?: string) {
    super(name);
    this.metaclass = 'Multiplicity';
  }
}

// ---- Relationships (concrete) ----

export class Specialization extends Relationship {
  specific?: Type;
  general?: Type;

  constructor() { super('Specialization'); }
}

export class Conjugation extends Relationship {
  conjugatedType?: Type;
  originalType?: Type;

  constructor() { super('Conjugation'); }
}

export class Disjoining extends Relationship {
  disjoiningType?: Type;
  disjoinedType?: Type;

  constructor() { super('Disjoining'); }
}

export class Unioning extends Relationship {
  unioningType?: Type;

  constructor() { super('Unioning'); }
}

export class Intersecting extends Relationship {
  intersectingType?: Type;

  constructor() { super('Intersecting'); }
}

export class Differencing extends Relationship {
  differencingType?: Type;

  constructor() { super('Differencing'); }
}

export class FeatureTyping extends Relationship {
  typedFeature?: Feature;
  featureType?: Type;

  constructor() { super('FeatureTyping'); }
}

export class Subsetting extends Relationship {
  subsettingFeature?: Feature;
  subsettedFeature?: Feature;

  constructor() { super('Subsetting'); }
}

export class Redefinition extends Subsetting {
  redefiningFeature?: Feature;
  redefinedFeature?: Feature;

  constructor() { super(); this.metaclass = 'Redefinition'; }
}

export class ReferenceSubsetting extends Subsetting {
  constructor() { super(); this.metaclass = 'ReferenceSubsetting'; }
}

// ---- Comment & Documentation ----

export class Comment extends Element {
  body: string = '';
  aboutElements: Element[] = [];
  locale?: string;

  constructor(name?: string) { super('Comment', name); }
}

export class Documentation extends Comment {
  constructor() { super(); this.metaclass = 'Documentation'; }
}

// ---- Metaclass & Metadata ----

export class Metaclass extends Structure {
  constructor(name?: string) { super(name); this.metaclass = 'Metaclass'; }
}

export class MetadataFeature extends Feature {
  metaclassRef?: Metaclass;
  aboutElements: Element[] = [];

  constructor(name?: string) { super(name); this.metaclass = 'MetadataFeature'; }
}

// ---- Alias ----

export class AliasElement extends Relationship {
  aliasedElement?: Element;

  constructor(name: string) {
    super('Membership', name);
  }
}