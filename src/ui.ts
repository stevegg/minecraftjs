import { GUI } from 'three/addons/libs/lil-gui.module.min.js';
import { World } from './world';
import { resources } from './blocks';
import { Player } from './player';

export const createUI = (world: World, player: Player) => {
  const gui = new GUI();

  const playerFoloder = gui.addFolder('Player');
  playerFoloder.add(player, 'maxSpeed', 1, 20).name('Max Speed');
  playerFoloder.add(player.cameraHelper, 'visible').name('Show Camera Holder');

  const terrainFolder = gui.addFolder('Terrain');
  terrainFolder.add(world.size, 'width', 8, 128, 1).name('Width');
  terrainFolder.add(world.size, 'height', 8, 128, 1).name('Height');
  terrainFolder.add(world.params, 'hideTerrain').name('Hide Terrain');
  terrainFolder.add(world.params, 'seed', 1, 10000).name('Seed');
  terrainFolder.add(world.params.terrain, 'scale', 10, 100).name('Scale');
  terrainFolder.add(world.params.terrain, 'magnitude', 0, 1).name('Magnitude');
  terrainFolder.add(world.params.terrain, 'offset', 0, 1).name('Offset');

  const resourcesFolder = gui.addFolder('Resources');

  resources.forEach((resource) => {
    const resourceFolder = resourcesFolder.addFolder(resource.name);
    resourceFolder.add(resource, 'scarcity', 0, 1).name('Scarcity');

    const scaleFolder = resourceFolder.addFolder('Scale');
    scaleFolder.add(resource.scale, 'x', 10, 100).name('X Scale');
    scaleFolder.add(resource.scale, 'y', 10, 100).name('Y Scale');
    scaleFolder.add(resource.scale, 'z', 10, 100).name('Z Scale');
  });

  gui.onChange(() => {
    world.generate();
  });
};
