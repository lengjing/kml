export function detectSide(node, x, y) {
  const left = Math.abs(x - node.x)
  const right = Math.abs(x - (node.x + node.width))
  const top = Math.abs(y - node.y)
  const bottom = Math.abs(y - (node.y + node.height))

  const min = Math.min(left, right, top, bottom)

  if (min === left) return "WEST"
  if (min === right) return "EAST"
  if (min === top) return "NORTH"
  return "SOUTH"
}

export function createPort(node, side) {
  const port = {
    id: `${node.id}_${side}_${node.ports.length}`,
    nodeId: node.id,
    side
  }

  node.ports.push(port)
  return port
}