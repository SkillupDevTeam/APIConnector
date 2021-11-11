import axios from "axios";
import { fetchFortniteAPi, IFetchFortniteApiParams } from "../api";
import { INTERNAL_API_KEY, INTERNAL_API_URL } from '../../config';

export interface IGameModes {
  id: string;
  name: string;
  team: string | null;
  description: string;
  largeTeams: boolean;
  maxTeamSize: number;
  image: string | null;
  gameType: string | null;
  matchmakingIcon: string | null;
  category: number | null;
  priority: number | null;
  enabled: boolean;
  ltmMessage: string[] | null;
}

interface IGameModesResponseData {
  id: string;
  name: string;
  team: string | null;
  description: string;
  largeTeams: boolean;
  maxTeamSize: number;
  image: string | null;
  gameType: string | null;
  matchmakingIcon: string | null;
  category: number | null;
  priority: number | null;
  enabled: boolean;
  ltmMessage: string[] | null;
}

interface IGameModesResponse {
  result: boolean;
  region: string;
  lang: string;
  modes: IGameModesResponseData[];
}

export interface IGameModesToUpdate {
  create: IGameModes[];
}

export async function getCurrentGameModes(): Promise<IGameModes[]> {
  try {
    const res = await axios.get(`${INTERNAL_API_URL}/fortnite/game-modes`, { headers: { 'Authorization': `Bearer ${INTERNAL_API_KEY}` } });
    return res.data.gameModes;
  } catch(err) {
    throw err;
  }
}

/**
 * Fetches F-API at game modes
 * @returns all data about fortnite's game modes
 */
async function getGameModes(): Promise<IGameModesResponseData[]> {
  try {
    const params: IFetchFortniteApiParams = {
      method: "GET",
      url: "https://fortniteapi.io/v1/game/modes?lang=en"
    }
    const data = await fetchFortniteAPi<IGameModesResponse>(params);
    if (data.modes.length===0) {
      throw new Error("Empty array of game modes");
    }
    return data.modes;
  } catch(err) {
    throw err;
  }
}

/**
 * Finds the game modes returned by F-API which are missing in the database
 * @returns the new game modes to add database 
 */
 export async function getGameModesToUpdate(): Promise<IGameModesToUpdate> {
  try {
    const fApiGameModes = await getGameModes();
    const baseGameModes = await getCurrentGameModes();

    const baseGameModeIds = new Set(baseGameModes.map(gm => gm.id));

    const lastestGameModes: IGameModes[] = fApiGameModes.map(gm => ({
      id: gm.id,
      name: gm.name ?? "",
      team: gm.team ?? null,
      description: gm.description ?? "",
      largeTeams: gm.largeTeams ?? false,
      maxTeamSize: gm.maxTeamSize ?? 0,
      image: gm.image ?? null,
      gameType: gm.gameType ?? null,
      matchmakingIcon: gm.matchmakingIcon ?? null,
      category: gm.category ?? null,
      priority: gm.priority ?? null,
      enabled: gm.enabled ?? false,
      ltmMessage: gm.ltmMessage ?? null
    }));

    const addedGameModes = lastestGameModes.filter(gm => !baseGameModeIds.has(gm.id));

    return {
      create: addedGameModes
    };
  } catch(err) {
    throw err;
  }
}
