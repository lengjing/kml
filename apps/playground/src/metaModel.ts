export type ElementType = 'Block' | 'Port';

export interface Capability {
  isContainer: boolean;
  isConnectable: boolean;
  acceptedChildren: ElementType[];
  isResizable: boolean;
}

export const MetaModel: Record<ElementType, Capability> = {
  Block: {
    isContainer: true,
    isConnectable: false,
    acceptedChildren: ['Block', 'Port'],
    isResizable: true
  },
  Port: {
    isContainer: false,
    isConnectable: true,  // 表示可以作为连接点
    acceptedChildren: [],
    isResizable: false
  }
};