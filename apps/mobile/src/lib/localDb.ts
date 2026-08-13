import * as SQLite from 'expo-sqlite';
import type { PortalPlace } from '@portal/contracts';

let promise: Promise<SQLite.SQLiteDatabase> | undefined;
async function db(){
  if(!promise) promise=SQLite.openDatabaseAsync('portal.db').then(async d=>{await d.execAsync(`PRAGMA journal_mode=WAL;
    CREATE TABLE IF NOT EXISTS favorite_place(place_id TEXT PRIMARY KEY,name TEXT NOT NULL,public_code TEXT NOT NULL,created_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS recent_portal(place_id TEXT PRIMARY KEY,name TEXT NOT NULL,public_code TEXT NOT NULL,last_connected_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS cached_place(place_id TEXT PRIMARY KEY,json TEXT NOT NULL,updated_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS pending_action(id TEXT PRIMARY KEY,type TEXT NOT NULL,payload TEXT NOT NULL,created_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS app_setting(key TEXT PRIMARY KEY,value TEXT NOT NULL);`);return d;});
  return promise;
}
export async function cachePlace(place:PortalPlace){const d=await db();await d.runAsync(`INSERT INTO cached_place(place_id,json,updated_at) VALUES(?,?,?) ON CONFLICT(place_id) DO UPDATE SET json=excluded.json,updated_at=excluded.updated_at`,place.id,JSON.stringify(place),new Date().toISOString());}
export async function addRecent(place:PortalPlace){const d=await db();await d.runAsync(`INSERT INTO recent_portal(place_id,name,public_code,last_connected_at) VALUES(?,?,?,?) ON CONFLICT(place_id) DO UPDATE SET name=excluded.name,public_code=excluded.public_code,last_connected_at=excluded.last_connected_at`,place.id,place.name,place.publicCode,new Date().toISOString());}
export async function listRecents(){const d=await db();return d.getAllAsync<{place_id:string;name:string;public_code:string;last_connected_at:string}>(`SELECT * FROM recent_portal ORDER BY last_connected_at DESC LIMIT 30`);}
export async function addFavorite(place:PortalPlace){const d=await db();await d.runAsync(`INSERT OR REPLACE INTO favorite_place(place_id,name,public_code,created_at) VALUES(?,?,?,?)`,place.id,place.name,place.publicCode,new Date().toISOString());}
export async function removeFavorite(placeId:string){const d=await db();await d.runAsync('DELETE FROM favorite_place WHERE place_id=?',placeId);}
export async function listFavorites(){const d=await db();return d.getAllAsync<{place_id:string;name:string;public_code:string;created_at:string}>('SELECT * FROM favorite_place ORDER BY name');}
export type PortalMediaPreferences={cameraEnabled:boolean;microphoneEnabled:boolean;speakerEnabled:boolean;showLocalPreview:boolean};
const defaultMediaPreferences:PortalMediaPreferences={cameraEnabled:true,microphoneEnabled:true,speakerEnabled:true,showLocalPreview:true};
export async function getMediaPreferences():Promise<PortalMediaPreferences>{const d=await db();const rows=await d.getAllAsync<{key:string;value:string}>('SELECT key,value FROM app_setting');const map=Object.fromEntries(rows.map(r=>[r.key,r.value==='true']));return {...defaultMediaPreferences,...map} as PortalMediaPreferences;}
export async function setMediaPreference(key:keyof PortalMediaPreferences,value:boolean){const d=await db();await d.runAsync('INSERT INTO app_setting(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value',key,String(value));}
export async function clearLocalDb(){const d=await db();await d.execAsync('DELETE FROM favorite_place; DELETE FROM recent_portal; DELETE FROM cached_place; DELETE FROM pending_action; DELETE FROM app_setting;');}
