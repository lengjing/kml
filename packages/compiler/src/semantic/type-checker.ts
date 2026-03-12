// ============================================================
// KerML Type Checker / Conformance Checker
//
// Phase 5: 验证语义模型的类型一致性
//
// 检查项目:
// 1. 循环继承检测
// 2. 继承兼容性（Class 不能继承 DataType 等）
// 3. Feature 类型化合法性
// 4. Redefinition 一致性（方向、多重性）
// 5. Subsetting 一致性
// 6. Multiplicity 有效性（下界 <= 上界, 非负）
// 7. Connector 端点数量
// 8. Disjoining 一致性（不能与自身超类型 disjoint）
// 9. Enumeration 成员唯一性
// 10. Conjugation 合法性
// ============================================================

import * as M from '../model/elements';
import { ScopeBuilder } from './scope';

export interface TypeCheckError {
  severity: 'error' | 'warning' | 'info';
  code: string;      // 错误码，用于分类
  message: string;
  element: M.Element;
  relatedElements?: M.Element[];
}

export class TypeChecker {
  private errors: TypeCheckError[] = [];
  private scopeBuilder: ScopeBuilder;
  private checkedElements: Set<string> = new Set();

  constructor(scopeBuilder: ScopeBuilder) {
    this.scopeBuilder = scopeBuilder;
  }

  /**
   * 执行全面的类型检查
   */
  check(rootPackage: M.Package): TypeCheckError[] {
    this.errors = [];
    this.checkedElements = new Set();
    this.checkElementRecursive(rootPackage);
    return this.errors;
  }

  getErrors(): TypeCheckError[] {
    return this.errors;
  }

  getErrorCount(): number {
    return this.errors.filter(e => e.severity === 'error').length;
  }

  getWarningCount(): number {
    return this.errors.filter(e => e.severity === 'warning').length;
  }

  // ================================================================
  // Main Dispatch
  // ================================================================

  private checkElementRecursive(element: M.Element): void {
    // 避免重复检查
    if (this.checkedElements.has(element.elementId)) return;
    this.checkedElements.add(element.elementId);

    // 根据元素类型分派到具体检查方法
    if (element instanceof M.Enumeration) {
      this.checkEnumeration(element);
    }
    if (element instanceof M.Type) {
      this.checkType(element);
    }
    if (element instanceof M.Feature) {
      this.checkFeature(element);
    }
    if (element instanceof M.Connector) {
      this.checkConnector(element);
    }

    // 递归检查所有子元素
    for (const owned of element.ownedElements) {
      this.checkElementRecursive(owned);
    }
  }

  // ================================================================
  // Type Checks
  // ================================================================

  private checkType(type: M.Type): void {
    // 1. 循环继承检测
    this.checkCircularSpecialization(type);

    // 2. 继承兼容性
    for (const spec of type.ownedSpecializations) {
      if (spec.general && spec.specific) {
        this.checkSpecializationCompatibility(spec.specific, spec.general);
      }
      // 检查 general 是否已解析
      if (!spec.general) {
        this.addError('UNRESOLVED_GENERAL', 'warning',
          `Specialization of '${type.name ?? '<unnamed>'}' has unresolved general type`,
          type
        );
      }
    }

    // 3. Disjoining 一致性
    this.checkDisjoiningConsistency(type);

    // 4. Conjugation 合法性
    if (type.ownedConjugation) {
      this.checkConjugation(type);
    }

    // 5. Multiplicity 有效性
    if (type.multiplicity) {
      this.checkMultiplicityValidity(type.multiplicity, type);
    }

    // 6. Union/Intersection/Difference 一致性
    this.checkSetOperations(type);
  }

