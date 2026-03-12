// ============================================================
// KerML Model Builder
// Transforms AST into KerML semantic model elements
// ============================================================

// ============================================================
// KerML Model Builder (continued)
// ============================================================

import * as AST from '../parser/ast';
import * as M from './elements';

export interface UnresolvedRef {
  kind: 'import' | 'specialization' | 'typing' | 'subsetting' | 'redefinition' |
        'reference' | 'conjugation' | 'disjoining' | 'unioning' | 'intersecting' |
        'differencing' | 'connector-end' | 'binding-source' | 'binding-target' |
        'succession-source' | 'succession-target' | 'alias' | 'dependency-client' |
        'dependency-supplier' | 'metadata-metaclass' | 'metadata-about' | 'comment-about';
  qualifiedName: string;
  element: M.Element;
  parent: M.Namespace;
  targetSlot?: string; // 用于指定应该设置到哪个属性上
}

export class ModelBuilder {
  private rootPackage: M.Package;
  private unresolvedRefs: UnresolvedRef[] = [];

  constructor() {
    this.rootPackage = new M.Package('<root>');
  }

  build(ast: AST.RootNamespace): M.Package {
    for (const member of ast.members) {
      const el = this.buildMember(member, this.rootPackage);
      if (el) {
        this.rootPackage.addMember(el);
      }
    }
    return this.rootPackage;
  }

  getUnresolvedRefs(): UnresolvedRef[] {
    return this.unresolvedRefs;
  }

  getRootPackage(): M.Package {
    return this.rootPackage;
  }

  private buildMember(node: AST.NamespaceMember, parent: M.Namespace): M.Element | null {
    switch (node.kind) {
      case 'PackageDeclaration': return this.buildPackage(node, parent);
      case 'NamespaceDeclaration': return this.buildNamespace(node, parent);
      case 'ImportDeclaration': return this.buildImport(node, parent);
      case 'AliasMember': return this.buildAlias(node, parent);
      case 'DependencyDeclaration': return this.buildDependency(node, parent);
      case 'TypeDeclaration': return this.buildType(node, parent);
      case 'ClassifierDeclaration': return this.buildClassifier(node, parent);
      case 'ClassDeclaration': return this.buildClass(node, parent);
      case 'StructDeclaration': return this.buildStruct(node, parent);
      case 'AssociationDeclaration': return this.buildAssociation(node, parent);
      case 'DataTypeDeclaration': return this.buildDataType(node, parent);
      case 'EnumDeclaration': return this.buildEnum(node, parent);
      case 'FeatureDeclaration': return this.buildFeature(node, parent);
      case 'BehaviorDeclaration': return this.buildBehavior(node, parent);
      case 'FunctionDeclaration': return this.buildFunction(node, parent);
      case 'PredicateDeclaration': return this.buildPredicate(node, parent);
      case 'InteractionDeclaration': return this.buildInteraction(node, parent);
      case 'ConnectorDeclaration': return this.buildConnector(node, parent);
      case 'BindingConnectorDeclaration': return this.buildBindingConnector(node, parent);
      case 'SuccessionDeclaration': return this.buildSuccession(node, parent);
      case 'SpecializationDeclaration': return this.buildSpecialization(node, parent);
      case 'ConjugationDeclaration': return this.buildConjugation(node, parent);
      case 'DisjoiningDeclaration': return this.buildDisjoining(node, parent);
      case 'MultiplicityDeclaration': return this.buildMultiplicity(node, parent);
      case 'CommentNode': return this.buildComment(node, parent);
      case 'DocumentationNode': return this.buildDocumentation(node, parent);
      case 'MetaclassDeclaration': return this.buildMetaclass(node, parent);
      case 'MetadataUsage': return this.buildMetadata(node, parent);
      default: return null;
    }
  }

  // ---- Package ----

