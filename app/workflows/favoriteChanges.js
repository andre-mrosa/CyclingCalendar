import {deliverFavoriteChangeBatch} from './favoriteChangeSteps.js';
export async function favoriteChangeWorkflow(){
    'use workflow';
    let cursor=null;
    do{const result=await deliverFavoriteChangeBatch(cursor);cursor=result.nextCursor;}while(cursor);
}
