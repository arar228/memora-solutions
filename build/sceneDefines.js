import { randomBytes } from 'node:crypto';

export function sceneDefines(sceneKey, publicBuild = false) {
  if (publicBuild) {
    return {
      __MEMORA_NINJA_AVAILABLE__: 'false',
      __MEMORA_SCENE_KEY_A__: JSON.stringify(''),
      __MEMORA_SCENE_KEY_B__: JSON.stringify(''),
    };
  }
  if (!sceneKey) throw new Error('MEMORA_SCENE_KEY is required for the official artwork. Use build:public or build:web:public for an audit build.');
  const bytes = Buffer.from(sceneKey, 'base64');
  if (bytes.length !== 32) throw new Error('MEMORA_SCENE_KEY must decode to 32 bytes.');
  const mask = randomBytes(32);
  return {
    __MEMORA_NINJA_AVAILABLE__: 'true',
    __MEMORA_SCENE_KEY_A__: JSON.stringify(mask.toString('base64')),
    __MEMORA_SCENE_KEY_B__: JSON.stringify(Buffer.from(bytes.map((byte, index) => byte ^ mask[index])).toString('base64')),
  };
}