  private buildPackage(node: AST.PackageDeclaration, parent: M.Namespace): M.Package {
    const pkg = new M.Package(node.name, node.isLibrary);
    for (const member of node.members) {
      const el = this.buildMember(member, pkg);
      if (el) pkg.addMember(el);
    }
    return pkg;
  }

  // ---- Namespace ----

  private buildNamespace(node: AST.NamespaceDeclaration, parent: M.Namespace): M.Namespace {
    const ns = new M.Namespace(node.name);
    for (const member of node.members) {
      const el = this.buildMember(member, ns);
      if (el) ns.addMember(el);
    }
    return ns;
  }

  // ---- Import ----

  private buildImport(node: AST.ImportDeclaration, parent: M.Namespace): M.Import {
    const imp = new M.Import();
    imp.isAll = node.isAll;
    imp.isRecursive = node.isRecursive;
    imp.isWildcard = node.isWildcard;
    imp.visibility = node.visibility ?? 'public';

    this.unresolvedRefs.push({
      kind: 'import',
      qualifiedName: node.qualifiedName.segments.join('::'),
      element: imp,
      parent,
    });

    if (parent instanceof M.Namespace) {
      parent.imports.push(imp);
    }
    return imp;
  }

  // ---- Alias ----

  private buildAlias(node: AST.AliasMember, parent: M.Namespace): M.AliasElement {
    const alias = new M.AliasElement(node.name);

    this.unresolvedRefs.push({
      kind: 'alias',
      qualifiedName: node.target.segments.join('::'),
      element: alias,
      parent,
    });

    return alias;
  }

  // ---- Dependency ----

  private buildDependency(node: AST.DependencyDeclaration, parent: M.Namespace): M.Dependency {
    const dep = new M.Dependency(node.name);

    for (const client of node.clients) {
      this.unresolvedRefs.push({
        kind: 'dependency-client',
        qualifiedName: client.segments.join('::'),
        element: dep,
        parent,
      });
    }

    for (const supplier of node.suppliers) {
      this.unresolvedRefs.push({
        kind: 'dependency-supplier',
        qualifiedName: supplier.segments.join('::'),
        element: dep,
        parent,
      });
    }

    return dep;
  }

  // ---- Type ----

  private buildType(node: AST.TypeDeclaration, parent: M.Namespace): M.Type {
    const type = new M.Type(node.name);
    type.isAbstract = node.isAbstract;

    // Multiplicity
    if (node.multiplicity) {
      type.multiplicity = this.buildMultiplicityRange(node.multiplicity);
      type.addOwnedElement(type.multiplicity);
    }

    // Specializations
    for (const spec of node.specializations) {
      const specialization = new M.Specialization();
      specialization.specific = type;
      type.ownedSpecializations.push(specialization);
      type.addOwnedElement(specialization);

      this.unresolvedRefs.push({
        kind: 'specialization',
        qualifiedName: spec.segments.join('::'),
        element: specialization,
        parent,
        targetSlot: 'general',
      });
    }

    // Conjugation
    if (node.conjugates.length > 0) {
      const conj = new M.Conjugation();
      conj.conjugatedType = type;
      type.ownedConjugation = conj;
      type.addOwnedElement(conj);

      this.unresolvedRefs.push({
        kind: 'conjugation',
        qualifiedName: node.conjugates[0].segments.join('::'),
        element: conj,
        parent,
        targetSlot: 'originalType',
      });
    }

    // Disjoinings
    for (const d of node.disjointFrom) {
      const disj = new M.Disjoining();
      disj.disjoiningType = type;
      type.ownedDisjoinings.push(disj);
      type.addOwnedElement(disj);

      this.unresolvedRefs.push({
        kind: 'disjoining',
        qualifiedName: d.segments.join('::'),
        element: disj,
        parent,
        targetSlot: 'disjoinedType',
      });
    }

    // Unionings
    for (const u of node.unions) {
      const uni = new M.Unioning();
      type.ownedUnionings.push(uni);
      type.addOwnedElement(uni);

      this.unresolvedRefs.push({
        kind: 'unioning',
        qualifiedName: u.segments.join('::'),
        element: uni,
        parent,
        targetSlot: 'unioningType',
      });
    }

    // Intersectings
    for (const i of node.intersects) {
      const inter = new M.Intersecting();
      type.ownedIntersectings.push(inter);
      type.addOwnedElement(inter);

      this.unresolvedRefs.push({
        kind: 'intersecting',
        qualifiedName: i.segments.join('::'),
        element: inter,
        parent,
        targetSlot: 'intersectingType',
      });
    }

    // Differencings
    for (const d of node.differences) {
      const diff = new M.Differencing();
      type.ownedDifferencings.push(diff);
      type.addOwnedElement(diff);

      this.unresolvedRefs.push({
        kind: 'differencing',
        qualifiedName: d.segments.join('::'),
        element: diff,
        parent,
        targetSlot: 'differencingType',
      });
    }

    // Members
    for (const member of node.members) {
      const el = this.buildMember(member, type);
      if (el) type.addMember(el);
    }

    return type;
  }

