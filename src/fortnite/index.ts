import { getMapsList, getMapsToUpdate, IMapsToUpdate, IPOIsToUpdate } from './functions/maps';
import { getWeaponsToUpdate, IWeaponsToUpdate } from './functions/weapons';
import { INTERNAL_API_KEY, INTERNAL_API_URL } from '../config';
import axios from 'axios';
import { uploadImagesData } from './functions/images';

export interface IDataToUpdate {
    maps: IMapsToUpdate;
    POIs: IPOIsToUpdate;
    weapons: IWeaponsToUpdate;
    patchVersion: string;
}

async function getCurrentPatch(): Promise<string|null> {
    try {
        const res = await axios.get(`${INTERNAL_API_URL}/fortnite/current-patch`, { headers: { 'Authorization': `Bearer ${INTERNAL_API_KEY}` }});
        return res.data.patchVersion;
    } catch(err) {
        throw err;
    }
}

async function updateData(dataToUpdate: IDataToUpdate) {
    try {
        await axios.post(
            `${INTERNAL_API_URL}/fortnite/update-data`,
            dataToUpdate,
            { headers: { 'Authorization': `Bearer ${INTERNAL_API_KEY}` } }
        );
    } catch(err) {
        throw err;
    }
}

async function update(): Promise<string> {
    try {
        const maps = await getMapsList();
        const lastestPatch = maps[maps.length-1].patchVersion;
        const currentPatch = await getCurrentPatch();
        if(currentPatch === lastestPatch) {
            console.log("Up to date !");
            return lastestPatch;
        }

        console.log("currentPatch: ", currentPatch);
        console.log("lastestPatch: ", lastestPatch);

        console.log("Initiated the data update");
        const weaponsToUpdate = await getWeaponsToUpdate();
        const [ mapsToUpdate, poisToUpdate ] = await getMapsToUpdate(maps);

        const dataToUpdate: IDataToUpdate = {
            maps: mapsToUpdate,
            POIs: poisToUpdate,
            weapons: weaponsToUpdate,
            patchVersion: lastestPatch
        }

        await uploadImagesData(dataToUpdate);
        await updateData(dataToUpdate);

        console.log("Finished");
        
        return lastestPatch;
    } catch(err) {
        throw err;
    }
}

export default async function handle(event: any, context: any, callback: any) {
    console.log("API CONNECTOR: Fortnite");
    try {
        const patchVersion = await update();
        callback(null, {
            statusCode: 200,
            body: JSON.stringify({
                patchVersion
            })
        });
    } catch(err) {
        console.error(err);
        callback(null, {
            statusCode: 500,
            body: JSON.stringify(err)
        });
    }
}
