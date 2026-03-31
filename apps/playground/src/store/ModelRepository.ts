import { Element, ID } from "../types/sysml";

export default class ModelRepository {
  private elements = new Map<ID, Element>()

  get(id: ID) {
    return this.elements.get(id)
  }

  add(el: Element) {
    this.elements.set(el.id, el)
  }

  update(id: ID, patch: Partial<Element>) {
    Object.assign(this.elements.get(id)!, patch)
  }

  remove(id: ID) {
    this.elements.delete(id)
  }

  queryByType(type: string) {
    return [...this.elements.values()].filter(e => e.type === type)
  }
}