  // ---- Classifier ----

  private buildClassifier(node: AST.ClassifierDeclaration, parent: M.Namespace): M.Classifier {
    const cls = new M.Classifier(node.name);
    cls.isAbstract = node.isAbstract;

    if (node.multiplicity) {
      cls.multiplicity = this.buildMultiplicityRange(node.multiplicity);
      cls.addOwnedElement(cls.multiplicity);
    }

    this.buildSpecializationsForType(cls, node.specializations, parent);
    this.buildMembers(cls, node.members, parent);

    return cls;
  }

  // ---- Class ----

  private buildClass(node: AST.ClassDeclaration, parent: M.Namespace): M.Class {
    const cls = new M.Class(node.name);
    cls.isAbstract = node.isAbstract;

    if (node.multiplicity) {
      cls.multiplicity = this.buildMultiplicityRange(node.multiplicity);
      cls.addOwnedElement(cls.multiplicity);
    }

    this.buildSpecializationsForType(cls, node.specializations, parent);
    this.buildMembers(cls, node.members, parent);

    return cls;
  }

  // ---- Struct ----

  private buildStruct(node: AST.StructDeclaration, parent: M.Namespace): M.Structure {
    const s = new M.Structure(node.name);
    s.isAbstract = node.isAbstract;

    if (node.multiplicity) {
      s.multiplicity = this.buildMultiplicityRange(node.multiplicity);
      s.addOwnedElement(s.multiplicity);
    }

    this.buildSpecializationsForType(s, node.specializations, parent);
    this.buildMembers(s, node.members, parent);

    return s;
  }

  // ---- Association ----

  private buildAssociation(node: AST.AssociationDeclaration, parent: M.Namespace): M.Association {
    const assoc = new M.Association(node.name, node.isStruct);
    assoc.isAbstract = node.isAbstract;

    this.buildSpecializationsForType(assoc, node.specializations, parent);
    this.buildMembers(assoc, node.members, parent);

    return assoc;
  }

  // ---- DataType ----

  private buildDataType(node: AST.DataTypeDeclaration, parent: M.Namespace): M.DataType {
    const dt = new M.DataType(node.name);
    dt.isAbstract = node.isAbstract;

    this.buildSpecializationsForType(dt, node.specializations, parent);
    this.buildMembers(dt, node.members, parent);

    return dt;
  }

  // ---- Enum ----

  private buildEnum(node: AST.EnumDeclaration, parent: M.Namespace): M.Enumeration {
    const en = new M.Enumeration(node.name);

    this.buildSpecializationsForType(en, node.specializations, parent);

    for (const member of node.members) {
      const em = new M.EnumerationMember(member.name);
      en.variants.push(em);
      en.addOwnedElement(em);
    }

    return en;
  }

  // ---- Feature ----

