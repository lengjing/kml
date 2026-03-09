// ============================================================
// KerML Name Resolver
// Phase 4: 解析模型构建阶段收集的所有未解析引用
//
// 解析策略:
// 1. 先处理 import，将导入的名称注入到对应 scope
// 2. 再处理所有其他引用（typing, specialization 等）
// 3. 对每个引用，从其上下文 scope 开始查找，逐级向上
// 4. 最后尝试从根 scope 进行限定名查找
// ============================================================

import * as M from '../model/elements';
import { Scope, ScopeBuilder, SymbolEntry } from './scope';

export interface UnresolvedRef {
  kind: 'import' | 'specialization' | 'typing' | 'subsetting' | 'redefinition' |
        'reference' | 'conjugation' | 'disjoining' | 'unioning' | 'intersecting' |
        'differencing' | 'connector-end' | 'binding-source' | 'binding-target' |
        'succession-source' | 'succession-target' | 'alias' | 'dependency-client' |
        'dependency-supplier' | 'metadata-metaclass' | 'metadata-about' | 'comment-about';
  qualifiedName: string;
  element: M.Element;
  parent: M.Namespace;
  targetSlot?: string;
}

export interface ResolutionError {
  message: string;
  qualifiedName: string;
  refKind: string;
  element: M.Element;
  contextElement?: M.Element;
}

export interface ResolutionStatistics {
  totalRefs: number;
  resolvedRefs: number;
  failedRefs: number;
  importRefs: number;
}

export class NameResolver {
  private rootScope: Scope;
  private scopeBuilder: ScopeBuilder;
  private errors: ResolutionError[] = [];
  private stats: ResolutionStatistics = {
    totalRefs: 0,
    resolvedRefs: 0,
    failedRefs: 0,
    importRefs: 0,
  };

  constructor(rootPackage: M.Package) {
    this.scopeBuilder = new ScopeBuilder(rootPackage);
    this.rootScope = this.scopeBuilder.build(rootPackage);
  }

  /**
   * 解析所有未解析的引用
   * 返回解析过程中发现的错误列表
   */
  resolve(unresolvedRefs: UnresolvedRef[]): ResolutionError[] {
    this.errors = [];
    this.stats = {
      totalRefs: unresolvedRefs.length,
      resolvedRefs: 0,
      failedRefs: 0,
      importRefs: 0,
    };

    // Phase 1: 处理所有 import 引用
    const importRefs = unresolvedRefs.filter(r => r.kind === 'import');
    const nonImportRefs = unresolvedRefs.filter(r => r.kind !== 'import');
    this.stats.importRefs = importRefs.length;

    for (const ref of importRefs) {
      this.resolveImport(ref);
    }

    // Phase 2: 处理所有其他引用
    for (const ref of nonImportRefs) {
      this.resolveReference(ref);
    }

    return this.errors;
  }

  getRootScope(): Scope {
    return this.rootScope;
  }

  getScopeBuilder(): ScopeBuilder {
    return this.scopeBuilder;
  }

  getStatistics(): ResolutionStatistics {
    return { ...this.stats };
  }

  // ================================================================
  // Import Resolution
  // ================================================================

  private resolveImport(ref: UnresolvedRef): void {
    const imp = ref.element as M.Import;
    const contextScope = this.findContextScope(ref.parent);

    if (!contextScope) {
      this.addError(ref, `Cannot find scope for import context`);
      return;
    }

    // 尝试在根 scope 中查找
    const entries = this.rootScope.lookupQualified(ref.qualifiedName);

    if (entries.length === 0) {
      // 也尝试从上下文 scope 查找
      const contextEntries = contextScope.lookupQualified(ref.qualifiedName);
      if (contextEntries.length === 0) {
        this.addError(ref, `Cannot resolve import '${ref.qualifiedName}'`);
        return;
      }
      this.processImportEntries(contextEntries, imp, contextScope, ref);
      return;
    }

    this.processImportEntries(entries, imp, contextScope, ref);
  }

