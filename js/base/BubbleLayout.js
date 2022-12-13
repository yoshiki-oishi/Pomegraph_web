import { CciCoords } from "./Cci_Coords.js";
import { Constants } from "./Constants.js";
import { Lineage } from "./TreeImport.js";

function transform (a, b, c, d, e, f, x, y) {
    return  [a*x+b*y+c, d*x+e*y+f];
}

function doBreadthWalk(catalogue, gnode, stack, func){
    if(Lineage.isLeaf(catalogue, stack)) return;
    let size = Lineage.getChilds(catalogue, stack).length;
    Lineage.getChilds(catalogue, stack).forEach((gg, i)=>{
        func(gnode, gg, size, i);
//        gnode.setEdge(gnode.getSubgroup(stack), gg);
    });
    Lineage.getChilds(catalogue, stack).forEach((gg) => {
        doBreadthWalk(catalogue, gnode, gg, func);
    });
}

function getDiameter(gnodes, catalogue){
    return Lineage.getSpanningDistance(gnodes, catalogue);
}

function setGnodes(gnode, catalogue){
    // First branches are radial. Secondaries are fan-shaped.
    const sg = Lineage.getRootChilds(catalogue);
//    gnode.setEdges(gnode.getSubgroup(Lineage.ORIGIN_NODE), sg);
    const size = sg.length;
//    const mag = Constants.BRANCH_LEN_MAG_CONST;
    const mag = getDiameter(gnode, catalogue);
    console.log(mag);
    sg.forEach((gg, i)=>{
        gnode[gg].center = gnode[gg].worldPosition.val = [
            Math.cos(i/size*Math.PI*2)*Constants.RADIAL_TICK_MAGNITUTE*mag,
            Math.sin(i/size*Math.PI*2)*Constants.RADIAL_TICK_MAGNITUTE*mag
            //    Math.cos(i/size*Math.PI*2)*Constants.RADIAL_TICK_MAGNITUTE*gnode[gg].length*mag,
            //    Math.sin(i/size*Math.PI*2)*Constants.RADIAL_TICK_MAGNITUTE*gnode[gg].length*mag
            ];
    });
    const labeling_f = function (gnode, gg, n, i){
            const [px,  py] = gnode[Lineage.getParent(gg)].center;// get parent coordinates to calclate angle.
            const FAN_ANGLE = Constants.RADIAL_FAN_WIDTH;

            let [x, y] = (n>1) ? transform(
                Math.cos((i-(n-1)/2)/(n-1)*FAN_ANGLE-Constants.RADIAL_FAN_MARGIN),
                -Math.sin((i-(n-1)/2)/(n-1)*FAN_ANGLE-Constants.RADIAL_FAN_MARGIN),
                0.0,
                Math.sin((i-(n-1)/2)/(n-1)*FAN_ANGLE-Constants.RADIAL_FAN_MARGIN),
                Math.cos((i-(n-1)/2)/(n-1)*FAN_ANGLE-Constants.RADIAL_FAN_MARGIN),
                0.0,
                //Constants.RADIAL_TICK_MAGNITUTE*gnode[gg].length*mag, 0.0
                Constants.RADIAL_TICK_MAGNITUTE*mag, 0.0
            )
            :[
                //Constants.RADIAL_TICK_MAGNITUTE*gnode[gg].length*mag, 0.0
                Constants.RADIAL_TICK_MAGNITUTE*mag, 0.0                
            ];
            const th = Math.atan2(py, px);
            [x, y] = transform(
                Math.cos(th), -Math.sin(th), px,
                Math.sin(th), Math.cos(th), py,
                x, y);
            gnode[gg].center = gnode[gg].worldPosition.val = [x, y];
    };
    // scan secondaries.
    sg.forEach((gg)=>{
        doBreadthWalk(catalogue, gnode, gg, labeling_f);
    });
    return;
}

export function PomLayout(nodelink) {

    let done = false;
    const gnodes = nodelink.gnodes;
    const catalogue = Object.keys(gnodes);
    const sg = gnodes;

    // set center position of each gnode.
    if(catalogue.length > 1) setGnodes(gnodes, catalogue);
    const lmag = Constants.BDR_BASE_RADIUS;

    catalogue.forEach((gg) => {

        let members = Object.values(gnodes[gg].members).reduce((r,c)=> r.concat(c),[]);
        if(!members.length) return; // return if blanc node.
        //console.log(members.length);
        const cc = CciCoords[members.length-1].coords; // All elements of granules.
        const ccc = cc.sort((a, b) => Math.atan2(a.y, a.x) - Math.atan2(b.y, b.x));// sort position by angle.

        members.forEach((d, i) =>{
            [d.x, d.y] = [ccc[i].x*lmag, ccc[i].y*lmag];
            // global transform
            [d.x, d.y] = transform(
                1.0, 0.0, gnodes[gg].center[0],
                0.0, 1.0, gnodes[gg].center[1],
                d.x, d.y);
            [d.fixx, d.fixy] = [d.x, d.y]; // Fixed position
            [d.ox, d.oy] = [d.x, d.y]; // Original position
        });

        if (Object.keys(sg).length > 1 && gg === Lineage.UNASSIGNED_NODE) members.forEach( dot =>{
            [dot.fixx, dot.fixy] = [dot.forcex, dot.forcey] = [0, 0]; // Mark and release nodes.
        });
    });

    this.fixNode = function (n, x, y) {
        [nodelink.dots[n].x, nodelink.dots[n].y] = [x, y];
        done = false;
    };

    this.unfixNode = function (n) {
        [nodelink.dots[n].x, nodelink.dots[n].y] = [nodelink.dots[n].ox, nodelink.dots[n].oy];
        done = false;
    };

    this.jiggle = function (scale) {
        let n = nodelink.dots.length;
        while (n--){
            nodelink.dots[n].x += Math.random() * scale - scale / 2;
            nodelink.dots[n].y += Math.random() * scale - scale / 2;
        }
        done = false;
    };

    this.update = function (time) {
        if (done) return;
        return true;
    };
}