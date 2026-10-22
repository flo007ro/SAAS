import { describe, it, expect, vi } from "vitest";
import { runBraceEngine } from "../../src/engine/braceEngineRunner";
import { buildRunInput } from "../../src/domain/runForm";
import { designResultSchema } from "../../src/domain/resultContract";
import { handleCreateDesignRun, type HandlerDeps } from "../../src/app/api/design-runs/handler";

const metric = { factoredTension: "1000", factoredCompression: "500", memberLength: "3000", effectiveLengthX: "3000", effectiveLengthY: "3000", netArea: "7000", shearLagFactor: ".85", ultimateStrength: "450", tensionSlendernessLimit: "300", compressionSlendernessLimit: "200" };
const imperial = { factoredTension: "200", factoredCompression: "100", memberLength: "120", effectiveLengthX: "120", effectiveLengthY: "120", netArea: "10", shearLagFactor: ".8", ultimateStrength: "65", tensionSlendernessLimit: "300", compressionSlendernessLimit: "200" };
const csa = { unitSystem: "metric", codeProfile: "CSA_S16_19" } as const;
const aisc = { unitSystem: "imperial", codeProfile: "AISC_360_22" } as const;
function input(project = csa as typeof csa | typeof aisc, fields = project.unitSystem === "metric" ? metric : imperial) {
  const result = buildRunInput("brace", project.unitSystem, project.codeProfile, fields, project.unitSystem === "metric" ? "W310x60" : "W12x40");
  result.displayValues.seismicDemand = { label: "Demand category", value: "ordinary", unit: "category" };
  return result;
}

describe("brace member checks — code paths and explicit review status", () => {
  it("AISC tension agrees with independent yielding/rupture arithmetic", () => {
    const result = runBraceEngine("aisc", aisc, input(aisc));
    expect(result.displayResults.grossYieldResistance).toBeCloseTo(.9 * 11.7 * 50, 4);
    expect(result.displayResults.netRuptureResistance).toBeCloseTo(.75 * .8 * 10 * 65, 4);
    expect(result.displayResults.tensionResistance).toBe(390);
    expect(result.displayResults.compressionResistance).toBeCloseTo(397.7, 0);
    expect(result.displayResults.calculatedChecksMet).toBe(true);
    expect(result.displayResults.designStatus).toBe("requires_engineering_review");
    expect(result.displayResults).not.toHaveProperty("pass");
    expect(designResultSchema.safeParse(result).success).toBe(true);
    expect(result.sectionSnapshot?.rx).toBe(5.13);
  });
  it("CSA tension and existing compression curve are evaluated in kN", () => {
    const result = runBraceEngine("csa", csa, input());
    expect(result.displayResults.grossYieldResistance).toBeCloseTo(.9 * 7640 * 345 / 1000, 4);
    expect(result.displayResults.netRuptureResistance).toBeCloseTo(.75 * .85 * 7000 * 450 / 1000, 4);
    expect(result.displayResults.compressionResistance as number).toBeGreaterThan(1600);
    expect(result.displayResults.compressionResistance as number).toBeLessThan(1800);
    expect(result.displayResults.calculatedChecksMet).toBe(true);
    expect(result.codeReferences.join(" ")).toContain("CSA S16-19");
    expect(result.warnings.length).toBeGreaterThan(0);
    expect(designResultSchema.safeParse(result).success).toBe(true);
  });
  it("uses the AISC elastic branch for a very slender compression member", () => {
    const result = runBraceEngine("elastic", aisc, input(aisc, { ...imperial, effectiveLengthY: "1200" }));
    expect(result.displayResults.compressionResistance).toBeCloseTo(6.9, 1);
    expect(result.displayResults.compressionDCR as number).toBeGreaterThan(14);
    expect(result.displayResults.calculatedChecksMet).toBe(false);
  });
  it("can govern by gross yielding instead of net-area rupture", () => {
    const result = runBraceEngine("yield", csa, input(csa, { ...metric, netArea: "7640", shearLagFactor: "1" }));
    expect(result.displayResults.governingTensionCheck).toBe("gross yielding");
    expect(result.displayResults.tensionResistance).toBe(result.displayResults.grossYieldResistance);
  });
  it("can govern about the strong axis rather than blindly using the weak axis", () => {
    const normal = runBraceEngine("normal", csa, input());
    const result = runBraceEngine("strong", csa, input(csa, { ...metric, effectiveLengthX: "20000" }));
    expect(result.displayResults.governingCompressionAxis).toBe("strong axis");
    expect(result.displayResults.compressionResistance as number).toBeLessThan(normal.displayResults.compressionResistance as number);
  });
  it.each(["factoredTension", "factoredCompression"])("allows zero for an unapplied %s case", field => {
    const result = runBraceEngine("single", csa, input(csa, { ...metric, [field]: "0" }));
    expect(result.displayResults[field === "factoredTension" ? "tensionDCR" : "compressionDCR"]).toBe(0);
  });
  it("rejects an all-zero envelope", () => {
    expect(()=>runBraceEngine("zero", csa, input(csa,{...metric,factoredTension:"0",factoredCompression:"0"}))).toThrow(/At least one/);
  });
  it.each([
    ["netArea", "8000", /Net area/], ["shearLagFactor", "1.1", /Shear-lag/], ["ultimateStrength", "200", /Ultimate strength/],
  ] as const)("rejects invalid %s", (field, value, message) => {
    expect(()=>runBraceEngine("bad", csa, input(csa,{...metric,[field]:value}))).toThrow(message);
  });
  it.each(["-1","Infinity","NaN",""])("rejects invalid demand %s", value=>{
    expect(()=>input(csa,{...metric,factoredTension:value})).toThrow();
  });
  it("preserves a seismic review flag without issuing a seismic compliance result", () => {
    const body = input();body.displayValues.seismicDemand.value="seismic";
    const result=runBraceEngine("seismic",csa,body);
    expect(result.displayResults.seismicReviewRequired).toBe(true);
    expect(result.displayResults.designStatus).toBe("requires_engineering_review");
    expect(result.displayResults).not.toHaveProperty("pass");
    expect(result.warnings.join(" ")).toContain("SEISMIC REVIEW REQUIRED");
  });
  it("rejects an unrecognized demand category",()=>{
    const body=input();body.displayValues.seismicDemand.value="approved";
    expect(()=>runBraceEngine("bad",csa,body)).toThrow(/Select ordinary or seismic/);
  });
  it("reports unmet strength and project screening criteria",()=>{
    const result=runBraceEngine("overload",csa,input(csa,{...metric,factoredTension:"9999",compressionSlendernessLimit:"10"}));
    expect(result.displayResults.calculatedChecksMet).toBe(false);
    expect(result.displayResults.tensionDCR as number).toBeGreaterThan(1);
    expect(result.displayResults.compressionSlendernessScreenMet).toBe(false);
  });
  it("does not silently accept project context or force-unit changes",()=>{
    const body=input();body.displayValues.factoredTension.unit="kip";
    expect(()=>runBraceEngine("unit",csa,body)).toThrow(/kN/);
    expect(()=>runBraceEngine("context",aisc,input())).toThrow(/match the project/);
  });
  it("rejects reference combinations without compatible sections",()=>{
    expect(()=>runBraceEngine("cross",{...csa,codeProfile:"AISC_360_22"},{...input(),codeProfile:"AISC_360_22"})).toThrow(/compatible/);
    expect(()=>runBraceEngine("cross",{...aisc,codeProfile:"CSA_S16_19"},{...input(aisc),codeProfile:"CSA_S16_19"})).toThrow(/compatible/);
  });
});

