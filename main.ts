import { convertPointFromNodeToPage, convertPointFromPageToNode } from "./CSSOM/Geometry.ts";

//
const element = document.querySelector(".r1");

// @ts-ignore
element?.addEventListener("pointermove", (ev: PointerEvent)=>{
    //console.log(ev.pageX, ev.pageY);
    const coord = convertPointFromPageToNode(element, ev.pageX, ev.pageY);
    console.log(coord.x, coord.y);
});
