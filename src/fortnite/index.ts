import { getMapsList, getMapsToUpdate, IMapsToUpdate, IPOIsToUpdate } from './functions/maps';
import { getWeaponsToUpdate, IWeaponsToUpdate } from './functions/weapons';
import { INTERNAL_API_KEY, INTERNAL_API_URL } from '../config';
import axios from 'axios';
import { uploadImagesData } from './functions/images';
import { getGameModesToUpdate, IGameModesToUpdate } from './functions/gameModes';

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

async function updateGameModes(gameModesToUpdate: IGameModesToUpdate) {
    try {
        await axios.post(
            `${INTERNAL_API_URL}/fortnite/update-game-modes`,
            gameModesToUpdate,
            { headers: { 'Authorization': `Bearer ${INTERNAL_API_KEY}` } }
        );
    } catch(err) {
        throw err;
    }
}

async function update() {
    try {
        const gameModesToUpdate = await getGameModesToUpdate();
        console.log(`Game modes added: ${gameModesToUpdate.create.length}`);
        if(gameModesToUpdate.create.length > 0) {
            await updateGameModes(gameModesToUpdate);
            console.log("Game modes created");
        }
    } catch(err) {
        console.error(err);
    }

    try {
        const maps = await getMapsList();
        const lastestPatch = maps[maps.length-1].patchVersion;
        const currentPatch = await getCurrentPatch();
        
        console.log("currentPatch: ", currentPatch);
        console.log("lastestPatch: ", lastestPatch);

        const dataToUpdate: IDataToUpdate = {
            maps: {
                create: []
            },
            POIs: {
                create: []
            },
            weapons: {
                create: [],
                update: []
            },
            patchVersion: lastestPatch
        }

        if(currentPatch === lastestPatch) {
            console.log("Maps up to date !");
        } else {
            console.log("Maps updated");
            const [ mapsToUpdate, poisToUpdate ] = await getMapsToUpdate(maps);
            dataToUpdate.maps = mapsToUpdate;
            dataToUpdate.POIs = poisToUpdate;
        }

        const weaponsToUpdate = await getWeaponsToUpdate();
        console.log(`Weapons added: ${weaponsToUpdate.create.length}`);
        console.log(`Weapons modified: ${weaponsToUpdate.update.length}`);
        dataToUpdate.weapons = weaponsToUpdate;

        if(dataToUpdate.POIs.create.length > 0 || dataToUpdate.maps.create.length > 0 || 
            dataToUpdate.weapons.create.length > 0 || dataToUpdate.weapons.update.length > 0
        ) {
            console.log("Initiated the data update");
            await uploadImagesData(dataToUpdate);
            await updateData(dataToUpdate);
        }

        console.log("Finished");
        
        return lastestPatch;
    } catch(err) {
        console.error(err);
    }
}

export default async function handle(event: any, context: any) {
    console.log("API CONNECTOR: Fortnite");
    try {
        await update();
    } catch(err) {
        console.error(err);
    }
}