  /**
   * 检测循环继承
   */
  private checkCircularSpecialization(type: M.Type): void {
    const visited = new Set<string>();
    const stack = new Set<string>();

    const hasCycle = (t: M.Type): boolean => {
      const id = t.elementId;
      if (stack.has(id)) return true;
      if (visited.has(id)) return false;

      visited.add(id);
      stack.add(id);

      for (const spec of t.ownedSpecializations) {
        if (spec.general && spec.general instanceof M.Type) {
          if (hasCycle(spec.general)) return true;
        }
      }

      stack.delete(id);
      return false;
    };

    if (hasCycle(type)) {
      this.addError('CIRCULAR_SPECIALIZATION', 'error',
        `Circular specialization detected for type '${type.name ?? '<unnamed>'}'`,
        type
      );
    }
  }

  /**
   * 检查继承兼容性
   */
  private checkSpecializationCompatibility(specific: M.Type, general: M.Type): void {
    // Class 不能继承 DataType
    if (specific instanceof M.Class && !(specific instanceof M.DataType) &&
        general instanceof M.DataType && !(general instanceof M.Class)) {
      this.addError('INCOMPATIBLE_SPECIALIZATION', 'error',
        `Class '${specific.name ?? '<unnamed>'}' cannot specialize DataType '${general.name ?? '<unnamed>'}'. ` +
        `Classes and DataTypes are fundamentally different metaclasses.`,
        specific, [general]
      );
    }

    // DataType 不能继承 Class
    if (specific instanceof M.DataType && !(specific instanceof M.Class) &&
        general instanceof M.Class && !(general instanceof M.DataType)) {
      this.addError('INCOMPATIBLE_SPECIALIZATION', 'error',
        `DataType '${specific.name ?? '<unnamed>'}' cannot specialize Class '${general.name ?? '<unnamed>'}'`,
        specific, [general]
      );
    }

    // Association 应该继承 Association 或 Classifier
    if (specific instanceof M.Association && !(general instanceof M.Association) &&
        !(general instanceof M.Classifier)) {
      this.addError('ASSOC_SPECIALIZATION', 'warning',
        `Association '${specific.name ?? '<unnamed>'}' specializes non-association type '${general.name ?? '<unnamed>'}'`,
        specific, [general]
      );
    }

    // Behavior 应该继承 Behavior
    if (specific instanceof M.Behavior && !(general instanceof M.Behavior) &&
        !(general instanceof M.Class)) {
      this.addError('BEHAVIOR_SPECIALIZATION', 'warning',
        `Behavior '${specific.name ?? '<unnamed>'}' specializes non-behavior type '${general.name ?? '<unnamed>'}'`,
        specific, [general]
      );
    }

    // Predicate 应该继承 Predicate 或 Function
    if (specific instanceof M.Predicate && !(general instanceof M.Predicate) &&
        !(general instanceof M.Function)) {
      this.addError('PREDICATE_SPECIALIZATION', 'warning',
        `Predicate '${specific.name ?? '<unnamed>'}' specializes type that is neither Predicate nor Function`,
        specific, [general]
      );
    }
  }

  /**
   * 检查 disjoining 一致性
   */
  private checkDisjoiningConsistency(type: M.Type): void {
    const supertypes = this.collectAllSupertypes(type);

    for (const disj of type.ownedDisjoinings) {
      if (!disj.disjoinedType) continue;

      // 不能与自身的超类型 disjoint
      for (const supertype of supertypes) {
        if (disj.disjoinedType.elementId === supertype.elementId) {
          this.addError('DISJOINT_SUPERTYPE', 'error',
            `Type '${type.name ?? '<unnamed>'}' is declared disjoint from its own supertype '${supertype.name ?? '<unnamed>'}'`,
            type, [supertype]
          );
        }
      }

      // 不能与自身 disjoint
      if (disj.disjoinedType.elementId === type.elementId) {
        this.addError('DISJOINT_SELF', 'error',
          `Type '${type.name ?? '<unnamed>'}' is declared disjoint from itself`,
          type
        );
      }
    }
  }

