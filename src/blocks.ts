export type BlockType = {
  id: number
  name: string
  color?: number
}

export type BlockMetadata = {
  [id: string]: BlockType
}

export const blocks: BlockMetadata = {
  empty: {
    id: 0,
    name: 'empty',
  },
  grass: {
    id: 1,
    name: 'grass',
    color: 0x559020,
  },
  dirt: {
    id: 2,
    name: 'dirt',
    color: 0x807020,
  },
}
