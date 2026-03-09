// ============================================================
// KerML JSON Exporter
//
// 将 KerML 语义模型导出为 JSON 格式
// 支持两种模式:
// 1. 层次结构模式 (Hierarchical) - 保持模型树结构
// 2. 扁平元素模式 (Flat) - SysML v2 REST API 兼容格式
//
// JSON Schema 遵循 OMG SysML v2 API & Services 规范
// ============================================================

import * as M from '../model/elements';

export interface JsonExportOptions {
  prettyPrint: boolean;        // 格式化输出
  includeIds: boolean;         // 包含 elementId
  includeMetaclass: boolean;   // 包含 @type 元类信息
  includeRelationships: boolean; // 包含关系详情
  includeQualifiedNames: boolean; // 包含限定名
  includeEmptyArrays: boolean;  // 包含空数组
  maxDepth: number;            // 最大遍历深度
  excludeRelationshipElements: boolean; // 在成员列表中排除关系元素
}

const DEFAULT_OPTIONS: JsonExportOptions = {
  prettyPrint: true,
  includeIds: true,
  includeMetaclass: true,
  includeRelationships: true,
  includeQualifiedNames: true,
  includeEmptyArrays: false,
  maxDepth: 100,
  excludeRelationshipElements: true,
};

export class JsonExporter {
  private options: JsonExportOptions;
  private visitedIds: Set<string> = new Set();

