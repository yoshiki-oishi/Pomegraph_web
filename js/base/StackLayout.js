//import { NodeLink } from "../iGraph/NodeLink.js";
//import { CciCoords } from "./Cci_Coords.js";

import { Constants } from "./Constants";
import { Lineage } from "./TreeImport";

function transform (a, b, c, d, e, f, x, y) {
    return  [a*x+b*y+c, d*x+e*y+f];
}

function getDailyLayout(dots){
    //[x, y]: current operational posistion.
    //[ox, oy]: initial position.
    //[fixx, fixy]: tacked position.
    if(! dots.length) return;
//    const cc = CciCoords[(dots.length)-1].coords;
    const WOBBLE_MAGNITUTE = 0.05;
    dots.forEach((dot, index) => {
        //[dot.x,  dot.y] = [cc[index].x, cc[index].y];
        [dot.x,  dot.y] = [Math.random() * WOBBLE_MAGNITUTE, (index - (dots.length-1) / 2.0)/(dots.length)];
        dot.scale = Constants.STACK_DOT_RADIUS;
//        transform(1, 0, 0,
//                  0, VERTICAL_MAGNITUTE, 0,
///                  dot.x, dot.y);
    });
}

function getLocalLayout(dots, days) {
    // align dots into day bins.

    const HORIZONTAL_MAGNITUDE = Constants.HORIZONTAL_MAGNITUDE;

    //let dcnt = 0;
    let [dmin, dmax] = [Math.min(...days), Math.max(...days)];
    let mean = (dmax+dmin)/2;
    let w = (dmax-dmin) ? (dmax-dmin) : 1;
    //console.log(dmin+", "+dmax);

    days.forEach(day => {
        let daily_dots = dots.reduce((result, cur) => {
            if(cur.node['date'] == day) result.push(cur);
            return result;
        }, []);
        getDailyLayout(daily_dots);
        //console.log((day - (dmax+dmin)/2)/((dmax-dmin)/2) * HORIZONTAL_MAGNITUDE);
        daily_dots.forEach((dot) => {
            [dot.x, dot.y] =
            transform(1, 0, (day - mean)/w * HORIZONTAL_MAGNITUDE,
                    0, 1, 0,
                    dot.x,  dot.y);
        });
    });
    // Procedure for inproper-day tags. (except for no EPI data.)
    if (days.length > 1){
        dots.forEach(cur => {
            if(! cur.isProperDate()){
                [cur.x, cur.y] = transform(
                    1, 0, (dmin - 2 - mean)/w * HORIZONTAL_MAGNITUDE,
                    0, 1, 0,
                    cur.x, cur.y
                );
                [cur.fixx, cur.fixy] = [cur.forcex, cur.forcey] = [0, 0]; // Untack position 
            }
        });
    }
    return dots;
}

function moveToGlobal(dots, slot, isFreeNode) {
    // move dots into each horizontal slot.
    // slot: normalized horizontal level of slot.

    const ELEVATION_MAGNITUDE = Constants.ELEVATION_MAGNITUDE;
     
    if (isFreeNode){
        // Untack unassociated tags.
        dots.forEach((dot) =>{ [dot.fixx, dot.fixy] = [dot.forcex, dot.forcey] = [0, 0]; }); // Mark and release a node.
    }else{
        dots.forEach((dot) =>{
            [dot.x, dot.y] = 
            transform(1, 0, 0,
                      0, 1, slot*ELEVATION_MAGNITUDE,
                      dot.x, dot.y);
        });
    }
    dots.forEach((dot) => {[dot.fixx, dot.fixy] = [dot.ox, dot.oy] = [dot.x, dot.y];});
}

