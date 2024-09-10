import * as THREE from 'three';
import { Player } from './player';
import { BlockData, World } from './world';
import { blocks } from './blocks';

export type Point3D = {
  x: number;
  y: number;
  z: number;
};

export type BlockCollision = {
  block: Point3D;
  contactPoint: Point3D;
  normal: THREE.Vector3;
  overlap: number;
};

const collisionMaterial = new THREE.MeshBasicMaterial({
  color: 0xff0000,
  transparent: true,
  opacity: 0.2,
});

const collisionGeometry = new THREE.BoxGeometry(1.001, 1.001, 1.001);

const contactMaterial = new THREE.MeshBasicMaterial({
  wireframe: true,
  color: 0x00ff00,
});
const contactGeometry = new THREE.SphereGeometry(0.05, 6, 6);

export class Physics {
  helpers: THREE.Group;
  gravity: number = 32;
  simulationRate: number = 250;
  timestep: number = 1 / this.simulationRate;
  accumulator = 0;

  constructor(scene: THREE.Scene) {
    this.helpers = new THREE.Group();
    scene.add(this.helpers);
  }

  /**
   * Moves the physics simulation forward in time by 'dt'
   * @param {number} dt
   * @param {Player} player
   * @param {World} world
   */
  update(dt: number, player: Player, world: World) {
    this.accumulator += dt;
    while (this.accumulator >= this.timestep) {
      player.velocity.y -= this.gravity * this.timestep;
      player.applyInputs(this.timestep);
      this.detectCollisions(player, world);
      this.accumulator -= this.timestep;
    }
  }

  /**
   * Main function for collision detection
   * @param {Player} player
   * @param {World} world
   */
  detectCollisions(player: Player, world: World) {
    player.onGround = false;
    this.helpers.clear();

    const candidates = this.broadPhase(player, world);
    const collisions = this.narrowPhase(candidates, player);

    if (collisions.length > 0) {
      this.resolveCollisions(collisions, player);
    }
  }

  broadPhase(player: Player, world: World): Point3D[] {
    const candidates: Point3D[] = [];

    // Get the extes of the player
    const extents = {
      x: {
        min: Math.floor(player.position.x - player.radius),
        max: Math.ceil(player.position.x + player.radius),
      },
      y: {
        min: Math.floor(player.position.y - player.height),
        max: Math.ceil(player.position.y),
      },
      z: {
        min: Math.floor(player.position.z - player.radius),
        max: Math.ceil(player.position.z + player.radius),
      },
    };

    for (let x = extents.x.min; x <= extents.x.max; x++) {
      for (let y = extents.y.min; y <= extents.y.max; y++) {
        for (let z = extents.z.min; z <= extents.z.max; z++) {
          const block = world.getBlock(x, y, z);
          if (block && block.id !== blocks.empty.id) {
            const blockPos = { x, y, z } as Point3D;
            candidates.push(blockPos);
            this.addCollisionHelper(blockPos);
          }
        }
      }
    }

    return candidates;
  }

  /**
   * Narrows down the blocks found in the broad-phase to the set
   * of blocks the player is actually colliding with
   * @param {{ id: number, instanceId: number }[]} candidates
   * @returns
   */
  narrowPhase(candidates: Point3D[], player: Player): BlockCollision[] {
    const collisions = [];

    for (const block of candidates) {
      // Get the point on the block that is closest to the center of the player's bounding cylinder
      const closestPoint = {
        x: Math.max(block.x - 0.5, Math.min(player.position.x, block.x + 0.5)),
        y: Math.max(
          block.y - 0.5,
          Math.min(player.position.y - player.height / 2, block.y + 0.5)
        ),
        z: Math.max(block.z - 0.5, Math.min(player.position.z, block.z + 0.5)),
      };

      // Get distance along each axis between closest point and the center
      // of the player's bounding cylinder
      const dx = closestPoint.x - player.position.x;
      const dy = closestPoint.y - (player.position.y - player.height / 2);
      const dz = closestPoint.z - player.position.z;

      if (this.pointInPlayerBoundingCylinder(closestPoint, player)) {
        // Compute the overlap between the point and the player's bounding
        // cylinder along the y-axis and in the xz-plane
        const overlapY = player.height / 2 - Math.abs(dy);
        const overlapXZ = player.radius - Math.sqrt(dx * dx + dz * dz);

        // Compute the normal of the collision (pointing away from the contact point)
        // and the overlap between the point and the player's bounding cylinder
        let normal, overlap;
        if (overlapY < overlapXZ) {
          normal = new THREE.Vector3(0, -Math.sign(dy), 0);
          overlap = overlapY;
          player.onGround = true;
        } else {
          normal = new THREE.Vector3(-dx, 0, -dz).normalize();
          overlap = overlapXZ;
        }

        collisions.push({
          block,
          contactPoint: closestPoint,
          normal,
          overlap,
        });

        this.addContactPointerHelper(closestPoint);
      }
    }

    return collisions;
  }

  /**
   * Returns true if the point 'p' is inside the player's bounding cylinder
   * @param {{ x: number, y: number, z: number }} p
   * @param {Player} player
   * @returns {boolean}
   */
  pointInPlayerBoundingCylinder(p: Point3D, player: Player): boolean {
    const dx = p.x - player.position.x;
    const dy = p.y - (player.position.y - player.height / 2);
    const dz = p.z - player.position.z;
    const r_sq = dx * dx + dz * dz;

    // Check if contact point is inside the player's bounding cylinder
    return (
      Math.abs(dy) < player.height / 2 && r_sq < player.radius * player.radius
    );
  }

  /**
   * Resolves each of the collisions found in the narrow-phase
   * @param {*} collisions
   * @param {Player} player
   */
  resolveCollisions(collisions: BlockCollision[], player: Player) {
    // Resolve the collisions in order of the smallest overlap to the largest
    collisions.sort((a, b) => {
      return a.overlap < b.overlap ? -1 : a.overlap > b.overlap ? 1 : 0;
    });

    for (const collision of collisions) {
      let deltaPosition = collision.normal.clone();
      deltaPosition.multiplyScalar(collision.overlap);
      player.position.add(deltaPosition);

      let magnitude = player.worldVelocity.dot(collision.normal);
      let velocityAdjustment = collision.normal
        .clone()
        .multiplyScalar(magnitude);
      player.applyWorldDeltaVelocity(velocityAdjustment.negate());
    }
  }

  /**
   * Visualizes the block the player is colliding with
   * @param {Point3D} block
   */
  addCollisionHelper(block: Point3D) {
    const blockMesh = new THREE.Mesh(collisionGeometry, collisionMaterial);
    blockMesh.position.set(block.x, block.y, block.z);
    this.helpers.add(blockMesh);
  }

  addContactPointerHelper(point: Point3D) {
    const contactMesh = new THREE.Mesh(contactGeometry, contactMaterial);
    contactMesh.position.set(point.x, point.y, point.z);
    this.helpers.add(contactMesh);
  }
}
