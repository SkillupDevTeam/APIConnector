import { IDataToUpdate } from "../index";
import { putObjectToS3 } from "../api";
import { AWS_BUCKET_CDN_URL, DATA_AES_KEY, DATA_AES_IV } from "../config";
import PromiseQueue from "../../utils/PromiseQueue";
import * as sharp from "sharp";
import * as bmp from "bmp-js";
import axios from "axios";
import { getCurrentMaps } from "./maps";
import { getCurrentWeapons } from "./weapons";
import { deflate } from "../../utils/Compression";

interface ISize {
    width: number;
    height: number;
}

async function uploadImage(key: string, url: string, sizes: ISize[], jpeg: boolean): Promise<void> {
    let retries = 3;
    while(retries > 0) {
      try {
        let cancelTimeout: NodeJS.Timeout | undefined;
        const res = await axios.get(url, {
            responseType: 'arraybuffer',
            cancelToken: new axios.CancelToken(c => {
              cancelTimeout = setTimeout(c, 60000, "timeout");
            })
        });
        clearTimeout(cancelTimeout!);

        const image = Buffer.from(res.data, 'binary');

        await putObjectToS3(key + ".png", image, "image/png");

        for(const size of sizes) {
            let pip = sharp(image).resize(size.width, size.height);
            if(jpeg) {
                pip = pip.jpeg({ mozjpeg: true });
            }
            const resImage = await pip.toBuffer();

            await putObjectToS3(
                key + `-${size.width}x${size.height}.${jpeg ? "jpeg" : "png"}`, 
                resImage, 
                jpeg ? "image/jpeg" : "image/png"
            );
        }
        return;
      } catch(err) {
        retries -= 1;
        console.error(err);
      }
    }
    console.error(`Upload failed: ${url} => ${key}`);
}

export async function uploadImagesData(data: IDataToUpdate) {
    const toUpload = new Array<{ name: string; url: string; sizes: ISize[]; jpeg: boolean; }>();

    const weaponSizes: ISize[] = [
        { width: 512, height: 512 },
        { width: 256, height: 256 },
        { width: 128, height: 128 },
        { width: 64, height: 64 },
        { width: 32, height: 32 }
    ];
    const mapsSizes: ISize[] = [
        { width: 2048, height: 2048 },
        { width: 1024, height: 1024 },
        { width: 512, height: 512 },
        { width: 256, height: 256 },
        { width: 128, height: 128 }
    ];

    for(const weapon of data.weapons.create.concat(data.weapons.update)) {
        if(weapon.image_background) {
            const name = `fortnite/images/weapons/${weapon.id}`;
            toUpload.push({ name, url: weapon.image_background, sizes: weaponSizes, jpeg: true });
            const url = `${AWS_BUCKET_CDN_URL}/${name}.png`;
            weapon.image_background = url;
        }
        if(weapon.image_icon) {
            const name = `fortnite/images/weapons/icon/${weapon.id}`;
            toUpload.push({ name, url: weapon.image_icon, sizes:[], jpeg: false });
            const url = `${AWS_BUCKET_CDN_URL}/${name}.png`;
            weapon.image_icon = url;
        }
    }
    for(const map of data.maps.create) {
        if(map.url) {
            const name = `fortnite/images/maps/map-${map.patchVersion}`;
            toUpload.push({ name, url: map.url, sizes: mapsSizes, jpeg: true });
            map.url = `${AWS_BUCKET_CDN_URL}/${name}.png`;
        }
        if(map.urlPOI) {
            const name = `fortnite/images/maps/poi/en/map-${map.patchVersion}`;
            toUpload.push({ name, url: map.urlPOI, sizes: mapsSizes, jpeg: true });
            map.urlPOI = `${AWS_BUCKET_CDN_URL}/${name}.png`;
        }
    }

    const queue = new PromiseQueue(20, toUpload.map(v => () => {
        console.log(`Upload image: ${v.name}`);
        return uploadImage(v.name, v.url, v.sizes, v.jpeg);
    }));
    await queue.run();
}

async function loadImage(id: number, url: string): Promise<{ id: number; image: Buffer | undefined; }> {
    console.log(`Download image: ${url}`);
    let retries = 3;
    while(retries > 0) {
      try {
        let cancelTimeout: NodeJS.Timeout | undefined;
        const res = await axios.get(url!, {
            responseType: 'arraybuffer',
            cancelToken: new axios.CancelToken(c => {
              cancelTimeout = setTimeout(c, 5000, "timeout");
            })
        });
        clearTimeout(cancelTimeout!);

        const image = Buffer.from(res.data, 'binary');
        const metaReader = sharp(image);
        const meta = await metaReader.metadata();
        const imageData = await sharp(image).raw().toBuffer();
        const imageBmp = bmp.encode({
            data: imageData,
            width: meta.width!,
            height: meta.height!
        }).data;
        return { id, image: imageBmp };
    } catch(err) {
        retries -= 1;
        console.log(err);
      }
    }
    console.log(`Download failed: ${url}`);
    return { id, image: undefined };
}
/*
function bufferFromUint32(n: number): Buffer {
    const buf = Buffer.alloc(4);
    buf.writeUInt32BE(n);
    return buf;
}
function bufferFromUint8(n: number): Buffer {
    const buf = Buffer.alloc(1);
    buf.writeUInt8(n);
    return buf;
}

export async function packWeaponsImages(patchVersion: string) {
    try {
        const weapons = await getCurrentWeapons();

        const queue = new PromiseQueue(20, weapons
            .filter(w => w.enabled && w.image_icon !== null)
            .map(w => () => loadImage(w.id!, w.image_icon!))
        );
        const weaponsImage = await queue.run() as Array<{ id: number; image: Buffer | undefined; }>;

        console.log("Images to buffer");
        const dataBuffers = new Array<Buffer>();
        dataBuffers.push(bufferFromUint32(weaponsImage.length));
        for(const w of weaponsImage) {
            dataBuffers.push(bufferFromUint32(w.id));
            if(w.image) {
                dataBuffers.push(bufferFromUint32(w.image.byteLength), w.image);
            } else {
                dataBuffers.push(bufferFromUint32(0));
            }
        }
        const data = Buffer.concat(dataBuffers);

        console.log("Compression");
        const compressed = await deflate(data);
        
        console.log("Upload");
        const name = `fortnite/statsmaker/data/weapons-${patchVersion}`
        await putObjectToS3(name, compressed, "application/octet-stream");
    } catch(err) {
        console.log(err);
    }
}
*/