  /**
   * 检查 conjugation 合法性
   */
  private checkConjugation(type: M.Type): void {
    const conj = type.ownedConjugation!;

    if (conj.originalType && conj.originalType.elementId === type.elementId) {
      this.addError('CONJUGATION_SELF', 'error',
        `Type '${type.name ?? '<unnamed>'}' is conjugated with itself`,
        type
      );
    }

    // Conjugated type 不能同时有继承关系
    if (type.ownedSpecializations.length > 0 && conj.originalType) {
      this.addError('CONJUGATION_WITH_SPECIALIZATION', 'warning',
        `Type '${type.name ?? '<unnamed>'}' has both conjugation and specialization, which may lead to ambiguity`,
        type
      );
    }
  }

  /**
   * 检查集合运算一致性
   */
  private checkSetOperations(type: M.Type): void {
    // Union 和 Intersection 不应同时指向相同类型
    const unionIds = new Set(type.ownedUnionings.map(u => u.unioningType?.elementId).filter(Boolean));
    const interIds = new Set(type.ownedIntersectings.map(i => i.intersectingType?.elementId).filter(Boolean));

    for (const id of unionIds) {
      if (interIds.has(id)) {
        this.addError('UNION_INTERSECT_CONFLICT', 'warning',
          `Type '${type.name ?? '<unnamed>'}' has the same type in both unioning and intersecting sets`,
          type
        );
        break;
      }
    }
  }

  // ================================================================
  // Feature Checks
  // ================================================================

  private checkFeature(feature: M.Feature): void {
    // 1. Feature typing 合法性
    for (const typing of feature.ownedTypings) {
      if (typing.featureType) {
        this.checkFeatureTypingValidity(feature, typing.featureType);
      }
    }

    // 2. Redefinition 一致性
    for (const redef of feature.ownedRedefinitions) {
      if (redef.redefinedFeature) {
        this.checkRedefinitionConformance(feature, redef.redefinedFeature);
      }
    }

    // 3. Subsetting 一致性
    for (const sub of feature.ownedSubsettings) {
      if (sub.subsettedFeature) {
        this.checkSubsettingConformance(feature, sub.subsettedFeature);
      }
    }

    // 4. Multiplicity 有效性
    if (feature.multiplicity) {
      this.checkMultiplicityValidity(feature.multiplicity, feature);
    }

    // 5. Composite/Direction 一致性
    this.checkFeatureModifierConsistency(feature);

    // 6. End feature 检查
    if (feature.isEnd) {
      this.checkEndFeature(feature);
    }
  }

  /**
   * Feature 类型化合法性
   */
  private checkFeatureTypingValidity(feature: M.Feature, type: M.Type): void {
    // Attribute 应该被 DataType 类型化
    if (feature instanceof M.AttributeFeature && type instanceof M.Class && !(type instanceof M.DataType)) {
      this.addError('ATTRIBUTE_CLASS_TYPING', 'warning',
        `Attribute '${feature.name ?? '<unnamed>'}' is typed by Class '${type.name ?? '<unnamed>'}' instead of a DataType. ` +
        `Consider using 'part' or 'item' instead of 'attribute'.`,
        feature, [type]
      );
    }

    // Part 通常应该被 Class 类型化
    if (feature instanceof M.PartFeature && type instanceof M.DataType && !(type instanceof M.Class)) {
      this.addError('PART_DATATYPE_TYPING', 'info',
        `Part '${feature.name ?? '<unnamed>'}' is typed by DataType '${type.name ?? '<unnamed>'}'. ` +
        `Consider using 'attribute' instead of 'part'.`,
        feature, [type]
      );
    }
  }

