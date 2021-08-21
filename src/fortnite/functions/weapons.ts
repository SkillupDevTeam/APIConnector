import axios from "axios";
import { fetchFortniteAPi, IFetchFortniteApiParams } from "../api";
import { INTERNAL_API_KEY, INTERNAL_API_URL } from '../../config';

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
  mainStats_healthRestoration: number;
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
  const res = await axios.get(`${INTERNAL_API_URL}/fortnite/weapons`, { headers: { 'Authorization': `Bearer ${INTERNAL_API_KEY}` } });
  return res.data;
}

/**
 * Fetches F-API at loot/list
 * @returns all data about fortnite's weapons
 */
async function getWeaponsList(): Promise<IWeaponsListResponseData[]> {
  const params: IFetchFortniteApiParams = {
    method: "GET",
    url: "https://fortniteapi.io/v1/loot/list?lang=en"
  }
  const { data, error } = await fetchFortniteAPi<IWeaponsListResponse>(params);
  if (error!==undefined || data===undefined) throw Error(error);
  if (data.weapons.length===0) throw Error("Empty array of maps");
  return data.weapons;
}

/**
 * Finds the weapons returned by F-API which are missing in the database
 * @returns the new weapons to add database and the total count of weapons
 */
 export async function getWeaponsToUpdate(): Promise<IWeaponsToUpdate> {
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
      mainStats_dmgPB: DmgPB,
      mainStats_firingRate: FiringRate,
      mainStats_clipSize: ClipSize,
      mainStats_reloadTime: ReloadTime,
      mainStats_bulletsPerCartridge: BulletsPerCartridge,
      mainStats_spread: Spread,
      mainStats_spreadDownsights: SpreadDownsights,
      mainStats_damageZoneCritical: DamageZone_Critical,
      mainStats_healthRestoration: gameplayTags.includes("Trait.Restoration.Health") ? DmgPB : 0
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
          if(baseWeapon[key] !== lastestWeapon[key]) {
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
}