export type PortSide = "NORTH" | "SOUTH" | "EAST" | "WEST"

export interface Port {
  id: string
  nodeId: string
  side: PortSide
}

export interface Node {
  id: string
  x: number
  y: number
  width: number
  height: number
  ports: Port[]
}

export interface Edge {
  id: string
  sourcePort: string
  targetPort: string
}

export interface Graph {
  nodes: Node[]
  edges: Edge[]
}