  private buildFeature(node: AST.FeatureDeclaration, parent: M.Namespace): M.Feature {
    let feature: M.Feature;

    switch (node.featureKind) {
      case 'attribute':
        feature = new M.AttributeFeature(node.name);
        break;
      case 'item':
        feature = new M.ItemFeature(node.name);
        break;
      case 'part':
        feature = new M.PartFeature(node.name);
        break;
      case 'port':
        feature = new M.PortFeature(node.name);
        break;
      case 'connection':
        feature = new M.ConnectionFeature(node.name);
        break;
      case 'flow':
        feature = new M.FlowFeature(node.name);
        break;
      case 'interface':
        feature = new M.InterfaceFeature(node.name);
        break;
      case 'allocation':
        feature = new M.AllocationFeature(node.name);
        break;
      case 'end':
        feature = new M.EndFeature(node.name);
        break;
      case 'reference':
        feature = new M.Feature(node.name);
        feature.metaclass = 'ReferenceUsage';
        break;
      default:
        feature = new M.Feature(node.name);
        break;
    }

    feature.isAbstract = node.isAbstract;
    feature.direction = node.direction;
    feature.isComposite = node.isComposite;
    feature.isPortion = node.isPortion;
    feature.isReadonly = node.isReadonly;
    feature.isDerived = node.isDerived;
    feature.isOrdered = node.isOrdered;
    feature.isUnique = !node.isNonunique;

    // Multiplicity
    if (node.multiplicity) {
      feature.multiplicity = this.buildMultiplicityRange(node.multiplicity);
      feature.addOwnedElement(feature.multiplicity);
    }

    // Typings
    for (const typing of node.typings) {
      const ft = new M.FeatureTyping();
      ft.typedFeature = feature;
      feature.ownedTypings.push(ft);
      feature.addOwnedElement(ft);

      this.unresolvedRefs.push({
        kind: 'typing',
        qualifiedName: typing.segments.join('::'),
        element: ft,
        parent,
        targetSlot: 'featureType',
      });
    }

    // Subsettings
    for (const sub of node.subsets) {
      const ss = new M.Subsetting();
      ss.subsettingFeature = feature;
      feature.ownedSubsettings.push(ss);
      feature.addOwnedElement(ss);

      this.unresolvedRefs.push({
        kind: 'subsetting',
        qualifiedName: sub.segments.join('::'),
        element: ss,
        parent,
        targetSlot: 'subsettedFeature',
      });
    }

    // Redefinitions
    for (const redef of node.redefines) {
      const rd = new M.Redefinition();
      rd.redefiningFeature = feature;
      rd.subsettingFeature = feature;
      feature.ownedRedefinitions.push(rd);
      feature.addOwnedElement(rd);

      this.unresolvedRefs.push({
        kind: 'redefinition',
        qualifiedName: redef.segments.join('::'),
        element: rd,
        parent,
        targetSlot: 'redefinedFeature',
      });
    }

    // References
    for (const ref of node.references) {
      const rs = new M.ReferenceSubsetting();
      rs.subsettingFeature = feature;
      feature.ownedReferenceSubsettings.push(rs);
      feature.addOwnedElement(rs);

      this.unresolvedRefs.push({
        kind: 'reference',
        qualifiedName: ref.segments.join('::'),
        element: rs,
        parent,
        targetSlot: 'subsettedFeature',
      });
    }

    // Default value
    if (node.defaultValue) {
      feature.defaultValue = this.buildExpressionElement(node.defaultValue);
    }

    // Members
    for (const member of node.members) {
      const el = this.buildMember(member, feature);
      if (el) feature.addMember(el);
    }

    // If parent is a Type, register as owned feature
    if (parent instanceof M.Type) {
      parent.addFeature(feature);
    }

    return feature;
  }

  // ---- Behavior ----

  private buildBehavior(node: AST.BehaviorDeclaration, parent: M.Namespace): M.Behavior {
    const beh = new M.Behavior(node.name);
    beh.isAbstract = node.isAbstract;

    this.buildSpecializationsForType(beh, node.specializations, parent);

    // Parameters
    for (const param of node.parameters) {
      const p = this.buildFeature(param, beh);
      beh.parameters.push(p);
    }

    this.buildMembers(beh, node.members, parent);

    return beh;
  }

