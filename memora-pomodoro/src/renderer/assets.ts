import protectedNinjaScene from '../../assets/ninja-tomato.scene?raw';

export const APP_ICON_URL = new URL('../../assets/icon.png', import.meta.url).href;

declare const __MEMORA_SCENE_KEY_A__: string;
declare const __MEMORA_SCENE_KEY_B__: string;

interface ProtectedScene {
  v: number;
  mime: string;
  iv: string;
  data: string;
}

let ninjaSceneUrl: Promise<string> | undefined;

function decodeBase64(value: string): ArrayBuffer {
  const binary = atob(value);
  return Uint8Array.from(binary, char => char.charCodeAt(0)).buffer as ArrayBuffer;
}

async function decryptNinjaScene(): Promise<string> {
  const payload = JSON.parse(protectedNinjaScene) as ProtectedScene;
  if (payload.v !== 1) throw new Error('Unsupported protected scene version');
  const keyPartA = new Uint8Array(decodeBase64(__MEMORA_SCENE_KEY_A__));
  const keyPartB = new Uint8Array(decodeBase64(__MEMORA_SCENE_KEY_B__));
  if (keyPartA.length !== 32 || keyPartB.length !== 32) throw new Error('Invalid protected scene key');
  const keyBytes = new Uint8Array(32);
  keyBytes.forEach((_, index) => { keyBytes[index] = keyPartA[index] ^ keyPartB[index]; });
  const key = await crypto.subtle.importKey('raw', keyBytes.buffer, 'AES-GCM', false, ['decrypt']);
  const clear = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: decodeBase64(payload.iv) },
    key,
    decodeBase64(payload.data),
  );
  return URL.createObjectURL(new Blob([clear], { type: payload.mime }));
}

export function getNinjaTomatoSpritesUrl(): Promise<string> {
  ninjaSceneUrl ??= decryptNinjaScene();
  return ninjaSceneUrl;
}
