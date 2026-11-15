export type RenderTier='cinematic'|'balanced'|'lean';
export interface RenderQuality {
  tier:RenderTier;dpr:number;pixelBudget:number;smokeCount:number;smokeSamples:number;
  particleFraction:number;shadow:boolean;shadowSize:number;transmissionScale:number;bloomResolution:number;
}
const presets={
  cinematic:{dpr:1.5,pixelBudget:2_000_000,smokeCount:24,smokeSamples:3,particleFraction:1,shadow:true,shadowSize:512,transmissionScale:.85,bloomResolution:.7},
  balanced:{dpr:1.25,pixelBudget:1_350_000,smokeCount:18,smokeSamples:2,particleFraction:.72,shadow:true,shadowSize:512,transmissionScale:.65,bloomResolution:.55},
  lean:{dpr:1,pixelBudget:850_000,smokeCount:12,smokeSamples:1,particleFraction:.45,shadow:false,shadowSize:0,transmissionScale:.5,bloomResolution:.4},
} as const;

/** Quality changes affect atmospheric cost, never the hand or blade geometry. */
export function getRenderQuality(tier:RenderTier,compact:boolean,deviceDpr=1,cssWidth=1,cssHeight=1):RenderQuality {
  const selected=Object.hasOwn(presets,tier)?tier:'cinematic',preset=presets[selected];
  const width=Number.isFinite(cssWidth)?Math.max(1,cssWidth):1,height=Number.isFinite(cssHeight)?Math.max(1,cssHeight):1;
  const native=Number.isFinite(deviceDpr)&&deviceDpr>0?deviceDpr:1;
  const pixelBudget=compact?Math.min(preset.pixelBudget,selected==='cinematic'?1_100_000:selected==='balanced'?800_000:600_000):preset.pixelBudget;
  return {...preset,tier:selected,pixelBudget,dpr:Math.min(native,preset.dpr,Math.sqrt(pixelBudget)/Math.sqrt(width)/Math.sqrt(height)),
    smokeCount:compact?Math.ceil(preset.smokeCount*.6):preset.smokeCount,particleFraction:preset.particleFraction*(compact?.5:1)};
}

/** The existing engine selects a tier; the existing R3F frame applies it. */
export const renderQualityState:{tier:RenderTier;current:RenderQuality}={tier:'cinematic',current:getRenderQuality('cinematic',false)};
export function setRenderQualityTier(tier:RenderTier){if(Object.hasOwn(presets,tier))renderQualityState.tier=tier;}
