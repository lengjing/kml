export type ID = string

export interface Element {
    id: ID
    type: string
    name?: string

    // 通用属性
    attributes?: Record<string, any>

    // 关系
    children?: ID[]
    parent?: ID
}

export interface Block extends Element {
    type: "Block"
}

export interface Port extends Element {
    type: "Port"
    owner: ID
}

export interface Connector extends Element {
    type: "Connector"
    source: ID
    target: ID
}