import ELK, { ElkNode } from "elkjs"

const elk = new ELK()

export async function layout<T extends ElkNode>(graph: T) {

  const elkGraph = {
    id: "root",
    layoutOptions: {
      "elk.algorithm": "layered",
      "elk.edgeRouting": "ORTHOGONAL"
    },

    children: graph.children?.map(n => ({
      id: n.id,
      x: n.x,
      y: n.y,
      width: n.width,
      height: n.height,

      ports: n.ports?.map(p => ({
        id: p.id,
        layoutOptions: {
          "elk.port.side": p.side
        }
      }))
    })),

    edges: graph.edges.map(e => ({
      id: e.id,
      sources: [e.sourcePort],
      targets: [e.targetPort]
    }))
  }

  return elk.layout(elkGraph)
}