  private processImportEntries(
    entries: SymbolEntry[],
    imp: M.Import,
    contextScope: Scope,
    ref: UnresolvedRef
  ): void {
    const importedElement = entries[0].element;

    if (importedElement instanceof M.Namespace) {
      imp.importedNamespace = importedElement;
    }

    if (imp.isWildcard && importedElement instanceof M.Namespace) {
      // 通配符导入：导入所有公共成员
      const importedScope = this.scopeBuilder.getScopeForElement(importedElement);
      if (importedScope) {
        const visibleSymbols = importedScope.getAllVisibleSymbols(false);
        for (const sym of visibleSymbols) {
          contextScope.define(
            sym.name, sym.element,
            imp.visibility as any ?? 'public',
            true,
            `import(${ref.qualifiedName}::*)`
          );
        }
      }
    } else {
      // 命名导入
      const name = importedElement.name ?? ref.qualifiedName.split('::').pop()!;
      contextScope.define(
        name, importedElement,
        imp.visibility as any ?? 'public',
        true,
        `import(${ref.qualifiedName})`
      );
    }

    // 递归导入
    if (imp.isRecursive && importedElement instanceof M.Namespace) {
      this.importRecursive(importedElement, contextScope, imp, ref.qualifiedName);
    }

    this.stats.resolvedRefs++;
  }

  private importRecursive(
    ns: M.Namespace,
    targetScope: Scope,
    imp: M.Import,
    baseName: string
  ): void {
    for (const member of ns.members) {
      if (member.name) {
        targetScope.define(
          member.name, member,
          imp.visibility as any ?? 'public',
          true,
          `recursive-import(${baseName})`
        );
      }
      if (member instanceof M.Namespace) {
        this.importRecursive(member, targetScope, imp, `${baseName}::${member.name ?? '?'}`);
      }
    }
  }

  // ================================================================
  // General Reference Resolution
  // ================================================================

  private resolveReference(ref: UnresolvedRef): void {
    const contextScope = this.findContextScope(ref.parent);

    if (!contextScope) {
      this.addError(ref, `Cannot find scope for reference context`);
      return;
    }

    const resolved = this.resolveQualifiedName(ref.qualifiedName, contextScope);

    if (!resolved) {
      this.addError(ref, `Cannot resolve '${ref.qualifiedName}'`);
      return;
    }

    // 将解析结果应用到对应的模型元素
    this.applyResolution(ref, resolved);
    this.stats.resolvedRefs++;
  }

  /**
   * 多策略名称解析
   */
  private resolveQualifiedName(qualifiedName: string, contextScope: Scope): M.Element | null {
    // 策略 1: 从上下文 scope 开始限定名查找
    let entries = contextScope.lookupQualified(qualifiedName);
    if (entries.length > 0) return entries[0].element;

    // 策略 2: 简单名查找（沿 scope 链向上）
    entries = contextScope.lookup(qualifiedName);
    if (entries.length > 0) return entries[0].element;

    // 策略 3: 从根 scope 开始限定名查找
    entries = this.rootScope.lookupQualified(qualifiedName);
    if (entries.length > 0) return entries[0].element;

    // 策略 4: 尝试以 "::" 分隔的最后一段作为简单名查找
    const lastSegment = qualifiedName.split('::').pop();
    if (lastSegment && lastSegment !== qualifiedName) {
      entries = contextScope.lookup(lastSegment);
      if (entries.length > 0) return entries[0].element;
    }

    // 策略 5: 尝试以 "." 分隔的路径查找
    if (qualifiedName.includes('.')) {
      const dotSegments = qualifiedName.split('.');
      const colonSeparated = dotSegments.join('::');
      entries = this.rootScope.lookupQualified(colonSeparated);
      if (entries.length > 0) return entries[0].element;
    }

    return null;
  }

  // ================================================================
  // Resolution Application
  // ================================================================

  /**
   * 将解析结果应用到具体的模型关系上
   */
  private applyResolution(ref: UnresolvedRef, resolved: M.Element): void {
    const element = ref.element;
    const slot = ref.targetSlot;

    // 如果有 targetSlot，使用通用的 slot 设置
    if (slot) {
      this.applySlot(ref, resolved);
      return;
    }

    // 根据 ref.kind 做特殊处理（无 targetSlot 的情况）
    switch (ref.kind) {
      case 'alias':
        if (element instanceof M.AliasElement) {
          element.aliasedElement = resolved;
        }
        break;

      case 'dependency-client':
        if (element instanceof M.Dependency) {
          element.clients.push(resolved);
        }
        break;

      case 'dependency-supplier':
        if (element instanceof M.Dependency) {
          element.suppliers.push(resolved);
        }
        break;

      case 'comment-about':
        if (element instanceof M.Comment) {
          element.aboutElements.push(resolved);
        }
        break;

      case 'metadata-about':
        if (element instanceof M.MetadataFeature) {
          element.aboutElements.push(resolved);
        }
        break;

      default:
        // 尝试用 applySlot
        this.applySlot(ref, resolved);
        break;
    }
  }

