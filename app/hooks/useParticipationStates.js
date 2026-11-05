'use client';
import {useUser} from '@clerk/nextjs';
import useSWR from 'swr';
import {fetchJsonDeadline} from '../utils/fetchJsonDeadline';
const EMPTY=[];
export function participationFor(event,states=EMPTY){
    const aliases=[event.id,...(event._allIds||[])];
    return states.find(row=>aliases.includes(row.eventId));
}
export function useParticipationStates(){
    const {user}=useUser();
    const {data,error,mutate}=useSWR(user?['/api/planning/states',user.id]:null,async([url])=>{
        const {response,data:body}=await fetchJsonDeadline(url,{cache:'no-store'});if(!response.ok)throw Error();
        if(!Array.isArray(body.states))throw Error();return body;
    });
    return {user,data,states:user?(data?.states||EMPTY):EMPTY,error,mutate};
}