  // ---- Function ----

  private buildFunction(node: AST.FunctionDeclaration, parent: M.Namespace): M.Function {
    const fn = new M.Function(node.name);
    fn.isAbstract = node.isAbstract;

    this.buildSpecializationsForType(fn, node.specializations, parent);

    // Parameters
    for (const param of node.parameters) {
      const p = this.buildFeature(param, fn);
      fn.parameters.push(p);
    }

    // Return type
    if (node.returnType) {
      const resultFeature = new M.Feature('result');
      const ft = new M.FeatureTyping();
      ft.typedFeature = resultFeature;
      resultFeature.ownedTypings.push(ft);
      resultFeature.addOwnedElement(ft);
      fn.result = resultFeature;
      fn.addOwnedElement(resultFeature);

      this.unresolvedRefs.push({
        kind: 'typing',
        qualifiedName: node.returnType.segments.join('::'),
        element: ft,
        parent,
        targetSlot: 'featureType',
      });
    }

    // Result expression
    if (node.resultExpression) {
      fn.resultExpression = this.buildExpressionElement(node.resultExpression);
    }

    this.buildMembers(fn, node.members, parent);

    return fn;
  }

  // ---- Predicate ----

  private buildPredicate(node: AST.PredicateDeclaration, parent: M.Namespace): M.Predicate {
    const pred = new M.Predicate(node.name);
    pred.isAbstract = node.isAbstract;

    this.buildSpecializationsForType(pred, node.specializations, parent);

    for (const param of node.parameters) {
      const p = this.buildFeature(param, pred);
      pred.parameters.push(p);
    }

    this.buildMembers(pred, node.members, parent);

    return pred;
  }

  // ---- Interaction ----

  private buildInteraction(node: AST.InteractionDeclaration, parent: M.Namespace): M.Interaction {
    const inter = new M.Interaction(node.name);
    inter.isAbstract = node.isAbstract;

    this.buildSpecializationsForType(inter, node.specializations, parent);
    this.buildMembers(inter, node.members, parent);

    return inter;
  }

  // ---- Connector ----

  private buildConnector(node: AST.ConnectorDeclaration, parent: M.Namespace): M.Connector {
    const conn = new M.Connector(node.name);

    // Typings
    for (const typing of node.typings) {
      const ft = new M.FeatureTyping();
      ft.typedFeature = conn;
      conn.ownedTypings.push(ft);
      conn.addOwnedElement(ft);

      this.unresolvedRefs.push({
        kind: 'typing',
        qualifiedName: typing.segments.join('::'),
        element: ft,
        parent,
        targetSlot: 'featureType',
      });
    }

    // Ends
    for (const endNode of node.ends) {
      const end = new M.ConnectorEnd(endNode.name);

      if (endNode.multiplicity) {
        end.multiplicity = this.buildMultiplicityRange(endNode.multiplicity);
        end.addOwnedElement(end.multiplicity);
      }

      conn.connectorEnds.push(end);
      conn.addOwnedElement(end);

      this.unresolvedRefs.push({
        kind: 'connector-end',
        qualifiedName: endNode.reference.segments.join('::'),
        element: end,
        parent,
        targetSlot: 'referencedFeature',
      });
    }

    this.buildMembers(conn, node.members, parent);

    return conn;
  }

  // ---- Binding Connector ----

  private buildBindingConnector(node: AST.BindingConnectorDeclaration, parent: M.Namespace): M.BindingConnector {
    const bc = new M.BindingConnector(node.name);

    const sourceEnd = new M.ConnectorEnd('source');
    const targetEnd = new M.ConnectorEnd('target');
    bc.connectorEnds.push(sourceEnd, targetEnd);
    bc.addOwnedElement(sourceEnd);
    bc.addOwnedElement(targetEnd);

    this.unresolvedRefs.push({
      kind: 'binding-source',
      qualifiedName: node.source.segments.join('::'),
      element: sourceEnd,
      parent,
      targetSlot: 'referencedFeature',
    });

    this.unresolvedRefs.push({
      kind: 'binding-target',
      qualifiedName: node.target.segments.join('::'),
      element: targetEnd,
      parent,
      targetSlot: 'referencedFeature',
    });

    return bc;
  }

