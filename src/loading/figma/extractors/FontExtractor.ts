import type {GetFileResult} from "figma-api/lib/api-types";
import type {FRAME, Style, TEXT} from "figma-api";
import {isInstance} from "@src/loading/figma/types/figma-api/Instance";
import {extractFrame} from "./figma-component-extractors/FrameExtractor";
import type {DesignTokenFonts} from "@src/loading/figma/types/design-token/types/DesignTokenFonts";
import {isText} from "@src/loading/figma/types/figma-api/Text";
import {findChild} from "./figma-component-extractors/children/ChildFinder";
import {isFrame} from "@src/loading/figma/types/figma-api/Frame";
import {filterChildren} from "./figma-component-extractors/children/ChildFilter";
import {logPercentage} from "./logging/PercentageLogger";
import type {Node} from "figma-api/lib/ast-types";

const pageName = "   ↳ Typography";
const frameName = "Typography";

export function extractFonts(figmaGetFileResult: GetFileResult): DesignTokenFonts {
  console.log("Extracting fonts...");

  const containerFrame = extractFrame({figmaGetFileResult, pageName, frameName});

  const fontFrames = filterChildren<FRAME & Node>(containerFrame, maybeFontFrame => isFrame(maybeFontFrame));
  if (fontFrames.length === 0) throw Error("No fonts found, is figma setup correctly?");

  const fonts = fontFrames.map(fontFrame => {
    console.log(`Extracting ${fontFrame.name} fonts...`);
    const fonts = extractFrontsFromFrame(figmaGetFileResult, fontFrame);
    console.log(`${fontFrame.name} font extraction complete!`);
    return fonts;
  });

  console.log("Font extraction complete!\n");
  return fonts.reduce((designToken, font) => ({
    ...designToken,
    ...font
  }), {});
}

function extractFrontsFromFrame(figmaGetFileResult: GetFileResult, frame: FRAME & Node): DesignTokenFonts {
  const stackItems = filterChildren(frame, isInstance);
  if (stackItems.length === 0) return {};

  const designTokens: DesignTokenFonts = {};
  stackItems.forEach((stackItem, index) => {
    logPercentage({
      type: "fonts",
      index,
      length: stackItems.length
    });

    const stackItemChildrenContainer = findChild<FRAME>(stackItem, isFrame);
    if (!stackItemChildrenContainer) throw Error("No stack item children container found for type stack, is figma setup correctly?");

    const sampleContainer = findChild<FRAME>(stackItemChildrenContainer, maybeSampleContainer => isFrame(maybeSampleContainer) && maybeSampleContainer.name === "Sample");
    if (!sampleContainer) throw Error("No sample container found for type stack, is figma setup correctly?");

    for (const fontSpec of sampleContainer.children) {
      if (fontSpec.visible !== undefined && !fontSpec.visible) {
        continue;
      }
      if (!isText(fontSpec)) throw Error("Font node was not of type text, is figma setup correctly?");

      const style = getTextStyle(figmaGetFileResult, fontSpec);

      designTokens[style.name] = {
        family: {
          value: fontSpec.style.fontPostScriptName ? `${fontSpec.style.fontFamily}, ${fontSpec.style.fontPostScriptName}` : fontSpec.style.fontFamily,
          type: "typography"
        },
        lineheight: {
          value: `${fontSpec.style.lineHeightPx}px`,
          type: "typography"
        },
        size: {
          value: `${fontSpec.style.fontSize}px`,
          type: "typography"
        },
        spacing: {
          value: `${fontSpec.style.letterSpacing}px`,
          type: "typography"
        },
        weight: {
          value: fontSpec.style.fontWeight,
          type: "typography"
        }
      };
    }
  });
  return designTokens;
}

function getTextStyle(figmaGetFileResult: GetFileResult, fontSpec: TEXT): Style {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore. Ignored due to typescript types being wrong. Expects `styles.TEXT` but is actually `styles.text`
  const styleKeyToFind = fontSpec.styles?.text;
  if (!styleKeyToFind) {
    throw Error("Could not get text style as the style key provided is undefined");
  }

  const styleKey = Object.keys(figmaGetFileResult.styles).find((key) => {
    return key === styleKeyToFind;
  });
  if (!styleKey) throw Error("Could not find text style for font, has a style been generated on figma for this font?");

  return figmaGetFileResult.styles[styleKey];
}