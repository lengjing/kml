// ============================================================
// KerML Code Printer
// 管理缩进、换行、输出缓冲的底层工具
// ============================================================

export interface PrinterOptions {
  indentStr: string;        // 缩进字符串，默认 '  '（2空格）
  newline: string;          // 换行符
  maxBlankLines: number;    // 最大连续空行数
}

const DEFAULT_OPTIONS: PrinterOptions = {
  indentStr: '  ',
  newline: '\n',
  maxBlankLines: 2,
};

export class Printer {
  private buf: string[] = [];
  private level: number = 0;
  private opts: PrinterOptions;
  private lastWasBlank: number = 0; // 连续空行计数

  constructor(opts?: Partial<PrinterOptions>) {
    this.opts = { ...DEFAULT_OPTIONS, ...opts };
  }

  // ---- 缩进控制 ----

  indent(): this {
    this.level++;
    return this;
  }

  dedent(): this {
    if (this.level > 0) this.level--;
    return this;
  }

  getIndent(): string {
    return this.opts.indentStr.repeat(this.level);
  }

  getLevel(): number {
    return this.level;
  }

  // ---- 写入 ----

  /** 写入一行（自动添加当前缩进 + 换行） */
  line(text: string): this {
    this.lastWasBlank = 0;
    this.buf.push(this.getIndent() + text + this.opts.newline);
    return this;
  }

  /** 写入空行 */
  blank(): this {
    if (this.lastWasBlank < this.opts.maxBlankLines) {
      this.buf.push(this.opts.newline);
      this.lastWasBlank++;
    }
    return this;
  }

  /** 写入原始字符串（不加缩进/换行） */
  raw(text: string): this {
    this.lastWasBlank = 0;
    this.buf.push(text);
    return this;
  }

  /** 写入带缩进的内容但不换行 */
  write(text: string): this {
    this.lastWasBlank = 0;
    this.buf.push(this.getIndent() + text);
    return this;
  }

  /** 写入一个块：header { body } */
  block(header: string, bodyFn: () => void): this {
    this.line(header + ' {');
    this.indent();
    bodyFn();
    this.dedent();
    this.line('}');
    return this;
  }

  /** 写入一个块或分号（body 为空时用 ;） */
  blockOrSemicolon(header: string, bodyFn: () => boolean): this {
    // bodyFn 返回 true 表示有内容
    const snapshot = this.buf.length;
    this.line(header + ' {');
    this.indent();
    const hasContent = bodyFn();
    this.dedent();

    if (!hasContent) {
      // 回退，用分号替代
      this.buf.length = snapshot;
      this.line(header + ';');
    } else {
      this.line('}');
    }

    return this;
  }

  // ---- 输出 ----

  toString(): string {
    return this.buf.join('');
  }

  reset(): void {
    this.buf = [];
    this.level = 0;
    this.lastWasBlank = 0;
  }
}