  // ---- Succession ----

  private buildSuccession(node: AST.SuccessionDeclaration, parent: M.Namespace): M.Succession {
    const succ = new M.Succession(node.name);

    const sourceEnd = new M.ConnectorEnd('source');
    const targetEnd = new M.ConnectorEnd('target');
    succ.connectorEnds.push(sourceEnd, targetEnd);
    succ.addOwnedElement(sourceEnd);
    succ.addOwnedElement(targetEnd);

    this.unresolvedRefs.push({
      kind: 'succession-source',
      qualifiedName: node.source.segments.join('::'),
      element: sourceEnd,
      parent,
      targetSlot: 'referencedFeature',
    });

    this.unresolvedRefs.push({
      kind: 'succession-target',
      qualifiedName: node.target.segments.join('::'),
      element: targetEnd,
      parent,
      targetSlot: 'referencedFeature',
    });

    if (node.guardCondition) {
      succ.guardExpression = this.buildExpressionElement(node.guardCondition);
    }

    return succ;
  }

  // ---- Explicit Specialization ----

  private buildSpecialization(node: AST.SpecializationDeclaration, parent: M.Namespace): M.Specialization {
    const spec = new M.Specialization();

    this.unresolvedRefs.push({
      kind: 'specialization',
      qualifiedName: node.specific.segments.join('::'),
      element: spec,
      parent,
      targetSlot: 'specific',
    });

    this.unresolvedRefs.push({
      kind: 'specialization',
      qualifiedName: node.general.segments.join('::'),
      element: spec,
      parent,
      targetSlot: 'general',
    });

    return spec;
  }

  // ---- Conjugation ----

  private buildConjugation(node: AST.ConjugationDeclaration, parent: M.Namespace): M.Conjugation {
    const conj = new M.Conjugation();

    this.unresolvedRefs.push({
      kind: 'conjugation',
      qualifiedName: node.conjugated.segments.join('::'),
      element: conj,
      parent,
      targetSlot: 'conjugatedType',
    });

    this.unresolvedRefs.push({
      kind: 'conjugation',
      qualifiedName: node.original.segments.join('::'),
      element: conj,
      parent,
      targetSlot: 'originalType',
    });

    return conj;
  }

  // ---- Disjoining ----

  private buildDisjoining(node: AST.DisjoiningDeclaration, parent: M.Namespace): M.Disjoining {
    const disj = new M.Disjoining();

    this.unresolvedRefs.push({
      kind: 'disjoining',
      qualifiedName: node.type1.segments.join('::'),
      element: disj,
      parent,
      targetSlot: 'disjoiningType',
    });

    this.unresolvedRefs.push({
      kind: 'disjoining',
      qualifiedName: node.type2.segments.join('::'),
      element: disj,
      parent,
      targetSlot: 'disjoinedType',
    });

    return disj;
  }

  // ---- Multiplicity ----

  private buildMultiplicity(node: AST.MultiplicityDeclaration, parent: M.Namespace): M.Multiplicity {
    const mult = this.buildMultiplicityRange(node.range);
    mult.name = node.name;

    if (node.featureTyping) {
      const ft = new M.FeatureTyping();
      ft.typedFeature = mult;
      mult.ownedTypings.push(ft);
      mult.addOwnedElement(ft);

      this.unresolvedRefs.push({
        kind: 'typing',
        qualifiedName: node.featureTyping.segments.join('::'),
        element: ft,
        parent,
        targetSlot: 'featureType',
      });
    }

    return mult;
  }

  // ---- Comment ----

