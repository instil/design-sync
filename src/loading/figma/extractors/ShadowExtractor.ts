import type {GetFileResult} from "figma-api/lib/api-types";
import {extractFrame} from "./utils/FrameExtractor";
import type {DesignTokenShadows} from "@src/loading/figma/types/design-token/types/DesignTokenShadows";
import {buildBoxDropShadowDefinition, buildBoxInsertShadowDefinition} from "@src/loading/figma/types/design-token/types/DesignTokenShadows";
import {isFrame} from "@src/loading/figma/types/figma-api/Frame";
import {filterChildren} from "./utils/children/ChildFilter";
import {reverse} from "lodash";
import {extractDropShadowEffects, extractInsetShadowEffects} from "./utils/EffectsExtractor";
import {logPercentage} from "./utils/PercentageLogger";

const pageName = "   ↳ Shadow";
const frameName = "Styles";

export function extractShadows(figmaGetFileResult: GetFileResult): DesignTokenShadows {
  console.log("Extracting spacers...");

  const styleFrame = extractFrame({figmaGetFileResult, pageName, frameName});

  const shadowFrames = filterChildren(styleFrame, isFrame);
  const designTokenShadows: DesignTokenShadows = {};
  for (let index = 0; index < shadowFrames.length; index++) {
    const shadowFrame = shadowFrames[index];

    logPercentage({
      type: "shadows",
      index,
      length: shadowFrames.length
    });

    const name = shadowFrame.name;
    const dropShadowEffects = extractDropShadowEffects(shadowFrame.effects);
    if (dropShadowEffects.length >= 2) {
      const dropShadowDefinition = buildBoxDropShadowDefinition(reverse(dropShadowEffects));
      designTokenShadows[name] = {
        value: dropShadowDefinition,
        type: "shadows"
      };
      continue;
    }

    const insetEffects = extractInsetShadowEffects(shadowFrame.effects);
    if (insetEffects.length > 0) {
      const insetShadowDefinition = buildBoxInsertShadowDefinition(insetEffects[0]);
      designTokenShadows[name] = {
        value: insetShadowDefinition,
        type: "shadows"
      };
    }
  }

  return designTokenShadows;
}

