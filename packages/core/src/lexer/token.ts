// ============================================================
// KerML Token Definitions
// Covers all keywords, operators, and token types per KerML spec
// ============================================================

export enum TokenType {
  // Literals
  IntegerLiteral = 'IntegerLiteral',
  RealLiteral = 'RealLiteral',
  StringLiteral = 'StringLiteral',
  BooleanLiteral = 'BooleanLiteral',
  NullLiteral = 'NullLiteral',

  // Identifier
  Identifier = 'Identifier',
  UnrestrictedName = 'UnrestrictedName', // 'quoted name'

  // ---- KerML Keywords (Root / Namespace) ----
  KW_package = 'KW_package',
  KW_namespace = 'KW_namespace',
  KW_dependency = 'KW_dependency',
  KW_import = 'KW_import',
  KW_alias = 'KW_alias',

  // ---- Type Keywords ----
  KW_type = 'KW_type',
  KW_classifier = 'KW_classifier',
  KW_class = 'KW_class',
  KW_struct = 'KW_struct',
  KW_assoc = 'KW_assoc',
  KW_assocStruct = 'KW_assocStruct',
  KW_datatype = 'KW_datatype',
  KW_enum = 'KW_enum',

  // ---- Feature Keywords ----
  KW_feature = 'KW_feature',
  KW_attribute = 'KW_attribute',
  KW_item = 'KW_item',
  KW_part = 'KW_part',
  KW_port = 'KW_port',
  KW_connection = 'KW_connection',
  KW_flow = 'KW_flow',
  KW_interface = 'KW_interface',
  KW_allocation = 'KW_allocation',
  KW_end = 'KW_end',
  KW_readonly = 'KW_readonly',
  KW_derived = 'KW_derived',
  KW_ordered = 'KW_ordered',
  KW_nonunique = 'KW_nonunique',
  KW_unique = 'KW_unique',

  // ---- Relationship Keywords ----
  KW_specialization = 'KW_specialization',
  KW_conjugation = 'KW_conjugation',
  KW_disjoining = 'KW_disjoining',
  KW_unioning = 'KW_unioning',
  KW_intersecting = 'KW_intersecting',
  KW_differencing = 'KW_differencing',
  KW_typing = 'KW_typing',
  KW_subtype = 'KW_subtype',
  KW_subset = 'KW_subset',
  KW_superset = 'KW_superset',
  KW_redefinition = 'KW_redefinition',
  KW_redefines = 'KW_redefines',
  KW_subsets = 'KW_subsets',
  KW_references = 'KW_references',
  KW_typed = 'KW_typed',
  KW_by = 'KW_by',

  // ---- Behavior / Function Keywords ----
  KW_behavior = 'KW_behavior',
  KW_step = 'KW_step',
  KW_function = 'KW_function',
  KW_expr = 'KW_expr',
  KW_predicate = 'KW_predicate',
  KW_bool = 'KW_bool',
  KW_interaction = 'KW_interaction',
  KW_return = 'KW_return',
  KW_result = 'KW_result',

  // ---- Connector Keywords ----
  KW_connector = 'KW_connector',
  KW_binding = 'KW_binding',
  KW_succession = 'KW_succession',
  KW_then = 'KW_then',
  KW_first = 'KW_first',

  // ---- Multiplicity ----
  KW_multiplicity = 'KW_multiplicity',

  // ---- Comment / Documentation ----
  KW_comment = 'KW_comment',
  KW_doc = 'KW_doc',
  KW_about = 'KW_about',
  KW_locale = 'KW_locale',
  KW_rep = 'KW_rep',

  // ---- Metadata ----
  KW_metaclass = 'KW_metaclass',
  KW_metadata = 'KW_metadata',
  KW_meta = 'KW_meta',

  // ---- Visibility ----
  KW_public = 'KW_public',
  KW_private = 'KW_private',
  KW_protected = 'KW_protected',

