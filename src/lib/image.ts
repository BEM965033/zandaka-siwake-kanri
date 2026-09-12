// ブラウザ側で写真を縮小・圧縮してdata URLに変換する
// スマホの写真は1枚数MBあるため、そのままDBに入れず長辺1600px・JPEGに落とす

const MAX_DIMENSION = 1600;
const INITIAL_QUALITY = 0.8;
const MIN_QUALITY = 0.3;
// data URLの上限。Server ActionのbodySizeLimit(5mb)に対して余裕を持たせる
const MAX_DATA_URL_LENGTH = 1_500_000;

export async function compressImageToDataUrl(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new Error("画像ファイルを選択してください");
  }

  let bitmap: ImageBitmap;
  try {
    // imageOrientationを指定しないとスマホの縦写真が横向きで保存される
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    throw new Error("この画像形式は読み込めません。JPEGかPNGで撮影してください");
  }

  const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close();
    throw new Error("画像の変換に失敗しました");
  }

  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  // 上限に収まるまで品質を段階的に落とす
  let quality = INITIAL_QUALITY;
  let dataUrl = canvas.toDataURL("image/jpeg", quality);
  while (dataUrl.length > MAX_DATA_URL_LENGTH && quality > MIN_QUALITY) {
    quality -= 0.15;
    dataUrl = canvas.toDataURL("image/jpeg", quality);
  }

  if (dataUrl.length > MAX_DATA_URL_LENGTH) {
    throw new Error("画像サイズが大きすぎます。別の写真を選んでください");
  }

  return dataUrl;
}
