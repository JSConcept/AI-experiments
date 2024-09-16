import { convertPointFromNodeToPage, convertPointFromPageToNode } from "./CSSOM/Conversion.ts";

//
const element = document.querySelector(".r1");

// @ts-ignore
element?.addEventListener("pointermove", (ev: PointerEvent)=>{
    const coord = convertPointFromPageToNode(element, ev.pageX, ev.pageY);
    console.log(coord.x, coord.y);
});
