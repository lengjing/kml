// ============================================================
// KerML Scope & Symbol Table
// Implements hierarchical scoping for name resolution
// per KerML visibility and namespace membership rules
// ============================================================

import * as M from '../model/elements';

export interface SymbolEntry {
  name: string;
  element: M.Element;
  visibility: 'public' | 'private' | 'protected';
  isImported: boolean;
  source?: string; // 来源信息用于调试
}

export class Scope {
  private symbols: Map<string, SymbolEntry[]> = new Map();
  private parent: Scope | null;
  private element: M.Element;
  private children: Scope[] = [];

  constructor(element: M.Element, parent: Scope | null = null) {
    this.element = element;
    this.parent = parent;
    if (parent) {
      parent.children.push(this);
    }
  }

  getElement(): M.Element {
    return this.element;
  }

  getParent(): Scope | null {
    return this.parent;
  }

  getChildren(): Scope[] {
    return this.children;
  }

  /**
   * 在当前 scope 中定义一个符号
   */
  define(
    name: string,
    element: M.Element,
    visibility: 'public' | 'private' | 'protected' = 'public',
    isImported: boolean = false,
    source?: string
  ): void {
    const entry: SymbolEntry = { name, element, visibility, isImported, source };
    const existing = this.symbols.get(name);
    if (existing) {
      // 检查是否已经存在相同元素
      const duplicate = existing.find(e => e.element.elementId === element.elementId);
      if (!duplicate) {
        existing.push(entry);
      }
    } else {
      this.symbols.set(name, [entry]);
    }
  }

  /**
   * 仅在当前 scope 中查找名称
   */
  lookupLocal(name: string): SymbolEntry[] {
    return this.symbols.get(name) ?? [];
  }

  /**
   * 查找名称，沿着 scope 链向上搜索
   */
  lookup(name: string): SymbolEntry[] {
    const local = this.lookupLocal(name);
    if (local.length > 0) return local;
    if (this.parent) return this.parent.lookup(name);
    return [];
  }

  /**
   * 查找限定名称（如 "A::B::C"）
   * 从当前 scope 出发，逐级解析
   */
  lookupQualified(qualifiedName: string): SymbolEntry[] {
    const segments = qualifiedName.split('::');
    if (segments.length === 0) return [];

    if (segments.length === 1) {
      return this.lookup(segments[0]);
    }

    // 找到第一段
    const firstEntries = this.lookup(segments[0]);
    if (firstEntries.length === 0) return [];

    // 逐级导航剩余段
    let currentEntries = firstEntries;
    for (let i = 1; i < segments.length; i++) {
      const nextEntries: SymbolEntry[] = [];
      for (const entry of currentEntries) {
        const childScope = this.findChildScopeForElement(entry.element);
        if (childScope) {
          const found = childScope.lookupLocal(segments[i]);
          nextEntries.push(...found);
        }
      }
      if (nextEntries.length === 0) return [];
      currentEntries = nextEntries;
    }

    return currentEntries;
  }

  /**
   * 在所有后代 scope 中递归查找元素关联的子 scope
   */
  private findChildScopeForElement(element: M.Element): Scope | null {
    for (const child of this.children) {
      if (child.element === element) return child;
    }
    // 递归向下
    for (const child of this.children) {
      const found = child.findChildScopeForElement(element);
      if (found) return found;
    }
    return null;
  }

  /**
   * 从根 scope 开始进行全局限定名查找
   */
  lookupQualifiedFromRoot(qualifiedName: string): SymbolEntry[] {
    let root: Scope = this;
    while (root.parent) {
      root = root.parent;
    }
    return root.lookupQualified(qualifiedName);
  }

  /**
   * 获取当前 scope 中所有可见符号
   */
  getAllVisibleSymbols(includePrivate: boolean = false): SymbolEntry[] {
    const result: SymbolEntry[] = [];
    for (const [, entries] of this.symbols) {
      for (const entry of entries) {
        if (includePrivate || entry.visibility !== 'private') {
          result.push(entry);
        }
      }
    }
    return result;
  }

  /**
   * 获取所有已定义的符号名称
   */
  getAllSymbolNames(): string[] {
    return Array.from(this.symbols.keys());
  }

  /**
   * 获取符号数量
   */
  getSymbolCount(): number {
    let count = 0;
    for (const [, entries] of this.symbols) {
      count += entries.length;
    }
    return count;
  }