  /**
   * Redefinition 一致性检查
   */
  private checkRedefinitionConformance(redefining: M.Feature, redefined: M.Feature): void {
    // 方向必须兼容
    if (redefined.direction && redefining.direction && redefined.direction !== redefining.direction) {
      this.addError('REDEF_DIRECTION_MISMATCH', 'error',
        `Feature '${redefining.name ?? '<unnamed>'}' redefines '${redefined.name ?? '<unnamed>'}' ` +
        `but has incompatible direction ('${redefining.direction}' vs '${redefined.direction}')`,
        redefining, [redefined]
      );
    }

    // 如果 redefined 不是 readonly，redefining 可以是 readonly（加强约束可以）
    // 如果 redefined 是 readonly，redefining 也必须是 readonly
    if (redefined.isReadonly && !redefining.isReadonly) {
      this.addError('REDEF_READONLY_RELAXED', 'error',
        `Feature '${redefining.name ?? '<unnamed>'}' redefines readonly feature '${redefined.name ?? '<unnamed>'}' ` +
        `but is not declared readonly`,
        redefining, [redefined]
      );
    }

    // Multiplicity 兼容性
    if (redefined.multiplicity && redefining.multiplicity) {
      this.checkMultiplicityConformance(redefining.multiplicity, redefined.multiplicity, redefining);
    }

    // 类型兼容性（重定义的类型应该是被重定义类型的子类型）
    if (redefining.ownedTypings.length > 0 && redefined.ownedTypings.length > 0) {
      const redefType = redefining.ownedTypings[0].featureType;
      const origType = redefined.ownedTypings[0].featureType;

      if (redefType && origType) {
        if (!this.isSubtypeOf(redefType, origType)) {
          this.addError('REDEF_TYPE_INCOMPATIBLE', 'warning',
            `Feature '${redefining.name ?? '<unnamed>'}' redefines '${redefined.name ?? '<unnamed>'}' ` +
            `but its type '${redefType.name ?? '<unnamed>'}' may not be a subtype of '${origType.name ?? '<unnamed>'}'`,
            redefining, [redefined, redefType, origType]
          );
        }
      }
    }
  }

  /**
   * Subsetting 一致性检查
   */
  private checkSubsettingConformance(subsetting: M.Feature, subsetted: M.Feature): void {
    // Multiplicity: 子集的 upper bound 不应超过被子集化的 upper bound
    if (subsetting.multiplicity && subsetted.multiplicity) {
      const subUpper = this.getUpperBound(subsetting.multiplicity);
      const supUpper = this.getUpperBound(subsetted.multiplicity);

      if (subUpper !== Infinity && supUpper !== Infinity && subUpper > supUpper) {
        this.addError('SUBSET_MULT_EXCEEDS', 'warning',
          `Feature '${subsetting.name ?? '<unnamed>'}' subsets '${subsetted.name ?? '<unnamed>'}' ` +
          `but its upper bound (${subUpper}) exceeds the subsetted feature's upper bound (${supUpper})`,
          subsetting, [subsetted]
        );
      }
    }
  }

  /**
   * Feature modifier 一致性检查
   */
  private checkFeatureModifierConsistency(feature: M.Feature): void {
    // composite 和 portion 互斥
    if (feature.isComposite && feature.isPortion) {
      this.addError('COMPOSITE_PORTION_CONFLICT', 'error',
        `Feature '${feature.name ?? '<unnamed>'}' cannot be both composite and portion`,
        feature
      );
    }

    // derived 和 readonly 组合是有效的（只是信息提示）
    if (feature.isDerived && !feature.isReadonly) {
      this.addError('DERIVED_NOT_READONLY', 'info',
        `Derived feature '${feature.name ?? '<unnamed>'}' is not marked readonly`,
        feature
      );
    }

    // ordered 只对多值 feature 有意义
    if (feature.isOrdered && feature.multiplicity) {
      const upper = this.getUpperBound(feature.multiplicity);
      if (upper === 1) {
        this.addError('ORDERED_SINGLE', 'info',
          `Feature '${feature.name ?? '<unnamed>'}' is ordered but has multiplicity upper bound of 1`,
          feature
        );
      }
    }
  }

  /**
   * End feature 检查
   */
  private checkEndFeature(feature: M.Feature): void {
    // End feature 的所有者应该是 Association 或 Connector
    const owner = feature.owner;
    if (owner && !(owner instanceof M.Association) && !(owner instanceof M.Connector)) {
      this.addError('END_FEATURE_CONTEXT', 'warning',
        `End feature '${feature.name ?? '<unnamed>'}' is not owned by an Association or Connector`,
        feature
      );
    }
  }

  // ================================================================
  // Connector Checks
  // ================================================================