  // ---- Misc Keywords ----
  KW_abstract = 'KW_abstract',
  KW_in = 'KW_in',
  KW_out = 'KW_out',
  KW_inout = 'KW_inout',
  KW_from = 'KW_from',
  KW_to = 'KW_to',
  KW_all = 'KW_all',
  KW_istype = 'KW_istype',
  KW_hastype = 'KW_hastype',
  KW_as = 'KW_as',
  KW_if = 'KW_if',
  KW_else = 'KW_else',
  KW_implies = 'KW_implies',
  KW_or = 'KW_or',
  KW_xor = 'KW_xor',
  KW_and = 'KW_and',
  KW_not = 'KW_not',
  KW_true = 'KW_true',
  KW_false = 'KW_false',
  KW_null = 'KW_null',
  KW_inv = 'KW_inv',
  KW_individuality = 'KW_individuality',
  KW_snapshot = 'KW_snapshot',
  KW_timeslice = 'KW_timeslice',
  KW_LibraryPackage = 'KW_LibraryPackage',
  KW_composite = 'KW_composite',
  KW_portion = 'KW_portion',
  KW_of = 'KW_of',
  KW_for = 'KW_for',
  KW_specializes = 'KW_specializes',
  KW_conjugates = 'KW_conjugates',
  KW_disjoint = 'KW_disjoint',

  // ---- Operators / Punctuation ----
  Semicolon = 'Semicolon',           // ;
  Colon = 'Colon',                   // :
  ColonColon = 'ColonColon',         // ::
  ColonGt = 'ColonGt',              // :>
  ColonGtGt = 'ColonGtGt',          // :>>
  TildeGt = 'TildeGt',             // ~>  (conjugation)
  Dot = 'Dot',                       // .
  DotDot = 'DotDot',                 // ..
  Comma = 'Comma',                   // ,
  Eq = 'Eq',                         // =
  EqEq = 'EqEq',                     // ==
  BangEq = 'BangEq',                 // !=
  EqEqEq = 'EqEqEq',                // ===
  BangEqEq = 'BangEqEq',            // !==
  Lt = 'Lt',                         // <
  Gt = 'Gt',                         // >
  LtEq = 'LtEq',                     // <=
  GtEq = 'GtEq',                     // >=
  Plus = 'Plus',                      // +
  Minus = 'Minus',                    // -
  Star = 'Star',                      // *
  Slash = 'Slash',                    // /
  Percent = 'Percent',                // %
  StarStar = 'StarStar',              // **
  At = 'At',                          // @
  Hash = 'Hash',                      // #
  Tilde = 'Tilde',                    // ~
  Amp = 'Amp',                        // &
  Pipe = 'Pipe',                      // |
  Caret = 'Caret',                    // ^
  Bang = 'Bang',                      // !
  Question = 'Question',              // ?
  Arrow = 'Arrow',                    // ->
  FatArrow = 'FatArrow',              // =>
  DotGt = 'DotGt',                    // .>  (feature chaining)

  // Delimiters
  LParen = 'LParen',                  // (
  RParen = 'RParen',                  // )
  LBracket = 'LBracket',              // [
  RBracket = 'RBracket',              // ]
  LBrace = 'LBrace',                  // {
  RBrace = 'RBrace',                  // }

  // Special
  EOF = 'EOF',
  Unknown = 'Unknown',

  // Comment/Annotation tokens
  LineComment = 'LineComment',
  BlockComment = 'BlockComment',
  DocComment = 'DocComment',
}

export interface SourceLocation {
  line: number;
  column: number;
  offset: number;
  file?: string;
}

export interface Token {
  type: TokenType;
  value: string;
  location: SourceLocation;
}

