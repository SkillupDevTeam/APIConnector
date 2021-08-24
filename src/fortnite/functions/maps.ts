import { fetchFortniteAPi, IFetchFortniteApiParams } from "../api";
import { INTERNAL_API_KEY, INTERNAL_API_URL } from '../../config';
import axios from "axios";

export interface IFortnitePOI {
  id: string;
  name: string;
  x: number;
  y: number;
  overview: string | null;
}

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

export interface IPOIListResponseData {
  id: string;
  name: string;
  x: number;
  y: number;
  images: Array<{ type: string; url: string; }>
}

export interface IMapsListResponse {
  lang: string;
  maps: IMapsListResponseData[];
}

export interface IPOIListResponse {
  result: boolean;
  scale: number;
  type: string;
  lang: string;
  gameVersion: string;
  list: IPOIListResponseData[];
}

export interface IMapsToUpdate {
  create: IFortniteMaps[];
}

export interface IPOIsToUpdate {
  create: IFortnitePOI[];
}

export async function getCurrentMaps(): Promise<IFortniteMaps[]> {
  try {
    const res = await axios.get(`${INTERNAL_API_URL}/fortnite/maps`, { headers: { 'Authorization': `Bearer ${INTERNAL_API_KEY}` } });
    return res.data;
  } catch(err) {
    throw err;
  }
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
 * Fetches F-API at poi/list
 * @returns all data about fortnite's poi
 */
 export async function getPOIList(): Promise<IPOIListResponseData[]> {
  const params: IFetchFortniteApiParams = {
    method: "GET",
    url: " https://fortniteapi.io/v2/game/poi?lang=en"
  }
  const { data, error } = await fetchFortniteAPi<IPOIListResponse>(params);
  if (error!==undefined || data===undefined) throw Error(error);
  if (data.list.length===0) throw Error("Empty array of maps");
  return data.list;
}

/**
 * Finds the maps returned by F-API which are missing in the database
 * @returns the new maps to add database and the total count of maps
 */
export async function getMapsToUpdate(fApiMaps: IMapsListResponseData[]): Promise<[IMapsToUpdate, IPOIsToUpdate]> {
  try {
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
    let POIs: IFortnitePOI[] = [];
    if(addedMaps.length > 0) {
      const fApiPOI = await getPOIList();
      POIs = fApiPOI.map(p => ({
        id: p.id,
        patchVersion: addedMaps[addedMaps.length - 1].patchVersion,
        name: p.name,
        x: p.x,
        y: p.y,
        overview: null
      }));
    }
    
    return [{
        create: addedMaps
      }, {
        create: POIs
      }
    ];
  } catch(err) {
    throw err;
  }
}