  private checkConnector(connector: M.Connector): void {
    // 至少需要 2 个端点
    if (connector.connectorEnds.length > 0 && connector.connectorEnds.length < 2) {
      this.addError('CONNECTOR_FEW_ENDS', 'warning',
        `Connector '${connector.name ?? '<unnamed>'}' has only ${connector.connectorEnds.length} end(s), expected at least 2`,
        connector
      );
    }

    // Binding connector 必须恰好 2 个端点
    if (connector instanceof M.BindingConnector) {
      if (connector.connectorEnds.length !== 2) {
        this.addError('BINDING_EXACTLY_TWO', 'error',
          `Binding connector '${connector.name ?? '<unnamed>'}' must have exactly 2 ends, has ${connector.connectorEnds.length}`,
          connector
        );
      }

      // Binding connector 的两端类型应该兼容
      if (connector.connectorEnds.length === 2) {
        const end1 = connector.connectorEnds[0];
        const end2 = connector.connectorEnds[1];
        if (end1.referencedFeature && end2.referencedFeature) {
          this.checkBindingTypeCompatibility(
            end1.referencedFeature, end2.referencedFeature, connector
          );
        }
      }
    }

    // Succession 检查
    if (connector instanceof M.Succession) {
      this.checkSuccession(connector);
    }

    // 检查端点引用是否已解析
    for (const end of connector.connectorEnds) {
      if (!end.referencedFeature) {
        this.addError('UNRESOLVED_CONNECTOR_END', 'warning',
          `Connector end '${end.name ?? '<unnamed>'}' of '${connector.name ?? '<unnamed>'}' has unresolved reference`,
          connector
        );
      }
    }
  }

  private checkBindingTypeCompatibility(
    feat1: M.Feature, feat2: M.Feature, connector: M.BindingConnector
  ): void {
    const types1 = feat1.ownedTypings.map(t => t.featureType).filter(Boolean);
    const types2 = feat2.ownedTypings.map(t => t.featureType).filter(Boolean);

    if (types1.length > 0 && types2.length > 0) {
      const type1 = types1[0]!;
      const type2 = types2[0]!;

      if (!this.isSubtypeOf(type1, type2) && !this.isSubtypeOf(type2, type1)) {
        this.addError('BINDING_TYPE_INCOMPATIBLE', 'warning',
          `Binding connector '${connector.name ?? '<unnamed>'}' connects features with potentially incompatible types: ` +
          `'${type1.name ?? '<unnamed>'}' and '${type2.name ?? '<unnamed>'}'`,
          connector, [feat1, feat2]
        );
      }
    }
  }

  private checkSuccession(succession: M.Succession): void {
    // Succession 的源和目标通常应该是同一类型上下文中的 steps
    // 这里做轻量级检查
    if (succession.connectorEnds.length >= 2) {
      const source = succession.connectorEnds[0].referencedFeature;
      const target = succession.connectorEnds[1].referencedFeature;

      if (source && target && source.owner !== target.owner) {
        this.addError('SUCCESSION_CONTEXT', 'info',
          `Succession '${succession.name ?? '<unnamed>'}' connects features from different contexts`,
          succession
        );
      }
    }
  }

  // ================================================================
  // Enumeration Checks
  // ================================================================

  private checkEnumeration(enumeration: M.Enumeration): void {
    // 成员名称唯一性
    const names = new Set<string>();
    for (const variant of enumeration.variants) {
      if (!variant.name) continue;
      if (names.has(variant.name)) {
        this.addError('DUPLICATE_ENUM_MEMBER', 'error',
          `Duplicate enumeration member '${variant.name}' in '${enumeration.name ?? '<unnamed>'}'`,
          enumeration
        );
      }
      names.add(variant.name);
    }

    // 空枚举警告
    if (enumeration.variants.length === 0) {
      this.addError('EMPTY_ENUMERATION', 'info',
        `Enumeration '${enumeration.name ?? '<unnamed>'}' has no members`,
        enumeration
      );
    }
  }