  private buildComment(node: AST.CommentNode, parent: M.Namespace): M.Comment {
    const comment = new M.Comment(node.name);
    comment.body = node.body;
    comment.locale = node.locale;

    for (const about of node.about) {
      this.unresolvedRefs.push({
        kind: 'comment-about',
        qualifiedName: about.segments.join('::'),
        element: comment,
        parent,
      });
    }

    return comment;
  }

  // ---- Documentation ----

  private buildDocumentation(node: AST.DocumentationNode, parent: M.Namespace): M.Documentation {
    const doc = new M.Documentation();
    doc.body = node.body;
    doc.locale = node.locale;

    // Documentation is owned by the parent
    if (parent instanceof M.Element) {
      parent.documentation.push(node.body);
    }

    return doc;
  }

  // ---- Metaclass ----

  private buildMetaclass(node: AST.MetaclassDeclaration, parent: M.Namespace): M.Metaclass {
    const mc = new M.Metaclass(node.name);
    mc.isAbstract = node.isAbstract;

    this.buildSpecializationsForType(mc, node.specializations, parent);
    this.buildMembers(mc, node.members, parent);

    return mc;
  }

  // ---- Metadata Usage ----

  private buildMetadata(node: AST.MetadataUsage, parent: M.Namespace): M.MetadataFeature {
    const md = new M.MetadataFeature(node.name);

    this.unresolvedRefs.push({
      kind: 'metadata-metaclass',
      qualifiedName: node.metaclass.segments.join('::'),
      element: md,
      parent,
      targetSlot: 'metaclassRef',
    });

    for (const about of node.about) {
      this.unresolvedRefs.push({
        kind: 'metadata-about',
        qualifiedName: about.segments.join('::'),
        element: md,
        parent,
      });
    }

    this.buildMembers(md, node.members, parent);

    return md;
  }

  // ================================================================
  // Helper Methods
  // ================================================================

  private buildSpecializationsForType(
    type: M.Type,
    specializations: AST.QualifiedName[],
    parent: M.Namespace
  ): void {
    for (const spec of specializations) {
      const specialization = new M.Specialization();
      specialization.specific = type;
      type.ownedSpecializations.push(specialization);
      type.addOwnedElement(specialization);

      this.unresolvedRefs.push({
        kind: 'specialization',
        qualifiedName: spec.segments.join('::'),
        element: specialization,
        parent,
        targetSlot: 'general',
      });
    }
  }

  private buildMembers(
    ns: M.Namespace,
    members: AST.NamespaceMember[],
    parent: M.Namespace
  ): void {
    for (const member of members) {
      const el = this.buildMember(member, ns);
      if (el) ns.addMember(el);
    }
  }

  private buildMultiplicityRange(node: AST.MultiplicityRange): M.Multiplicity {
    const mult = new M.Multiplicity();

    if (node.lower) {
      const lower = this.evaluateConstantExpr(node.lower);
      mult.lowerBound = lower !== null ? lower : 0;
    }

    if (node.upper) {
      const upperValue = this.evaluateConstantExpr(node.upper);
      if (node.upper.kind === 'LiteralExpression' && (node.upper as AST.LiteralExpression).value === '*') {
        mult.upperBound = '*';
      } else {
        mult.upperBound = upperValue !== null ? upperValue : undefined;
      }
    }

    return mult;
  }

  private evaluateConstantExpr(expr: AST.Expression): number | null {
    if (expr.kind === 'LiteralExpression') {
      const lit = expr as AST.LiteralExpression;
      if (lit.literalType === 'integer') {
        if (lit.value === '*') return null;
        return parseInt(lit.value, 10);
      }
      if (lit.literalType === 'real') {
        return parseFloat(lit.value);
      }
    }
    return null;
  }

  private buildExpressionElement(expr: AST.Expression): M.Expression {
    const exprEl = new M.Expression();
    // Store the AST expression for later evaluation
    (exprEl as any)._astExpression = expr;
    return exprEl;
  }
}