  /**
   * 按照 targetSlot 名称设置关系目标
   */
  private applySlot(ref: UnresolvedRef, resolved: M.Element): void {
    const element = ref.element;
    const slot = ref.targetSlot;

    switch (ref.kind) {
      case 'specialization': {
        const spec = element as M.Specialization;
        if (slot === 'general' && resolved instanceof M.Type) {
          spec.general = resolved;
        } else if (slot === 'specific' && resolved instanceof M.Type) {
          spec.specific = resolved;
        }
        break;
      }

      case 'typing': {
        const typing = element as M.FeatureTyping;
        if (slot === 'featureType' && resolved instanceof M.Type) {
          typing.featureType = resolved;
        }
        break;
      }

      case 'subsetting':
      case 'reference': {
        const sub = element as M.Subsetting;
        if (slot === 'subsettedFeature' && resolved instanceof M.Feature) {
          sub.subsettedFeature = resolved;
        }
        break;
      }

      case 'redefinition': {
        const redef = element as M.Redefinition;
        if (slot === 'redefinedFeature' && resolved instanceof M.Feature) {
          redef.redefinedFeature = resolved;
          redef.subsettedFeature = resolved;
        }
        break;
      }

      case 'conjugation': {
        const conj = element as M.Conjugation;
        if (slot === 'originalType' && resolved instanceof M.Type) {
          conj.originalType = resolved;
        } else if (slot === 'conjugatedType' && resolved instanceof M.Type) {
          conj.conjugatedType = resolved;
        }
        break;
      }

      case 'disjoining': {
        const disj = element as M.Disjoining;
        if (slot === 'disjoiningType' && resolved instanceof M.Type) {
          disj.disjoiningType = resolved;
        } else if (slot === 'disjoinedType' && resolved instanceof M.Type) {
          disj.disjoinedType = resolved;
        }
        break;
      }

      case 'unioning': {
        const uni = element as M.Unioning;
        if (slot === 'unioningType' && resolved instanceof M.Type) {
          uni.unioningType = resolved;
        }
        break;
      }

      case 'intersecting': {
        const inter = element as M.Intersecting;
        if (slot === 'intersectingType' && resolved instanceof M.Type) {
          inter.intersectingType = resolved;
        }
        break;
      }

      case 'differencing': {
        const diff = element as M.Differencing;
        if (slot === 'differencingType' && resolved instanceof M.Type) {
          diff.differencingType = resolved;
        }
        break;
      }

      case 'connector-end':
      case 'binding-source':
      case 'binding-target':
      case 'succession-source':
      case 'succession-target': {
        const end = element as M.ConnectorEnd;
        if (slot === 'referencedFeature' && resolved instanceof M.Feature) {
          end.referencedFeature = resolved;
        }
        break;
      }

      case 'metadata-metaclass': {
        const md = element as M.MetadataFeature;
        if (slot === 'metaclassRef' && resolved instanceof M.Metaclass) {
          md.metaclassRef = resolved;
        }
        break;
      }
    }
  }

  // ================================================================
  // Helpers
  // ================================================================

  /**
   * 为给定元素找到最近的 scope
   * 沿 owner 链向上查找
   */
  private findContextScope(element: M.Element): Scope | null {
    let current: M.Element | undefined = element;
    while (current) {
      const scope = this.scopeBuilder.getScopeForElement(current);
      if (scope) return scope;
      current = current.owner;
    }
    return this.rootScope;
  }

  private addError(ref: UnresolvedRef, message: string): void {
    this.stats.failedRefs++;
    this.errors.push({
      message,
      qualifiedName: ref.qualifiedName,
      refKind: ref.kind,
      element: ref.element,
      contextElement: ref.parent,
    });
  }
}