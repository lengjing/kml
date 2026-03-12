// ============================================================
// KerML PlantUML Exporter
// 从 KerML 语义模型生成 PlantUML 类图
//
// 支持:
// - Class/Struct/DataType/Enumeration/Association 导出
// - 继承关系
// - 组合/引用关系
// - Connector 关系
// - 包嵌套结构
// - Feature 详情（类型、多重性、方向、修饰符）
// ============================================================

import * as M from '../model/elements';

export interface PlantUMLExportOptions {
  showFeatureTypes: boolean;
  showMultiplicity: boolean;
  showDirection: boolean;
  showModifiers: boolean;
  showRelationships: boolean;
  showPackages: boolean;
  maxFeaturesToShow: number;
  theme?: string;
}

const DEFAULT_OPTIONS: PlantUMLExportOptions = {
  showFeatureTypes: true,
  showMultiplicity: true,
  showDirection: true,
  showModifiers: true,
  showRelationships: true,
  showPackages: true,
  maxFeaturesToShow: 30,
  theme: undefined,
};

export class PlantUMLExporter {
  private output: string[] = [];
  private processedIds: Set<string> = new Set();
  private relationships: string[] = [];
  private options: PlantUMLExportOptions;

  constructor(options: Partial<PlantUMLExportOptions> = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  /**
   * 导出整个模型为 PlantUML 字符串
   */
  export(rootPackage: M.Package): string {
    this.output = [];
    this.processedIds = new Set();
    this.relationships = [];

    // Header
    this.output.push('@startuml');
    this.output.push('');

    // Theme/Style
    if (this.options.theme) {
      this.output.push(`!theme ${this.options.theme}`);
    }
    this.output.push('skinparam classAttributeIconSize 0');
    this.output.push('skinparam classFontStyle bold');
    this.output.push('skinparam packageStyle rectangle');
    this.output.push('hide empty members');
    this.output.push('');

    // 导出模型内容
    this.exportNamespace(rootPackage, 0);

    // 添加关系
    if (this.relationships.length > 0) {
      this.output.push('');
      this.output.push("' ---- Relationships ----");
      this.output.push(...this.relationships);
    }

    // Footer
    this.output.push('');
    this.output.push('@enduml');

    return this.output.join('\n');
  }

  // ================================================================
  // Namespace/Package Export
  // ================================================================

  private exportNamespace(ns: M.Namespace, indent: number): void {
    const prefix = '  '.repeat(indent);

    const isRoot = ns instanceof M.Package && ns.name === '<root>';

    if (!isRoot && this.options.showPackages && ns instanceof M.Package) {
      const pkgType = ns.isLibrary ? 'package' : 'package';
      const stereo = ns.isLibrary ? ' <<library>>' : '';
      this.output.push(`${prefix}${pkgType} "${this.sanitizeName(ns.name!)}"${stereo} {`);

      for (const member of ns.members) {
        this.exportElement(member, indent + 1);
      }

      this.output.push(`${prefix}}`);
      this.output.push('');
    } else {
      for (const member of ns.members) {
        this.exportElement(member, indent);
      }
    }
  }

  // ================================================================
  // Element Dispatch
  // ================================================================

  private exportElement(element: M.Element, indent: number): void {
    if (this.processedIds.has(element.elementId)) return;
    this.processedIds.add(element.elementId);

    if (element instanceof M.Package) {
      this.exportNamespace(element, indent);
    } else if (element instanceof M.Enumeration) {
      this.exportEnumeration(element, indent);
    } else if (element instanceof M.Association) {
      this.exportAssociation(element, indent);
    } else if (element instanceof M.DataType && !(element instanceof M.Enumeration)) {
      this.exportDataType(element, indent);
    } else if (element instanceof M.Structure) {
      this.exportStructure(element, indent);
    } else if (element instanceof M.Predicate) {
      this.exportPredicate(element, indent);
    } else if (element instanceof M.Function && !(element instanceof M.Predicate)) {
      this.exportFunction(element, indent);
    } else if (element instanceof M.Behavior && !(element instanceof M.Function)) {
      this.exportBehavior(element, indent);
    } else if (element instanceof M.Class) {
      this.exportClass(element, indent);
    } else if (element instanceof M.Classifier) {
      this.exportClassifier(element, indent);
    } else if (element instanceof M.Type && !(element instanceof M.Classifier)) {
      this.exportType(element, indent);
    } else if (element instanceof M.Connector) {
      this.exportConnectorAsRelationship(element);
    } else if (element instanceof M.Metaclass) {
      this.exportMetaclass(element, indent);
    }
    // Comment, Documentation, relationships etc. are skipped in diagrams
  }

  // ================================================================
  // Individual Element Exporters
  // ================================================================

  private exportClass(cls: M.Class, indent: number): void {
    if (!cls.name) return;
    const prefix = '  '.repeat(indent);
    const abstract = cls.isAbstract ? 'abstract ' : '';
    const stereo = this.getStereotype(cls);

    this.output.push(`${prefix}${abstract}class "${this.sanitizeName(cls.name)}"${stereo} {`);
    this.exportFeatureList(cls, indent + 1);
    this.output.push(`${prefix}}`);
    this.output.push('');

    if (this.options.showRelationships) {
      this.collectSpecializations(cls);
      this.collectCompositionRelationships(cls);
    }
  }

  private exportStructure(struct: M.Structure, indent: number): void {
    if (!struct.name) return;
    const prefix = '  '.repeat(indent);
    const abstract = struct.isAbstract ? 'abstract ' : '';

    this.output.push(`${prefix}${abstract}class "${this.sanitizeName(struct.name)}" <<struct>> {`);
    this.exportFeatureList(struct, indent + 1);
    this.output.push(`${prefix}}`);
    this.output.push('');

    if (this.options.showRelationships) {
      this.collectSpecializations(struct);
      this.collectCompositionRelationships(struct);
    }
  }

  private exportClassifier(cls: M.Classifier, indent: number): void {
    if (!cls.name) return;
    const prefix = '  '.repeat(indent);
    const abstract = cls.isAbstract ? 'abstract ' : '';

    this.output.push(`${prefix}${abstract}class "${this.sanitizeName(cls.name)}" <<classifier>> {`);
    this.exportFeatureList(cls, indent + 1);
    this.output.push(`${prefix}}`);
    this.output.push('');

    if (this.options.showRelationships) {
      this.collectSpecializations(cls);
    }
  }

  private exportType(type: M.Type, indent: number): void {
    if (!type.name) return;
    const prefix = '  '.repeat(indent);
    const abstract = type.isAbstract ? 'abstract ' : '';

    this.output.push(`${prefix}${abstract}class "${this.sanitizeName(type.name)}" <<type>> {`);
    this.exportFeatureList(type, indent + 1);
    this.output.push(`${prefix}}`);
    this.output.push('');

    if (this.options.showRelationships) {
      this.collectSpecializations(type);
    }
  }

  private exportDataType(dt: M.DataType, indent: number): void {
    if (!dt.name) return;
    const prefix = '  '.repeat(indent);

    this.output.push(`${prefix}class "${this.sanitizeName(dt.name)}" <<datatype>> {`);
    this.exportFeatureList(dt, indent + 1);
    this.output.push(`${prefix}}`);
    this.output.push('');

    if (this.options.showRelationships) {
      this.collectSpecializations(dt);
    }
  }

  private exportEnumeration(en: M.Enumeration, indent: number): void {
    if (!en.name) return;
    const prefix = '  '.repeat(indent);

    this.output.push(`${prefix}enum "${this.sanitizeName(en.name)}" {`);
    for (const variant of en.variants) {
      if (variant.name) {
        this.output.push(`${prefix}  ${this.sanitizeName(variant.name)}`);
      }
    }
    this.output.push(`${prefix}}`);
    this.output.push('');

    if (this.options.showRelationships) {
      this.collectSpecializations(en);
    }
  }

  private exportAssociation(assoc: M.Association, indent: number): void {
    if (!assoc.name) return;
    const prefix = '  '.repeat(indent);
    const stereo = assoc.isStruct ? '<<assoc struct>>' : '<<association>>';

    this.output.push(`${prefix}class "${this.sanitizeName(assoc.name)}" ${stereo} {`);
    this.exportFeatureList(assoc, indent + 1);
    this.output.push(`${prefix}}`);
    this.output.push('');

    if (this.options.showRelationships) {
      this.collectSpecializations(assoc);
      this.collectAssociationEnds(assoc);
    }
  }

  private exportBehavior(beh: M.Behavior, indent: number): void {
    if (!beh.name) return;
    const prefix = '  '.repeat(indent);
    const abstract = beh.isAbstract ? 'abstract ' : '';

    this.output.push(`${prefix}${abstract}class "${this.sanitizeName(beh.name)}" <<behavior>> {`);

    // Parameters
    for (const param of beh.parameters) {
      const dir = param.direction ? `{${param.direction}} ` : '';
      const typeName = this.getFeatureTypeName(param);
      const mult = this.formatMultiplicity(param.multiplicity);
      this.output.push(`${prefix}  ${dir}${this.sanitizeName(param.name ?? '_')} : ${typeName}${mult}`);
    }

    this.exportFeatureList(beh, indent + 1);
    this.output.push(`${prefix}}`);
    this.output.push('');

    if (this.options.showRelationships) {
      this.collectSpecializations(beh);
    }
  }

  private exportFunction(fn: M.Function, indent: number): void {
    if (!fn.name) return;
    const prefix = '  '.repeat(indent);
    const abstract = fn.isAbstract ? 'abstract ' : '';

    this.output.push(`${prefix}${abstract}class "${this.sanitizeName(fn.name)}" <<function>> {`);

    // Parameters
    for (const param of fn.parameters) {
      const dir = param.direction ? `{${param.direction}} ` : '';
      const typeName = this.getFeatureTypeName(param);
      this.output.push(`${prefix}  ${dir}${this.sanitizeName(param.name ?? '_')} : ${typeName}`);
    }

    // Return type
    if (fn.result && fn.result.ownedTypings.length > 0 && fn.result.ownedTypings[0].featureType) {
      const retType = fn.result.ownedTypings[0].featureType.name ?? 'any';
      this.output.push(`${prefix}  -- return --`);
      this.output.push(`${prefix}  result : ${retType}`);
    }

    this.output.push(`${prefix}}`);
    this.output.push('');

    if (this.options.showRelationships) {
      this.collectSpecializations(fn);
    }
  }

  private exportPredicate(pred: M.Predicate, indent: number): void {
    if (!pred.name) return;
    const prefix = '  '.repeat(indent);

    this.output.push(`${prefix}class "${this.sanitizeName(pred.name)}" <<predicate>> {`);
    for (const param of pred.parameters) {
      const dir = param.direction ? `{${param.direction}} ` : '';
      const typeName = this.getFeatureTypeName(param);
      this.output.push(`${prefix}  ${dir}${this.sanitizeName(param.name ?? '_')} : ${typeName}`);
    }
    this.output.push(`${prefix}  -- result --`);
    this.output.push(`${prefix}  result : Boolean`);
    this.output.push(`${prefix}}`);
    this.output.push('');

    if (this.options.showRelationships) {
      this.collectSpecializations(pred);
    }
  }

  private exportMetaclass(mc: M.Metaclass, indent: number): void {
    if (!mc.name) return;
    const prefix = '  '.repeat(indent);

    this.output.push(`${prefix}class "${this.sanitizeName(mc.name)}" <<metaclass>> {`);
    this.exportFeatureList(mc, indent + 1);
    this.output.push(`${prefix}}`);
    this.output.push('');
  }

  // ================================================================
  // Feature List Export
  // ================================================================

  private exportFeatureList(type: M.Type, indent: number): void {
    const prefix = '  '.repeat(indent);
    let count = 0;

    for (const feature of type.ownedFeatures) {
      if (count >= this.options.maxFeaturesToShow) {
        this.output.push(`${prefix}... (${type.ownedFeatures.length - count} more)`);
        break;
      }

      const parts: string[] = [];

      // Direction
      if (this.options.showDirection && feature.direction) {
        parts.push(`{${feature.direction}}`);
      }

      // Modifiers
      if (this.options.showModifiers) {
        const mods: string[] = [];
        if (feature.isReadonly) mods.push('readonly');
        if (feature.isDerived) mods.push('/');
        if (feature.isComposite) mods.push('composite');
        if (feature.isPortion) mods.push('portion');
        if (feature.isEnd) mods.push('end');
        if (mods.length > 0) {
          parts.push(`{${mods.join(',')}}`);
        }
      }

      // Name
      parts.push(this.sanitizeName(feature.name ?? '<unnamed>'));

      // Type
      if (this.options.showFeatureTypes) {
        const typeName = this.getFeatureTypeName(feature);
        parts.push(`: ${typeName}`);
      }

      // Multiplicity
      if (this.options.showMultiplicity && feature.multiplicity) {
        parts.push(this.formatMultiplicity(feature.multiplicity));
      }

      this.output.push(`${prefix}${parts.join(' ')}`);
      count++;
    }
  }

  // ================================================================
  // Relationship Collection
  // ================================================================

  private collectSpecializations(type: M.Type): void {
    for (const spec of type.ownedSpecializations) {
      if (spec.general && spec.general.name && type.name) {
        this.relationships.push(
          `"${this.sanitizeName(spec.general.name)}" <|-- "${this.sanitizeName(type.name)}"`
        );
      }
    }
  }

  private collectCompositionRelationships(type: M.Type): void {
    for (const feature of type.ownedFeatures) {
      if (!feature.isComposite) continue;
      if (feature.ownedTypings.length === 0) continue;

      const targetType = feature.ownedTypings[0].featureType;
      if (!targetType || !targetType.name || !type.name) continue;

      const mult = this.formatMultiplicity(feature.multiplicity);
      const label = feature.name ? ` : ${this.sanitizeName(feature.name)}` : '';

      this.relationships.push(
        `"${this.sanitizeName(type.name)}" *-- "${mult}" "${this.sanitizeName(targetType.name)}"${label}`
      );
    }
  }

  private collectAssociationEnds(assoc: M.Association): void {
    const endFeatures = assoc.ownedFeatures.filter(f => f.isEnd);
    if (endFeatures.length >= 2) {
      const end1 = endFeatures[0];
      const end2 = endFeatures[1];

      const type1Name = this.getFeatureTypeName(end1);
      const type2Name = this.getFeatureTypeName(end2);

      if (type1Name !== 'any' && type2Name !== 'any') {
        const mult1 = this.formatMultiplicity(end1.multiplicity);
        const mult2 = this.formatMultiplicity(end2.multiplicity);

        this.relationships.push(
          `"${type1Name}" "${mult1}" -- "${mult2}" "${type2Name}" : ${this.sanitizeName(assoc.name!)}`
        );
      }
    }
  }

  private exportConnectorAsRelationship(connector: M.Connector): void {
    if (connector.connectorEnds.length < 2) return;

    const source = connector.connectorEnds[0];
    const target = connector.connectorEnds[1];

    // 获取源和目标的所有者名称
    const sourceName = this.getConnectorEndName(source);
    const targetName = this.getConnectorEndName(target);

    if (!sourceName || !targetName) return;

    const label = connector.name ? ` : ${this.sanitizeName(connector.name)}` : '';

    if (connector instanceof M.Succession) {
      this.relationships.push(`"${sourceName}" ..> "${targetName}"${label}`);
    } else if (connector instanceof M.BindingConnector) {
      this.relationships.push(`"${sourceName}" == "${targetName}"${label}`);
    } else {
      this.relationships.push(`"${sourceName}" -- "${targetName}"${label}`);
    }
  }

  // ================================================================
  // Utility Methods
  // ================================================================

  private getFeatureTypeName(feature: M.Feature): string {
    if (feature.ownedTypings.length > 0 && feature.ownedTypings[0].featureType) {
      return this.sanitizeName(feature.ownedTypings[0].featureType.name ?? '<unnamed>');
    }
    return 'any';
  }

  private formatMultiplicity(mult?: M.Multiplicity): string {
    if (!mult) return '';
    const lower = mult.lowerBound ?? 0;
    const upper = mult.upperBound === '*' ? '*' : (mult.upperBound ?? '*');

    if (lower === upper) return `[${lower}]`;
    if (lower === 0 && upper === '*') return '[*]';
    if (lower === 1 && upper === '*') return '[1..*]';
    return `[${lower}..${upper}]`;
  }

  private getConnectorEndName(end: M.ConnectorEnd): string | null {
    if (end.referencedFeature) {
      if (end.referencedFeature.owner && end.referencedFeature.owner.name) {
        return this.sanitizeName(end.referencedFeature.owner.name);
      }
      if (end.referencedFeature.name) {
        return this.sanitizeName(end.referencedFeature.name);
      }
    }
    if (end.name) {
      return this.sanitizeName(end.name);
    }
    return null;
  }

  private getStereotype(element: M.Element): string {
    const mc = (element as any).metaclass;
    if (!mc || mc === 'Class') return '';

    // 映射常见 metaclass 到 stereotype
    const stereoMap: Record<string, string> = {
      'Behavior': '<<behavior>>',
      'Function': '<<function>>',
      'Predicate': '<<predicate>>',
      'Interaction': '<<interaction>>',
      'Metaclass': '<<metaclass>>',
      'AttributeUsage': '<<attribute>>',
      'PartUsage': '<<part>>',
      'PortUsage': '<<port>>',
    };

    return stereoMap[mc] ? ` ${stereoMap[mc]}` : '';
  }

  /**
   * 清理名称，避免 PlantUML 特殊字符问题
   */
  private sanitizeName(name: string): string {
    // 替换可能导致 PlantUML 解析问题的字符
    return name
      .replace(/"/g, '\\"')
      .replace(/</g, '\\<')
      .replace(/>/g, '\\>');
  }
}