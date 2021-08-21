import { fetchFortniteAPi, IFetchFortniteApiParams } from "../api";
import { INTERNAL_API_KEY, INTERNAL_API_URL } from '../../config';
import axios from "axios";

export interface IFortniteMaps {
  id?: number;
  patchVersion: string;
  url: string;
  urlPOI: string | null;
}

export interface IMapsListResponseData {
  patchVersion: string;
  releaseDate: string;
  url: string;
  urlPOI: string|null;
}

export interface IMapsListResponse {
  lang: string;
  maps: IMapsListResponseData[];
}

export interface IMapsToUpdate {
  update: IFortniteMaps[];
  create: IFortniteMaps[];
}

export async function getCurrentMaps(): Promise<IFortniteMaps[]> {
  const res = await axios.get(`${INTERNAL_API_URL}/fortnite/maps`, { headers: { 'Authorization': `Bearer ${INTERNAL_API_KEY}` } });
  return res.data;
}

/**
 * Fetches F-API at maps/list
 * @returns all data about fortnite's maps
 */
export async function getMapsList(): Promise<IMapsListResponseData[]> {
  const params: IFetchFortniteApiParams = {
    method: "GET",
    url: "https://fortniteapi.io/v1/maps/list"
  }
  const { data, error } = await fetchFortniteAPi<IMapsListResponse>(params);
  if (error!==undefined || data===undefined) throw Error(error);
  if (data.maps.length===0) throw Error("Empty array of maps");
  for(const map of data.maps) {
    map.patchVersion = `${map.patchVersion}-${map.releaseDate}`;
  }
  return data.maps;
}

/**
 * Finds the maps returned by F-API which are missing in the database
 * @returns the new maps to add database and the total count of maps
 */
export async function getMapsToUpdate(fApiMaps: IMapsListResponseData[]): Promise<IMapsToUpdate> {
  const baseMaps = await getCurrentMaps();

  const lastestMaps: IFortniteMaps[] = fApiMaps.map(m => ({
    patchVersion: m.patchVersion,
    url: m.url,
    urlPOI: m.urlPOI
  }));

  const addedMaps = new Array<IFortniteMaps>();

  // find missing maps from F-API in database
  for (const lastestMap of lastestMaps) {
    var alreadyAdded = false;
    for (const baseMap of baseMaps) {
      if (baseMap.patchVersion === lastestMap.patchVersion) {
        alreadyAdded = true;
        break;
      }
    }
    if (!alreadyAdded) {
      addedMaps.push(lastestMap);
    }
  }
  
  return {
    create: addedMaps,
    update: []
  };
}
