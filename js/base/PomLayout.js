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
    return Lineage.getSpanningSubstCount(gnodes, catalogue);
    //return Lineage.getSpanningDistance(gnodes, catalogue);
}

function setGnodes(gnode, catalogue, bounds){
    const [bx, by, bw, bh] = bounds;
    Object.values(gnode).forEach((gn)=>{
        const radius_n = Object.values(gn.members).flat().length;
        gn.radius = (radius_n) ? Math.log10(radius_n+1) : (Object.keys(gn.gnode).length) ? Constants.BRANK_NODE_RADIUS : 0.0;

        // adjust plot size.

        gn.center = gn.ocenter = gn.worldPosition.val = [
            gn.center[0] * 20.0,
            gn.center[1] * 20.0,
        ]        
    })
}

function setGnodes_prev(gnode, catalogue){
    // First branches are radial. Secondaries are fan-shaped.
    const sg = Lineage.getRootChilds(catalogue);
//    gnode.setEdges(gnode.getSubgroup(Lineage.ORIGIN_NODE), sg);
    const size = sg.length;
// set gnode radii.
    Object.values(gnode).forEach((gn)=>{
        const radius_n = Object.values(gn.members).flat().length;
        gn.radius = (radius_n) ? Math.log10(radius_n+1) : (Object.keys(gn.gnode).length) ? Constants.BRANK_NODE_RADIUS : 0.0;
        //gg.radius = radius;
    });
//    const mag = Constants.BRANCH_LEN_MAG_CONST;
//    const mag = (getDiameter(gnode, catalogue) > 0) ? getDiameter(gnode, catalogue) : Lineage.getSpanningDistance(gnode, catalogue);
//    console.log(mag);
    sg.forEach((gg, i)=>{
        let mag = (Lineage.getSubstitutions(gnode, gg)>0) ? Lineage.getSubstitutions(gnode, gg) * Constants.GNODE_BRANCH_MAG
            : gnode[gg].length * 1.0 / Lineage.getSpanningDistance(gnode, catalogue) * Constants.GNODE_SIZE_MAG + gnode[Lineage.getParent(gg)].radius + gnode[gg].radius;
            //mag += (Object.keys(gnode[gg].members).length) ? Constants.BDR_BASE_RADIUS *2.0 : 0.0;
        gnode[gg].center = gnode[gg].worldPosition.val = [
            Math.cos(i/size*Math.PI*2)*mag,
            Math.sin(i/size*Math.PI*2)*mag
            ];
        gnode[gg].ocenter = gnode[gg].center; 
    });
    //console.log(Lineage.getSpanningDistance(gnode, catalogue))
    const set_angle_f = ((size)=>{
        if(size >= 5) return Constants.RADIAL_FAN_WIDTH;
        if(size <= 4) return Constants.RADIAL_FAN_WIDTH * 2 / 9;
        if(size < 0) console.log("negative size.");
    });
    const labeling_f = function (gnode, gg, n, i){
            let mag = (Lineage.getSubstitutions(gnode, gg)>0)
                ? Lineage.getSubstitutions(gnode, gg) * Constants.GNODE_BRANCH_MAG
                : gnode[gg].length * 1.0 / Lineage.getSpanningDistance(gnode, catalogue) * Constants.GNODE_SIZE_MAG + gnode[Lineage.getParent(gg)].radius  + gnode[gg].radius;
            //mag += (Object.keys(gnode[gg].members).length) ? Constants.BDR_BASE_RADIUS *2.0 : 0.0;

            let length = (!!Lineage.getDirectChilds(catalogue, Lineage.getParent(gg)).length) ? (Lineage.getDirectChilds(catalogue, Lineage.getParent(gg)).length) : 0;
            let FAN_ANGLE = set_angle_f(
                    length
                )

            let [x, y] = (n>1) ? transform(
                Math.cos((i-(n-1)/2)/(n-1)*FAN_ANGLE-Constants.RADIAL_FAN_MARGIN),
                -Math.sin((i-(n-1)/2)/(n-1)*FAN_ANGLE-Constants.RADIAL_FAN_MARGIN),
                0.0,
                Math.sin((i-(n-1)/2)/(n-1)*FAN_ANGLE-Constants.RADIAL_FAN_MARGIN),
                Math.cos((i-(n-1)/2)/(n-1)*FAN_ANGLE-Constants.RADIAL_FAN_MARGIN),
                0.0,
                mag, 0.0
            )
            :[
                mag, 0.0                
            ];
            const [px,  py] = gnode[Lineage.getParent(gg)].center;// get parent coordinates to calclate angle.
            const [ppx, ppy] = gnode[Lineage.getParent(Lineage.getParent(gg))].center;
            //const th = Math.atan2(py, px);// This is rational to parent position in original coordinates.
            const th = Math.atan2(py-ppy, px-ppx);// This is rational to parent position local.
            [x, y] = transform(
                Math.cos(th), -Math.sin(th), px,
                Math.sin(th), Math.cos(th), py,
                x, y);
            gnode[gg].center = gnode[gg].worldPosition.val = [x, y];
            gnode[gg].ocenter = gnode[gg].center; 
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

    // const sg = gnodes;

    // set center position of each gnode.
    if(catalogue.length >= 1) setGnodes(gnodes, catalogue, nodelink.canvasbounds);
    //const lmag = 1.0; //Constants.BDR_BASE_RADIUS;

    catalogue.forEach((gg) => {

        let members = Object.values(gnodes[gg].members).reduce((r,c)=> r.concat(c),[]);
        if(!members.length) return; // return if blanc node.
        //console.log(members.length);
        const cc = CciCoords[members.length-1].coords; // All elements of granules.
        const ccr = CciCoords[members.length-1].radius;
        const ccc = cc.sort((a, b) => Math.atan2(a.y, a.x) - Math.atan2(b.y, b.x));// sort position by angle.

        members.forEach((d, i) =>{
            d.scale = ccr * gnodes[gg].radius;
            [d.x, d.y] = [ccc[i].x, ccc[i].y];
            // global transform
            [d.x, d.y] = transform(
                gnodes[gg].radius, 0.0, gnodes[gg].center[0],
                0.0, gnodes[gg].radius, gnodes[gg].center[1],
                d.x, d.y);
            [d.fixx, d.fixy] = [d.x, d.y]; // Fixed position
            [d.ox, d.oy] = [d.x, d.y]; // Original position
        });

        // if (Object.keys(sg).length > 1 && gg === Lineage.UNASSIGNED_NODE){
        //     [gnodes[gg].fixx, gnodes[gg].fixy] = [gnodes[gg].forcex, gnodes[gg].forcey] = [0, 0]; // Mark and release orphan gnodes.
        // };
    });

    this.fixNode = function (n, x, y) {
        [nodelink.dots[n].x, nodelink.dots[n].y] = [x, y];
        done = false;
    };

    this.unfixNode = function (n) {
        [nodelink.dots[n].x, nodelink.dots[n].y] = [nodelink.dots[n].ox, nodelink.dots[n].oy];
        done = false;
    };

    this.fitGuranules = function (gn, dx, dy){// set all guranules place relative to gnode center.
        Lineage.getSubNodes(gnodes, gn).forEach(dot => {
            [dot.x, dot.y] = transform(
                1.0, 0.0, dx,
                0.0, 1.0, dy,
                dot.x, dot.y
            );
            //console.log(dot.x,dot.y);
            [dot.ox, dot.oy] = [dot.x, dot.y]; // permanently fixed.
        })
    }

    this.rotateGnode = function(px, py, th, rx, ry, gn){
        const [ox, oy] = [...gnodes[gn].center];
        gnodes[gn].center = transform(
            Math.cos(th), -Math.sin(th), px + rx,
            Math.sin(th), Math.cos(th), py + ry,
            gnodes[gn].center[0]-px, gnodes[gn].center[1]-py
        );
        this.fitGuranules(gn, gnodes[gn].center[0] - ox, gnodes[gn].center[1] - oy);
    }

    this.fixGnode = function (n, x, y) {
        // Lineage.getSubNodes(gnodes, n).forEach(dot => {
        //     const [dx, dy] = [gnodes[n].center[0] - dot.x, gnodes[n].center[1] - dot.y];
        //     [dot.x, dot.y] = transform(
        //         1.0, 0.0, dx,
        //         0.0, 1.0, dy,
        //         x, y
        //     );
        //     [dot.ox, dot.oy] = [dot.x, dot.y]; // permanently fixed.
        // });
        const [px, py] = gnodes[n].center;
        this.fitGuranules(n, x - px, y - py);
        const [ppx, ppy] = gnodes[Lineage.getParent(n)].center;
        gnodes[n].center = [x, y];
        const [x1, y1, x2, y2] = [px - ppx, py - ppy, x - ppx, y - ppy]; // v1 = (x1, y1), v2 = (x2, y2);
        const [norm1, norm2] = [Math.sqrt(x1 * x1 + y1 * y1), Math.sqrt(x2 * x2 + y2 * y2)];
        let v = (x1 * x2 + y1 * y2) / (norm1 * norm2); // unsigned cos(th) with numerical error handling
        v = (Math.max(v, 1) == v ) ? 1.00 : v;
        const th = (Math.sign(x1 * y2 - x2 * y1) >= 0) ? Math.acos(v) : - Math.acos(v);
        if(isNaN(th)){
            console.log("Mathmatical Exception!!");
        }
        const [postx, posty] = transform(
            Math.cos(th), -Math.sin(th), ppx,
            Math.sin(th), Math.cos(th), ppy,
            px - ppx, py - ppy
        );
        const [dx, dy] = [x - postx, y - posty];
        let result = [];
        Lineage.getSubGnodes(catalogue, n, result);
        if(result.length && isNaN(gnodes[result[0]].center[0])){
            // console.log(gnodes[result[0]]);
        }
        result.forEach(gn=>this.rotateGnode(ppx, ppy, th, dx, dy, gn));  // rotation manupilation.
        done = false;
    };

    this.unfixGnode = function (n, t) {
        // const [cx, cy] = [gnodes[n].center[0] - gnodes[n].ocenter[0], gnodes[n].center[1] - gnodes[n].ocenter[1]];
        // Lineage.getSubNodes(gnodes, n).forEach(dot => {
        //     const [dx, dy] = [gnodes[n].center[0] - dot.x, gnodes[n].center[1] - dot.y];
        //     [dot.x, dot.y] = transform(
        //         1.0, 0.0, gnodes[n].ocenter[0],
        //         0.0, 1.0, gnodes[n].ocenter[1],
        //         dx, dy
        //     );
        //     [dot.ox, dot.oy] = [dot.x, dot.y]; // permanently fixed.
        // });
        // gnodes[n].center = gnodes[n].ocenter;
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
        const EPSILON = Number.EPSILON;
        const CONVERSION_MARGIN = .1;

        //if (done) return;
        const gg = gnodes[Lineage.UNASSIGNED_NODE];
        const [bx, by, bw, bh] = nodelink.canvasbounds;
        const [x, y] = [...gg.center];
        const [dx, dy] = [(bx + gg.radius * 1.2) - x, (by + bh - gg.radius * 1.2) - y];
        const dist = Math.sqrt(dx * dx + dy * dy) + EPSILON;

        // Update position
        gg.center[0] += dx / dist * .5; // add forces.
        gg.center[1] += dy / dist * .5;
        this.fitGuranules(Lineage.UNASSIGNED_NODE, gg.center[0] - x, gg.center[1] - y);
        //[gg.forcex, gg.forcey] = [0.0, 0.0]; // reset force value.

    if(dist < CONVERSION_MARGIN) done = true;
    return !done;
    }
}