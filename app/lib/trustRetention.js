export async function cleanTrustData(db,now=new Date()){
    const cutoff=new Date(now.getTime()-90*86400000);
    await db.organizerSubmission.deleteMany({where:{OR:[{status:'PENDING',createdAt:{lt:cutoff}},{status:'REJECTED',reviewedAt:{lt:cutoff}}]}});
    await db.organizerSubmission.updateMany({where:{status:'APPROVED',reviewedAt:{lt:cutoff}},data:{userEmail:null,organizerName:null,reviewNote:null}});
    await db.sourceQualitySnapshot.deleteMany({where:{createdAt:{lt:cutoff}}});
    await db.searchAlertRun.deleteMany({where:{createdAt:{lt:new Date(now.getTime()-30*86400000)}}});
}