export function StackLayout(nodelink) {

    let done = false;
    let iter_res = [];
    // let gsize = Object.keys(nodelink.groups).find(e => e == Lineage.UNASSIGNED_NODE ) ? Object.keys(nodelink.groups).length-1: Object.keys(nodelink.groups).length;
    const gsize = Object.keys(nodelink.groups).length;

    //let days = nodelink.dots.map( anObj1 => anObj1.node['dint'] );// simple array copy.
    let days = nodelink.dots.reduce((result, cur) => {
            if (cur.isProperDate()) result.push(cur.node['date']);
            return result;
        },[]);
    if (!days || days.length === 0) days = [0]; // Fail safe.

    let assocFlg = Object.keys(nodelink.groups).find(e => e == "0") ? true : false;
    //nodelink.groups.forEach((n, i) => {
    Object.fromEntries( Object.entries(nodelink.groups)
        .map(([key, val], index) => {
        let dots = nodelink.dots.reduce((result, cur) => {
            if(cur.node['association'] == key){
                result.push(cur);
            } 
            return result;
        }, []);
        // (index != 0 || !assocFlg) ? 
            moveToGlobal(getLocalLayout(
                dots,days.sort((a,b) => {return a-b})),
                parseFloat((index-(gsize/2))/gsize), false)
            
            // if(key === "0") dots.forEach((dot) =>{ [dot.fixx, dot.fixy] = [dot.forcex, dot.forcey] = [0, 0]; }); // Mark and release a node.
        // : (gsize) ?
        //     moveToGlobal(getLocalLayout(
        //         dots,days.sort((a,b) => {return a-b})),
        //         0, true)
        //     :
        //         moveToGlobal(getLocalLayout(
        //             dots,days.sort((a,b) => {return a-b})),
        //             0, false)            
        ; // Assign calculated position.
        return [key, val];       
    }));

    // initiall position asignment for free nodes. 
    if(nodelink.links){
        for (let l = nodelink.links.length; l > 0;) {
            --l;
            let n = nodelink.links[l].source;
            let m = nodelink.links[l].target;
            if (n.forcex !== undefined && m.forcex === undefined) n.y = m.y + (Math.sign(Math.random()-0.5)*0.5); // move to near by tacked node. 
            if (m.forcex !== undefined && n.forcex === undefined) m.y = n.y + (Math.sign(Math.random()-0.5)*0.5);  
        }
    }

    this.fixNode = function (n, x, y) {
        [nodelink.dots[n].x, nodelink.dots[n].y] = [x, y];
        done = false;
    };

    this.unfixNode = function (n) {
        [nodelink.dots[n].x, nodelink.dots[n].y] = [nodelink.dots[n].ox, nodelink.dots[n].oy];
        done = false;
    };

    this.freeNode = function (n) {
        [nodelink.dots[n].fixx, nodelink.dots[n].fixy] = [null, null]; // Release fix
        done = false;    
    };

    this.releaseNode = function (n){
        [nodelink.dots[n].forcex, nodelink.dots[n].forcey] = [0, 0]; // Release fix
        done = false;
    }

    this.jiggle = function (scale) {
        let n = nodelink.dots.length;
        while (n--){
            nodelink.dots[n].x += Math.random() * scale - scale / 2;
            nodelink.dots[n].y += Math.random() * scale - scale / 2;
        }

        done = false;
    };

    // constant for displacement ditance between tags.
    const EPSILON = Number.EPSILON;
    const CONVERSION_MARGIN = .1;
    const ATTRACTION_FACTOR = 1.0;
    const SPRING_LENGTH = 0.5;
    const DISPLACEMENT_LIMIT = 1.5; // 0.6
    const MIN_ITERATION = 50;

    this.update = function (time) {

        //if (done) return; // originally, skip when layout finished.

        // Repelling forces, ovelapped nodes exclude with margin. For convenience, calculate only for adjascent nodes.
        for (let i=nodelink.links.length; i>0;) {
            --i;
            let n = (nodelink.links[i].source.forcex !== undefined) ? nodelink.links[i].source : nodelink.links[i].target; // detect a free node.

            let j = nodelink.dots.length;
            while (j--) {
                let m = nodelink.dots[j];
                if (n === m) continue; // No forces on identical nodes

                // Vector from n to m
                let dx = m.x - n.x;
                let dy = m.y - n.y;

                let dist = Math.sqrt(dx * dx + dy * dy) + EPSILON;
                if (dist > DISPLACEMENT_LIMIT) continue;

                let f = dist - DISPLACEMENT_LIMIT; // static force;

                if (n.forcex !== undefined) {    
                    n.forcex = 0.0;
                    n.forcey -= 0.5 * f * dy / dist; // each node receives half of
                }
                if (m.forcex !== undefined) {  
                    m.forcex = 0.0;
                    m.forcey += 0.5 * f * dy / dist; // directions
                }
            }
        }        

        // Attracting forces, nodes connected by edges attract each other (Hooke's Law)
        
        for (let l = nodelink.links.length; l > 0;) {
            l--;
            let n = nodelink.links[l].source;
            let m = nodelink.links[l].target;
            if((! n.isProperDate()) || (! m.isProperDate())) break; // skip for benches.
            // Vector from n to m
            let dx = m.x - n.x;
            let dy = m.y - n.y;
            let dist = Math.sqrt(dx * dx + dy * dy) + EPSILON;  // Ensure distance != 0
            let f = ATTRACTION_FACTOR * (SPRING_LENGTH - dist) * Math.random(); // Prevent harmonic vibration.

            if (n.forcex !== undefined) { 
                //n.forcex -= 0.5 * f * dx / dist; // Distribute force to nodes,
                n.forcex = 0.0; // x coodinate is fixed on this moodel.
                n.forcey -= 0.5 * f * dy / dist; // each node receives half of
            }
            if (m.forcex !== undefined) { 
                //m.forcex += 0.5 * f * dx / dist; // the force in opposite
                m.forcex = 0.0; // x coodinate is fixed on this moodel.
                m.forcey += 0.5 * f * dy / dist; // directions
            }
        }
        let nbench = 0;
        let distance_from_bench = 0.0;
        const MARGIN = 2.0;
        const [bx, by, bw, bh] = nodelink.canvasbounds;
        if(days.length > 1){ // skip when no EPI data.
            nodelink.dots.filter(cur => !(cur.isProperDate()))
                .forEach(cur =>{ // process for benches.
                    const [dx, dy] = [(bx + nbench * MARGIN + nodelink.getUnprojectWidth(Constants.MIN_RADIUS)) - cur.x, (by + bh - nodelink.getUnprojectHeight(Constants.MIN_RADIUS)) - cur.y];
                    const dist = Math.sqrt(dx * dx + dy * dy) + EPSILON;
                    distance_from_bench += dist;
                    [cur.forcex, cur.forcey] = [dx / dist * .5, dy / dist * .5];
                    nbench++;
                });
        }
        // Update position
        for (let i = nodelink.dots.length; i > 0;) {
            --i;
            let n = nodelink.dots[i];

            if (n.forcex !== undefined) {
                n.x += n.forcex;
                n.y += n.forcey;
                [n.forcex, n.forcey] = [0.0, 0.0]; // reset force value.
            }
        }

        // calc post strand length.
        let total_length = nodelink.links.reduce((result, curr) =>{
            let n = curr.source;
            let m = curr.target;
            if(n.isProperDate() && m.isProperDate()) result += Math.sqrt((m.x - n.x) * (m.x - n.x) + (m.y - n.y) * (m.y - n.y)); // each strand length.
            return result;
        }, 0);
        iter_res.push(total_length);
        iter_res.sort((a,b) => a - b);

        const players_done = (
            iter_res.length > MIN_ITERATION && iter_res[0] <= total_length
        );

        // fix free elements position.
        if(players_done === true){
            for (let i = nodelink.dots.length; i > 0;) {
                let n = nodelink.dots[--i];
    
                if (n.forcex !== undefined && n.isProperDate()) {
                    [n.forcex, n.forcey] = [undefined, undefined]; // Stop motion.
                    [n.fixx, n.fixy] = [n.ox, n.oy] = [n.x, n.y]; // Fix node.
                }
            } 
        }
        if(players_done === true && distance_from_bench < CONVERSION_MARGIN) done = true;

        return !done;
    };
}