  constructor(options: Partial<JsonExportOptions> = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  // ================================================================
  // Public API
  // ================================================================

  /**
   * 导出为层次结构 JSON 字符串
   */
  export(rootPackage: M.Package): string {
    this.visitedIds.clear();
    const jsonObj = this.exportElement(rootPackage, 0);
    return JSON.stringify(
      jsonObj,
      null,
      this.options.prettyPrint ? 2 : undefined
    );
  }

  /**
   * 导出为扁平元素数组（SysML v2 API 风格）
   */
  exportElements(rootPackage: M.Package): object[] {
    this.visitedIds.clear();
    const results: object[] = [];
    this.collectFlatElements(rootPackage, results, new Set());
    return results;
  }

  /**
   * 导出单个元素（不含递归子元素）
   */
  exportSingleElement(element: M.Element): object {
    this.visitedIds.clear();
    return this.exportElement(element, 0);
  }

  // ================================================================
  // Core Export Logic
  // ================================================================

  private exportElement(element: M.Element, depth: number): any {
    // 深度限制
    if (depth > this.options.maxDepth) {
      return this.makeRef(element);
    }

    // 循环引用保护
    if (this.visitedIds.has(element.elementId)) {
      return this.makeRef(element);
    }
    this.visitedIds.add(element.elementId);

    const result: any = {};

    // ---- 基本属性 ----
    if (this.options.includeMetaclass) {
      result['@type'] = this.getMetaclass(element);
    }
    if (this.options.includeIds) {
      result['@id'] = element.elementId;
    }
    if (element.name) {
      result.name = element.name;
    }
    if (this.options.includeQualifiedNames) {
      const qn = element.resolveQualifiedName();
      if (qn) {
        result.qualifiedName = qn;
      }
    }

    // ---- Documentation ----
    if (element.documentation.length > 0) {
      result.documentation = element.documentation;
    }

    // ---- 按元素类型导出特定属性 ----
    this.exportPackageProps(element, result);
    this.exportTypeProps(element, result, depth);
    this.exportFeatureProps(element, result, depth);
    this.exportConnectorProps(element, result, depth);
    this.exportBehaviorProps(element, result, depth);
    this.exportFunctionProps(element, result, depth);
    this.exportEnumerationProps(element, result);
    this.exportCommentProps(element, result);
    this.exportMetadataProps(element, result);

    // ---- 成员 ----
    if (element instanceof M.Namespace) {
      const memberExports = this.exportMembers(element, depth);
      if (memberExports.length > 0 || this.options.includeEmptyArrays) {
        result.ownedMember = memberExports;
      }
    }

    return result;
  }

  // ================================================================
  // Type-Specific Exporters
  // ================================================================

  private exportPackageProps(element: M.Element, result: any): void {
    if (!(element instanceof M.Package)) return;
    result.isLibraryPackage = element.isLibrary;
  }

  private exportTypeProps(element: M.Element, result: any, depth: number): void {
    if (!(element instanceof M.Type)) return;

    result.isAbstract = element.isAbstract;

    // Multiplicity
    if (element.multiplicity) {
      result.multiplicity = this.exportMultiplicity(element.multiplicity);
    }

    if (!this.options.includeRelationships) return;

    // Specializations
    if (element.ownedSpecializations.length > 0) {
      result.ownedSpecialization = element.ownedSpecializations.map(spec => ({
        '@type': 'Specialization',
        specific: spec.specific ? this.makeRef(spec.specific) : null,
        general: spec.general ? this.makeRef(spec.general) : null,
      }));
    }

    // Conjugation
    if (element.ownedConjugation) {
      result.ownedConjugator = {
        '@type': 'Conjugation',
        originalType: element.ownedConjugation.originalType
          ? this.makeRef(element.ownedConjugation.originalType) : null,
        conjugatedType: element.ownedConjugation.conjugatedType
          ? this.makeRef(element.ownedConjugation.conjugatedType) : null,
      };
    }

    // Disjoinings
    if (element.ownedDisjoinings.length > 0) {
      result.ownedDisjoining = element.ownedDisjoinings.map(d => ({
        '@type': 'Disjoining',
        disjoiningType: d.disjoiningType ? this.makeRef(d.disjoiningType) : null,
        typeDisjoined: d.disjoinedType ? this.makeRef(d.disjoinedType) : null,
      }));
    }

    // Unionings
    if (element.ownedUnionings.length > 0) {
      result.ownedUnioning = element.ownedUnionings.map(u => ({
        '@type': 'Unioning',
        unioningType: u.unioningType ? this.makeRef(u.unioningType) : null,
      }));
    }

    // Intersectings
    if (element.ownedIntersectings.length > 0) {
      result.ownedIntersecting = element.ownedIntersectings.map(i => ({
        '@type': 'Intersecting',
        intersectingType: i.intersectingType ? this.makeRef(i.intersectingType) : null,
      }));
    }

    // Differencings
    if (element.ownedDifferencings.length > 0) {
      result.ownedDifferencing = element.ownedDifferencings.map(d => ({
        '@type': 'Differencing',
        differencingType: d.differencingType ? this.makeRef(d.differencingType) : null,
      }));
    }

    // Owned Features (as a list of refs)
    if (element.ownedFeatures.length > 0) {
      result.ownedFeature = element.ownedFeatures.map(f => this.makeRef(f));
    }
  }

  private exportFeatureProps(element: M.Element, result: any, depth: number): void {
    if (!(element instanceof M.Feature)) return;

    // Feature-specific properties
    if (element.direction) {
      result.direction = element.direction;
    }

    result.isComposite = element.isComposite;
    result.isPortion = element.isPortion;
    result.isReadOnly = element.isReadonly;
    result.isDerived = element.isDerived;
    result.isEnd = element.isEnd;
    result.isOrdered = element.isOrdered;
    result.isUnique = element.isUnique;

    if (!this.options.includeRelationships) return;

    // Feature Typings
    if (element.ownedTypings.length > 0) {
      result.ownedTyping = element.ownedTypings.map(t => ({
        '@type': 'FeatureTyping',
        typedFeature: this.makeRef(element),
        type: t.featureType ? this.makeRef(t.featureType) : null,
      }));
    }

    // Subsettings
    if (element.ownedSubsettings.length > 0) {
      result.ownedSubsetting = element.ownedSubsettings.map(s => ({
        '@type': 'Subsetting',
        subsettingFeature: this.makeRef(element),
        subsettedFeature: s.subsettedFeature ? this.makeRef(s.subsettedFeature) : null,
      }));
    }

    // Redefinitions
    if (element.ownedRedefinitions.length > 0) {
      result.ownedRedefinition = element.ownedRedefinitions.map(r => ({
        '@type': 'Redefinition',
        redefiningFeature: this.makeRef(element),
        redefinedFeature: r.redefinedFeature ? this.makeRef(r.redefinedFeature) : null,
      }));
    }

    // Reference Subsettings
    if (element.ownedReferenceSubsettings.length > 0) {
      result.ownedReferenceSubsetting = element.ownedReferenceSubsettings.map(rs => ({
        '@type': 'ReferenceSubsetting',
        subsettingFeature: this.makeRef(element),
        subsettedFeature: rs.subsettedFeature ? this.makeRef(rs.subsettedFeature) : null,
      }));
    }
  }

  private exportConnectorProps(element: M.Element, result: any, depth: number): void {
    if (!(element instanceof M.Connector)) return;

    if (element.connectorEnds.length > 0) {
      result.connectorEnd = element.connectorEnds.map(end => {
        const endObj: any = {
          '@type': 'Feature',
        };
        if (end.name) endObj.name = end.name;
        if (end.referencedFeature) {
          endObj.ownedReferenceSubsetting = [{
            '@type': 'ReferenceSubsetting',
            referencedFeature: this.makeRef(end.referencedFeature),
          }];
        }
        if (end.multiplicity) {
          endObj.multiplicity = this.exportMultiplicity(end.multiplicity);
        }
        return endObj;
      });
    }

    // BindingConnector specific
    if (element instanceof M.BindingConnector) {
      result['@type'] = 'BindingConnector';
    }

    // Succession specific
    if (element instanceof M.Succession) {
      result['@type'] = 'Succession';
      if (element.guardExpression) {
        result.guardExpression = { '@type': 'Expression' };
      }
    }
  }

  private exportBehaviorProps(element: M.Element, result: any, depth: number): void {
    if (!(element instanceof M.Behavior)) return;

    if (element.parameters.length > 0) {
      result.parameter = element.parameters.map(p => {
        // 为参数创建简化的导出
        const paramObj: any = {
          '@type': 'Feature',
        };
        if (p.name) paramObj.name = p.name;
        if (p.direction) paramObj.direction = p.direction;
        if (p.ownedTypings.length > 0 && p.ownedTypings[0].featureType) {
          paramObj.type = this.makeRef(p.ownedTypings[0].featureType);
        }
        if (p.multiplicity) {
          paramObj.multiplicity = this.exportMultiplicity(p.multiplicity);
        }
        return paramObj;
      });
    }
  }

  private exportFunctionProps(element: M.Element, result: any, depth: number): void {
    if (!(element instanceof M.Function)) return;

    if (element.result) {
      const resultObj: any = {
        '@type': 'Feature',
        name: 'result',
      };
      if (element.result.ownedTypings.length > 0 && element.result.ownedTypings[0].featureType) {
        resultObj.type = this.makeRef(element.result.ownedTypings[0].featureType);
      }
      result.result = resultObj;
    }
  }

  private exportEnumerationProps(element: M.Element, result: any): void {
    if (!(element instanceof M.Enumeration)) return;

    if (element.variants.length > 0) {
      result.enumeratedValue = element.variants.map(v => ({
        '@type': 'EnumerationUsage',
        name: v.name,
      }));
    }
  }

  private exportCommentProps(element: M.Element, result: any): void {
    if (element instanceof M.Comment) {
      result.body = element.body;
      if (element.locale) {
        result.locale = element.locale;
      }
      if (element.aboutElements.length > 0) {
        result.annotatedElement = element.aboutElements.map(e => this.makeRef(e));
      }
    }
  }

  private exportMetadataProps(element: M.Element, result: any): void {
    if (element instanceof M.MetadataFeature) {
      if (element.metaclassRef) {
        result.metaclass = this.makeRef(element.metaclassRef);
      }
      if (element.aboutElements.length > 0) {
        result.annotatedElement = element.aboutElements.map(e => this.makeRef(e));
      }
    }
  }

  // ================================================================
  // Members Export
  // ================================================================

  private exportMembers(ns: M.Namespace, depth: number): any[] {
    const memberExports: any[] = [];

    for (const member of ns.members) {
      // 跳过关系元素（如果配置要求）
      if (this.options.excludeRelationshipElements && this.isRelationship(member)) {
        continue;
      }

      // 已访问过的用引用代替
      if (this.visitedIds.has(member.elementId)) {
        memberExports.push(this.makeRef(member));
      } else {
        memberExports.push(this.exportElement(member, depth + 1));
      }
    }

    return memberExports;
  }

  // ================================================================
  // Flat Element Collection
  // ================================================================

  private collectFlatElements(
    element: M.Element,
    results: object[],
    collected: Set<string>
  ): void {
    if (collected.has(element.elementId)) return;
    collected.add(element.elementId);

    // 为每个元素独立导出（不递归子元素到 ownedMember）
    this.visitedIds.clear();
    const exportObj = this.exportElementFlat(element);
    results.push(exportObj);

    // 递归收集所有子元素
    for (const owned of element.ownedElements) {
      this.collectFlatElements(owned, results, collected);
    }
  }

  /**
   * 扁平模式的元素导出，子元素用引用表示
   */
  private exportElementFlat(element: M.Element): any {
    const result: any = {};

    if (this.options.includeMetaclass) {
      result['@type'] = this.getMetaclass(element);
    }
    if (this.options.includeIds) {
      result['@id'] = element.elementId;
    }
    if (element.name) {
      result.name = element.name;
    }
    if (this.options.includeQualifiedNames) {
      result.qualifiedName = element.resolveQualifiedName();
    }

    // Owner reference
    if (element.owner) {
      result.owner = this.makeRef(element.owner);
    }

    // Owned elements as refs
    if (element.ownedElements.length > 0) {
      result.ownedElement = element.ownedElements.map(e => this.makeRef(e));
    }

    // Type-specific flat properties
    if (element instanceof M.Type) {
      result.isAbstract = element.isAbstract;
      if (element.multiplicity) {
        result.multiplicity = this.exportMultiplicity(element.multiplicity);
      }
      if (element.ownedSpecializations.length > 0) {
        result.ownedSpecialization = element.ownedSpecializations.map(s =>
          s.general ? this.makeRef(s.general) : null
        ).filter(Boolean);
      }
    }

    if (element instanceof M.Feature) {
      if (element.direction) result.direction = element.direction;
      result.isComposite = element.isComposite;
      result.isEnd = element.isEnd;
      result.isReadOnly = element.isReadonly;
      result.isDerived = element.isDerived;
      if (element.ownedTypings.length > 0) {
        result.type = element.ownedTypings
          .map(t => t.featureType ? this.makeRef(t.featureType) : null)
          .filter(Boolean);
      }
    }

    return result;
  }

  // ================================================================
  // Utility Methods
  // ================================================================

  /**
   * 创建元素引用对象
   */
  private makeRef(element: M.Element): any {
    const ref: any = {};
    if (this.options.includeIds) {
      ref['@id'] = element.elementId;
    }
    if (element.name) {
      ref.name = element.name;
    }
    if (this.options.includeQualifiedNames) {
      const qn = element.resolveQualifiedName();
      if (qn) ref.qualifiedName = qn;
    }
    return ref;
  }

  /**
   * 导出多重性
   */
  private exportMultiplicity(mult: M.Multiplicity): any {
    const result: any = {};

    if (mult.lowerBound !== undefined) {
      result.lower = mult.lowerBound;
    }
    if (mult.upperBound !== undefined) {
      result.upper = mult.upperBound === '*' ? -1 : mult.upperBound;
      result.upperUnbounded = mult.upperBound === '*';
    }

    return result;
  }

  /**
   * 获取元素的 metaclass 名称
   */
  private getMetaclass(element: M.Element): string {
    // 使用元素自身的 metaclass 属性
    return (element as any).metaclass ?? element.constructor.name ?? 'Element';
  }

  /**
   * 判断元素是否为关系
   */
  private isRelationship(element: M.Element): boolean {
    return element instanceof M.Relationship &&
      !(element instanceof M.Connector) &&
      !(element instanceof M.Feature);
  }
}