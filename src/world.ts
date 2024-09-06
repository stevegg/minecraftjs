import * as THREE from 'three'
import { SimplexNoise } from 'three/examples/jsm/math/SimplexNoise.js'
import { RNG } from './rng'
import { blocks } from './blocks'

export type WorldSize = {
  width: number
  height: number
}

export type WorldTerrain = {
  scale: number
  magnitude: number
  offset: number
}

export type WorldParams = {
  seed: number
  terrain: WorldTerrain
}

export type BlockData = {
  id: number
  instanceId: number
}

export class World extends THREE.Group {
  size: WorldSize
  data: BlockData[][][] = []
  params: WorldParams = {
    seed: 0,
    terrain: {
      scale: 30,
      magnitude: 0.5,
      offset: 0.2,
    },
  }

  geometry = new THREE.BoxGeometry()
  material = new THREE.MeshLambertMaterial()

  constructor(size: WorldSize = { width: 64, height: 32 }) {
    super()
    this.size = size
  }

  /**
   * Generate the World
   */
  generate() {
    this.initializeTerrain()
    this.generateTerrain()
    this.generateMeshes()
  }

  /**
   * Initialize the terrain model for the world
   */
  initializeTerrain() {
    this.data = []
    for (let x = 0; x < this.size.width; x++) {
      const slice: BlockData[][] = []
      for (let y = 0; y < this.size.height; y++) {
        const row: BlockData[] = []
        for (let z = 0; z < this.size.width; z++) {
          row.push({
            id: blocks.empty.id,
            instanceId: -1,
          })
        }
        slice.push(row)
      }
      this.data.push(slice)
    }
  }

  /**
   * Generate the terraine using a SimplexNoise function
   */
  generateTerrain() {
    const rng = new RNG(this.params.seed)
    const simplex = new SimplexNoise(rng)
    for (let x = 0; x < this.size.width; x++) {
      for (let z = 0; z < this.size.width; z++) {
        const value = simplex.noise(
          x / this.params.terrain.scale,
          z / this.params.terrain.scale
        )

        const scaledNoise =
          this.params.terrain.offset + this.params.terrain.magnitude * value
        let height = Math.floor(this.size.height * scaledNoise)
        height = Math.max(0, Math.min(height, this.size.height - 1))

        // for (let y = 0; y < height; y++) {
        //   this.setBlockId(x, y, z, blocks.grass.id)
        // }
        for (let y = 0; y <= this.size.height; y++) {
          if (y < height) {
            this.setBlockId(x, y, z, blocks.dirt.id)
          } else if (y === height) {
            this.setBlockId(x, y, z, blocks.grass.id)
          } else {
            this.setBlockId(x, y, z, blocks.empty.id)
          }
        }
      }
    }
  }

  /**
   * Generate meshes and add to our world.
   */
  generateMeshes() {
    this.clear()
    const maxCount = this.size.width * this.size.width * this.size.height
    const mesh = new THREE.InstancedMesh(this.geometry, this.material, maxCount)
    mesh.count = 0

    const matrix = new THREE.Matrix4()
    for (let x = 0; x < this.size.width; x++) {
      for (let y = 0; y < this.size.height; y++) {
        for (let z = 0; z < this.size.width; z++) {
          const blockId = this.getBlock(x, y, z)?.id
          const instanceId = mesh.count
          const blockType = Object.values(blocks).find((x) => x.id === blockId)
          if (blockType!.id !== blocks.empty.id) {
            matrix.setPosition(x + 0.5, y + 0.5, z + 0.5)
            mesh.setMatrixAt(instanceId, matrix)
            mesh.setColorAt(instanceId, new THREE.Color(blockType?.color))
            this.setBlockInstanceId(x, y, z, instanceId)
            mesh.count += 1
          }
        }
      }
    }
    this.add(mesh)
  }

  /**
   * Get the block data at (x,y,z)
   * @param {number} x
   * @param {number} y
   * @param {number} z
   * @returns {Block | null} the block if the x, y,z is in bounds otherwise null
   */
  getBlock(x: number, y: number, z: number): BlockData | null {
    return this.inBounds(x, y, z) ? this.data[x][y][z] : null
  }

  /**
   * Set the ID for a block at (x,y,z)
   * @param {number} x
   * @param {number} y
   * @param {number} z
   * @param {number} id
   */
  setBlockId(x: number, y: number, z: number, id: number) {
    if (this.inBounds(x, y, z)) {
      this.data[x][y][z].id = id
    }
  }

  /**
   * Set the instanceID for a block at (x,y,z)
   * @param {number} x
   * @param {number} y
   * @param {number} z
   * @param {number} instanceId
   */
  setBlockInstanceId(x: number, y: number, z: number, instanceId: number) {
    if (this.inBounds(x, y, z)) {
      this.data[x][y][z].instanceId = instanceId
    }
  }

  /**
   * Checks if the (x, y, z) coordinates are within bounds
   * @param {number} x
   * @param {number} y
   * @param {number} z
   * @returns {boolean}
   */
  inBounds(x: number, y: number, z: number): boolean {
    return (
      x >= 0 &&
      x < this.size.width &&
      y >= 0 &&
      y < this.size.height &&
      z >= 0 &&
      z < this.size.width
    )
  }
}