  // ================================================================
  // Multiplicity Checks
  // ================================================================

  private checkMultiplicityValidity(mult: M.Multiplicity, context: M.Element): void {
    const lower = mult.lowerBound;
    const upper = mult.upperBound;

    // 下界不能为负
    if (lower !== undefined && lower < 0) {
      this.addError('MULT_NEGATIVE_LOWER', 'error',
        `Lower bound of multiplicity cannot be negative (${lower}) for '${context.name ?? '<unnamed>'}'`,
        context
      );
    }

    // 上界不能为负（* 除外）
    if (upper !== undefined && upper !== '*' && typeof upper === 'number' && upper < 0) {
      this.addError('MULT_NEGATIVE_UPPER', 'error',
        `Upper bound of multiplicity cannot be negative (${upper}) for '${context.name ?? '<unnamed>'}'`,
        context
      );
    }

    // 下界不能超过上界
    if (lower !== undefined && upper !== undefined && upper !== '*') {
      if (typeof upper === 'number' && lower > upper) {
        this.addError('MULT_LOWER_EXCEEDS_UPPER', 'error',
          `Lower bound (${lower}) exceeds upper bound (${upper}) for '${context.name ?? '<unnamed>'}'`,
          context
        );
      }
    }
  }

  private checkMultiplicityConformance(
    specific: M.Multiplicity,
    general: M.Multiplicity,
    context: M.Element
  ): void {
    const specUpper = this.getUpperBound(specific);
    const genUpper = this.getUpperBound(general);

    if (specUpper !== Infinity && genUpper !== Infinity && specUpper > genUpper) {
      this.addError('MULT_UPPER_EXCEEDS_GENERAL', 'warning',
        `Multiplicity upper bound (${specUpper}) of '${context.name ?? '<unnamed>'}' ` +
        `exceeds that of its general feature (${genUpper})`,
        context
      );
    }

    // 下界收紧检查
    const specLower = specific.lowerBound ?? 0;
    const genLower = general.lowerBound ?? 0;
    if (specLower < genLower) {
      this.addError('MULT_LOWER_RELAXED', 'warning',
        `Multiplicity lower bound (${specLower}) of '${context.name ?? '<unnamed>'}' ` +
        `is less than that of its general feature (${genLower})`,
        context
      );
    }
  }

  // ================================================================
  // Helper Methods
  // ================================================================

  private getUpperBound(mult: M.Multiplicity): number {
    if (mult.upperBound === undefined) return Infinity;
    if (mult.upperBound === '*') return Infinity;
    return mult.upperBound;
  }

  /**
   * 判断 subType 是否是 superType 的子类型
   * 沿继承链向上搜索
   */
  private isSubtypeOf(subType: M.Type, superType: M.Type): boolean {
    if (subType.elementId === superType.elementId) return true;

    const visited = new Set<string>();
    const check = (t: M.Type): boolean => {
      if (visited.has(t.elementId)) return false;
      visited.add(t.elementId);

      if (t.elementId === superType.elementId) return true;

      for (const spec of t.ownedSpecializations) {
        if (spec.general && check(spec.general)) return true;
      }

      return false;
    };

    return check(subType);
  }

  /**
   * 收集所有超类型（传递闭包）
   */
  private collectAllSupertypes(type: M.Type): M.Type[] {
    const result: M.Type[] = [];
    const visited = new Set<string>();

    const collect = (t: M.Type) => {
      for (const spec of t.ownedSpecializations) {
        if (spec.general && !visited.has(spec.general.elementId)) {
          visited.add(spec.general.elementId);
          result.push(spec.general);
          collect(spec.general);
        }
      }
    };

    collect(type);
    return result;
  }

  /**
   * 添加类型检查错误/警告
   */
  private addError(
    code: string,
    severity: 'error' | 'warning' | 'info',
    message: string,
    element: M.Element,
    relatedElements?: M.Element[]
  ): void {
    this.errors.push({
      severity,
      code,
      message,
      element,
      relatedElements,
    });
  }
}