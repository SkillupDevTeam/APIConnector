import axios from "axios";
import { fetchFortniteAPi, IFetchFortniteApiParams } from "../api";
import { INTERNAL_API_KEY, INTERNAL_API_URL } from '../../config';
import { deepEquals } from "../../utils/Objects";

export interface IFortniteWeapons {
  id?: number;
  fortniteId: string;
  enabled: boolean;
  name: string;
  rarity: string;
  type: string;
  gameplayTags: string[];
  image_icon: string | null;
  image_background: string | null;
  mainStats_dmgPB: number;
  mainStats_firingRate: number;
  mainStats_clipSize: number;
  mainStats_reloadTime: number;
  mainStats_bulletsPerCartridge: number;
  mainStats_spread: number;
  mainStats_spreadDownsights: number;
  mainStats_damageZoneCritical: number;
}

interface IWeaponsListResponseDataMainStats {
  DmgPB: number;
  FiringRate: number;
  ClipSize: number;
  ReloadTime: number;
  BulletsPerCartridge: number;
  Spread: number;
  SpreadDownsights: number;
  DamageZone_Critical: number;
}

interface IWeaponsListResponseData {
  id: string;
  enabled: boolean;
  name: string;
  rarity: string;
  type: string;
  gameplayTags: string[];
  images: {
    icon: string|null;
    background: string|null;
  };
  mainStats: IWeaponsListResponseDataMainStats;
}

interface IWeaponsListResponse {
  lang: string;
  weapons: IWeaponsListResponseData[];
}

export interface IWeaponsToUpdate {
  update: IFortniteWeapons[];
  create: IFortniteWeapons[];
}

export async function getCurrentWeapons(): Promise<IFortniteWeapons[]> {
  try {
    const res = await axios.get(`${INTERNAL_API_URL}/fortnite/weapons`, { headers: { 'Authorization': `Bearer ${INTERNAL_API_KEY}` } });
    return res.data.weapons;
  } catch(err) {
    throw err;
  }
}

/**
 * Fetches F-API at loot/list
 * @returns all data about fortnite's weapons
 */
async function getWeaponsList(): Promise<IWeaponsListResponseData[]> {
  try {
    const params: IFetchFortniteApiParams = {
      method: "GET",
      url: "https://fortniteapi.io/v1/loot/list?lang=en"
    }
    const data = await fetchFortniteAPi<IWeaponsListResponse>(params);
    if (data.weapons.length===0) {
      throw new Error("Empty array of weapons");
    }
    return data.weapons;
  } catch(err) {
    throw err;
  }
}

/**
 * Finds the weapons returned by F-API which are missing in the database
 * @returns the new weapons to add database and the total count of weapons
 */
 export async function getWeaponsToUpdate(): Promise<IWeaponsToUpdate> {
  try {
    const fApiWeapons = await getWeaponsList();
    const baseWeapons = await getCurrentWeapons();

    const lastestWeapons: IFortniteWeapons[] = fApiWeapons.map(elt => {
      const { enabled, name, rarity, type, gameplayTags, images, mainStats } = elt;
      const { icon, background } = images;
      const { DmgPB, FiringRate, ClipSize, ReloadTime, BulletsPerCartridge, Spread, SpreadDownsights, DamageZone_Critical } = mainStats
      return { 
        fortniteId: elt.id,
        enabled,
        name,
        rarity,
        type,
        gameplayTags,
        image_icon: icon,
        image_background: background,
        mainStats_dmgPB: parseFloat(DmgPB.toFixed(2)),
        mainStats_firingRate: parseFloat(FiringRate.toFixed(2)),
        mainStats_clipSize: parseFloat(ClipSize.toFixed(2)),
        mainStats_reloadTime: parseFloat(ReloadTime.toFixed(2)),
        mainStats_bulletsPerCartridge: parseFloat(BulletsPerCartridge.toFixed(2)),
        mainStats_spread: parseFloat(Spread.toFixed(2)),
        mainStats_spreadDownsights: parseFloat(SpreadDownsights.toFixed(2)),
        mainStats_damageZoneCritical: parseFloat(DamageZone_Critical.toFixed(2))
      }
    });

    const addedWeapons: IFortniteWeapons[] = [];
    const updatedWeapons: IFortniteWeapons[] = [];

    // find missing weapons from F-API in database
    for (const lastestWeapon of lastestWeapons) {
      var alreadyAdded = false;
      for (const baseWeapon of baseWeapons) {
        if (baseWeapon.fortniteId === lastestWeapon.fortniteId) {
          for(const key of [
            "enabled", "name", "rarity", "type", "gameplayTags", "mainStats_dmgPB", 
            "mainStats_firingRate", "mainStats_clipSize", "mainStats_reloadTime", 
            "mainStats_bulletsPerCartridge", "mainStats_spread", "mainStats_spreadDownsights",
            "mainStats_damageZoneCritical"
          ]) {
            if(!deepEquals(baseWeapon[key], lastestWeapon[key])) {
              console.log(`Update: ${baseWeapon.fortniteId} [${key}]: '${baseWeapon[key]}' => '${lastestWeapon[key]}'`);
              lastestWeapon.id = baseWeapon.id;
              updatedWeapons.push(lastestWeapon);
              break;
            }
          }
          alreadyAdded = true;
          break;
        }
      }
      if (!alreadyAdded) {
        lastestWeapon.id = baseWeapons.reduce((m, w) => Math.max(m, w.id || 0), 0) + addedWeapons.length + 1;
        addedWeapons.push(lastestWeapon);
      }
    }

    return {
      create: addedWeapons,
      update: updatedWeapons
    };
  } catch(err) {
    throw err;
  }
}