  /**
   * 调试输出 scope 树
   */
  dump(indent: number = 0): string {
    const prefix = '  '.repeat(indent);
    const elementName = this.element.name ?? '<anonymous>';
    const metaclass = (this.element as any).metaclass ?? 'Element';
    let result = `${prefix}┌─ Scope [${metaclass} '${elementName}'] (${this.getSymbolCount()} symbols)\n`;

    // 输出本 scope 中的符号
    const sortedKeys = Array.from(this.symbols.keys()).sort();
    for (const name of sortedKeys) {
      const entries = this.symbols.get(name)!;
      for (const entry of entries) {
        const vis = entry.visibility === 'public' ? '＋' : entry.visibility === 'private' ? '－' : '＃';
        const imp = entry.isImported ? ' (imported)' : '';
        const mc = (entry.element as any).metaclass ?? 'Element';
        result += `${prefix}│  ${vis} ${name} : ${mc}${imp}\n`;
      }
    }

    // 递归输出子 scope
    for (let i = 0; i < this.children.length; i++) {
      const isLast = i === this.children.length - 1;
      result += this.children[i].dump(indent + 1);
    }

    result += `${prefix}└─\n`;
    return result;
  }
}

// ============================================================
// Scope Builder
// 遍历模型元素树，构建 scope 层次结构
// ============================================================

export class ScopeBuilder {
  private rootScope: Scope;
  private scopeMap: Map<string, Scope> = new Map(); // elementId -> Scope
  private elementMap: Map<string, M.Element> = new Map(); // elementId -> Element

  constructor(rootElement: M.Element) {
    this.rootScope = new Scope(rootElement);
    this.scopeMap.set(rootElement.elementId, this.rootScope);
    this.elementMap.set(rootElement.elementId, rootElement);
  }

  /**
   * 构建完整的 scope 树
   */
  build(rootElement: M.Element): Scope {
    this.buildScopeRecursive(rootElement, this.rootScope);
    return this.rootScope;
  }

  getRootScope(): Scope {
    return this.rootScope;
  }

  /**
   * 获取元素对应的 scope
   */
  getScopeForElement(element: M.Element): Scope | undefined {
    return this.scopeMap.get(element.elementId);
  }

  /**
   * 按照名称全局搜索元素
   */
  findElementByQualifiedName(qualifiedName: string): M.Element | undefined {
    const entries = this.rootScope.lookupQualified(qualifiedName);
    return entries.length > 0 ? entries[0].element : undefined;
  }

  /**
   * 获取所有已注册的元素
   */
  getAllElements(): M.Element[] {
    return Array.from(this.elementMap.values());
  }

  private buildScopeRecursive(element: M.Element, parentScope: Scope): void {
    this.elementMap.set(element.elementId, element);

    if (element instanceof M.Namespace) {
      // Namespace 类型的元素需要创建子 scope
      const scope = this.getOrCreateScope(element, parentScope);

      // 将此元素注册到父 scope（如果有名称且不是根）
      if (element.name && element.name !== '<root>' && parentScope !== scope) {
        const visibility = this.inferVisibility(element);
        parentScope.define(element.name, element, visibility, false, 'member');
      }

      // 注册所有直接成员
      for (const member of element.members) {
        if (member.name) {
          const visibility = this.inferVisibility(member);
          scope.define(member.name, member, visibility, false, 'member');
        }
        this.buildScopeRecursive(member, scope);
      }

      // 如果是 Type，注册其拥有的 features
      if (element instanceof M.Type) {
        for (const feature of element.ownedFeatures) {
          if (feature.name) {
            scope.define(feature.name, feature, 'public', false, 'feature');
          }
          // Feature 本身也可能是 namespace（有子成员）
          this.buildScopeRecursive(feature, scope);
        }
      }

      // 如果是 Enumeration，注册枚举值
      if (element instanceof M.Enumeration) {
        for (const variant of element.variants) {
          if (variant.name) {
            scope.define(variant.name, variant, 'public', false, 'enumMember');
          }
        }
      }

      // 如果是 Behavior/Function，注册参数
      if (element instanceof M.Behavior) {
        for (const param of element.parameters) {
          if (param.name) {
            scope.define(param.name, param, 'public', false, 'parameter');
          }
          this.buildScopeRecursive(param, scope);
        }
      }

    } else {
      // 非 Namespace 类型的元素，仅注册名称
      if (element.name) {
        const visibility = this.inferVisibility(element);
        parentScope.define(element.name, element, visibility, false, 'owned');
      }

      // 仍然需要处理其子元素
      for (const child of element.ownedElements) {
        this.buildScopeRecursive(child, parentScope);
      }
    }
  }

  private getOrCreateScope(element: M.Element, parentScope: Scope): Scope {
    let scope = this.scopeMap.get(element.elementId);
    if (!scope) {
      scope = new Scope(element, parentScope);
      this.scopeMap.set(element.elementId, scope);
    }
    return scope;
  }

  /**
   * 推断元素的可见性
   * KerML 默认可见性为 public
   */
  private inferVisibility(element: M.Element): 'public' | 'private' | 'protected' {
    // 可以从 AST 中获取，目前默认 public
    return 'public';
  }
}