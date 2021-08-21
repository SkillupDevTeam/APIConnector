import * as zlib from "zlib";

/**
 * Compress a data Buffer
 */
export async function deflate(data: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    zlib.deflate(data, (err, res) => {
      if(err) {
        reject(err);
      } else {
        resolve(res);
      }
    });
  });
}

/**
 * Decompress a data Buffer
 */
export async function inflate(data: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    zlib.inflate(data, (err, res) => {
      if(err) {
        reject(err);
      } else {
        resolve(res);
      }
    });
  });
}