describe("brace availability and persistence",()=>{
  const session={userId:"u",organizationId:"org"};
  const request={type:"brace" as const,projectId:"p",title:"Brace B1",inputJson:input()};
  function deps() {
    return {
      findProject:vi.fn(async()=>({found:true,belongsToOrg:true,project:{...csa,id:"p"}})),
      createDesignRun:vi.fn(async(data)=>({id:"r",type:data.type,title:data.title,status:"draft",inputJson:data.inputJson,resultJson:null,errorCode:null})),
      updateDesignRun:vi.fn(async(_id,patch)=>({id:"r",type:"brace",title:"Brace B1",status:patch.status,inputJson:request.inputJson,resultJson:patch.resultJson??null,errorCode:patch.errorCode??null})),
      braceEnabled:true,runBraceEngine:vi.fn(async(id,p,ij)=>runBraceEngine(id,p,ij)),
    } as unknown as HandlerDeps;
  }
  it("blocks a database not yet upgraded without creating any row",async()=>{
    const d=deps();d.braceEnabled=false;
    expect(await handleCreateDesignRun(request,session,d)).toMatchObject({ok:false,httpStatus:501,errorCode:"BRACE_STORAGE_NOT_ENABLED"});
    expect(d.createDesignRun).not.toHaveBeenCalled();
  });
  it("keeps ownership enforcement ahead of brace processing",async()=>{
    const d=deps();d.findProject=async()=>({found:true,belongsToOrg:false,project:{...csa,id:"p"}});
    expect(await handleCreateDesignRun(request,session,d)).toMatchObject({ok:false,httpStatus:403});
    expect(d.createDesignRun).not.toHaveBeenCalled();
  });
  it("stores a complete, versioned, review-required result through the common handler",async()=>{
    const d=deps();const result=await handleCreateDesignRun(request,session,d);
    expect(result).toMatchObject({ok:true,designRun:{status:"complete",resultJson:{moduleType:"brace",engineVersion:"brace-member-0.1.0",displayResults:{designStatus:"requires_engineering_review"}}}});
    expect(d.updateDesignRun).toHaveBeenCalledTimes(2);
  });
});