export const KEYWORDS: Record<string, TokenType> = {
  'package': TokenType.KW_package,
  'namespace': TokenType.KW_namespace,
  'dependency': TokenType.KW_dependency,
  'import': TokenType.KW_import,
  'alias': TokenType.KW_alias,
  'type': TokenType.KW_type,
  'classifier': TokenType.KW_classifier,
  'class': TokenType.KW_class,
  'struct': TokenType.KW_struct,
  'assoc': TokenType.KW_assoc,
  'datatype': TokenType.KW_datatype,
  'enum': TokenType.KW_enum,
  'feature': TokenType.KW_feature,
  'attribute': TokenType.KW_attribute,
  'item': TokenType.KW_item,
  'part': TokenType.KW_part,
  'port': TokenType.KW_port,
  'connection': TokenType.KW_connection,
  'flow': TokenType.KW_flow,
  'interface': TokenType.KW_interface,
  'allocation': TokenType.KW_allocation,
  'end': TokenType.KW_end,
  'readonly': TokenType.KW_readonly,
  'derived': TokenType.KW_derived,
  'ordered': TokenType.KW_ordered,
  'nonunique': TokenType.KW_nonunique,
  'unique': TokenType.KW_unique,
  'specialization': TokenType.KW_specialization,
  'conjugation': TokenType.KW_conjugation,
  'disjoining': TokenType.KW_disjoining,
  'unioning': TokenType.KW_unioning,
  'intersecting': TokenType.KW_intersecting,
  'differencing': TokenType.KW_differencing,
  'typing': TokenType.KW_typing,
  'subtype': TokenType.KW_subtype,
  'subset': TokenType.KW_subset,
  'superset': TokenType.KW_superset,
  'redefinition': TokenType.KW_redefinition,
  'redefines': TokenType.KW_redefines,
  'subsets': TokenType.KW_subsets,
  'references': TokenType.KW_references,
  'typed': TokenType.KW_typed,
  'by': TokenType.KW_by,
  'behavior': TokenType.KW_behavior,
  'step': TokenType.KW_step,
  'function': TokenType.KW_function,
  'expr': TokenType.KW_expr,
  'predicate': TokenType.KW_predicate,
  'bool': TokenType.KW_bool,
  'interaction': TokenType.KW_interaction,
  'return': TokenType.KW_return,
  'result': TokenType.KW_result,
  'connector': TokenType.KW_connector,
  'binding': TokenType.KW_binding,
  'succession': TokenType.KW_succession,
  'then': TokenType.KW_then,
  'first': TokenType.KW_first,
  'multiplicity': TokenType.KW_multiplicity,
  'comment': TokenType.KW_comment,
  'doc': TokenType.KW_doc,
  'about': TokenType.KW_about,
  'locale': TokenType.KW_locale,
  'rep': TokenType.KW_rep,
  'metaclass': TokenType.KW_metaclass,
  'metadata': TokenType.KW_metadata,
  'meta': TokenType.KW_meta,
  'public': TokenType.KW_public,
  'private': TokenType.KW_private,
  'protected': TokenType.KW_protected,
  'abstract': TokenType.KW_abstract,
  'in': TokenType.KW_in,
  'out': TokenType.KW_out,
  'inout': TokenType.KW_inout,
  'from': TokenType.KW_from,
  'to': TokenType.KW_to,
  'all': TokenType.KW_all,
  'istype': TokenType.KW_istype,
  'hastype': TokenType.KW_hastype,
  'as': TokenType.KW_as,
  'if': TokenType.KW_if,
  'else': TokenType.KW_else,
  'implies': TokenType.KW_implies,
  'or': TokenType.KW_or,
  'xor': TokenType.KW_xor,
  'and': TokenType.KW_and,
  'not': TokenType.KW_not,
  'true': TokenType.KW_true,
  'false': TokenType.KW_false,
  'null': TokenType.KW_null,
  'inv': TokenType.KW_inv,
  'individuality': TokenType.KW_individuality,
  'snapshot': TokenType.KW_snapshot,
  'timeslice': TokenType.KW_timeslice,
  'composite': TokenType.KW_composite,
  'portion': TokenType.KW_portion,
  'of': TokenType.KW_of,
  'for': TokenType.KW_for,
  'specializes': TokenType.KW_specializes,
  'conjugates': TokenType.KW_conjugates,
  'disjoint': TokenType.KW_disjoint,
};