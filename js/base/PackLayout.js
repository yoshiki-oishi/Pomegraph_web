//import { NodeLink } from "../iGraph/NodeLink.js";
import { CciCoords } from "./Cci_Coords.js";

function transform (a, b, c, d, e, f, x, y) {
    return  [a*x+b*y+c, d*x+e*y+f];
}

export function PackLayout(nodelink) {

    let done = false;
    let gcnt = 0;
    let gsize = Object.keys(nodelink.groups).find(e => e == "0") ? Object.keys(nodelink.groups).length-1: Object.keys(nodelink.groups).length;
    //console.log(nodelink.groups);

    for(let n in nodelink.groups){
        // Assign calculated position.
        let m = nodelink.dots.length;
        const cc = CciCoords[nodelink.groups[n]-1].coords;
        let cnt = 0;
        for (let j = 0; j < m; j++) {
            if(cnt < cc.length){
                if (nodelink.dots[j].node['association'] == n) {
                    if(n == "0"){
                        //stay nameless clusters at the center.
                        nodelink.dots[j].x = cc[cnt].x;
                        nodelink.dots[j].y = cc[cnt].y;
                        //[nodelink.dots[j].fixx, nodelink.dots[j].fixy] = [nodelink.dots[j].x, nodelink.dots[j].y]; // Fixed position
                        [nodelink.dots[j].fixx, nodelink.dots[j].fixy] = [0, 0]; // Release node.
                        [nodelink.dots[j].forcex, nodelink.dots[j].forcey] = [0, 0]; // Release node.
                        [nodelink.dots[j].ox, nodelink.dots[j].oy] = [nodelink.dots[j].x, nodelink.dots[j].y]; // Original position
                    }else{
                        //move (transform) clusters to the mother circles rim.
                        if(gsize > 1){
                            //face each cluster members to the center.
                            [nodelink.dots[j].x, nodelink.dots[j].y] = 
                                transform(Math.cos(((gcnt-1)/gsize)*Math.PI*2), -Math.sin(((gcnt-1)/gsize)*Math.PI*2), Math.cos(gcnt/gsize*Math.PI*2)*3.0,
                                            Math.sin(((gcnt-1)/gsize)*Math.PI*2), Math.cos(((gcnt-1)/gsize)*Math.PI*2), Math.sin(gcnt/gsize*Math.PI*2)*3.0,
                                            cc[cnt].x, cc[cnt].y);
                        }else{
                            [nodelink.dots[j].x, nodelink.dots[j].y] = [cc[cnt].x, cc[cnt].y];
                        }
                        [nodelink.dots[j].fixx, nodelink.dots[j].fixy] = [nodelink.dots[j].x, nodelink.dots[j].y]; // Fixed position
                        [nodelink.dots[j].ox, nodelink.dots[j].oy] = [nodelink.dots[j].x, nodelink.dots[j].y]; // Original position
                    }
                    //[nodelink.dots[j].forcex, nodelink.dots[j].forcey] = [0, 0]; // Release node.               
                    cnt++;
                }
            }// break.
        }
        gcnt++;        
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

    this.jiggle = function (scale) {
        let n = nodelink.dots.length;
        while (n--){
            nodelink.dots[n].x += Math.random() * scale - scale / 2;
            nodelink.dots[n].y += Math.random() * scale - scale / 2;
        }

        done = false;
    };

    // constant for displacement ditance between tags.
    const ATTRACTION_FACTOR = 0.1;
    //const GRAVITY_FACTOR = 0.01;
    const REPULSION_FACTOR = 0.005;
    const SPRING_LENGTH = 2;
    const DISPLACEMENT_LIMIT = 0.1;
    const DUMPING_FACTOR = 0.1;

    this.update = function (time) {
        if (done) return;
        // calc pre force.
        let totalDisplacement_pre = 0;
        for (let i = nodelink.dots.length; i > 0;) {
            let n = nodelink.dots[--i];
            if (n.forcex !== undefined) {
                totalDisplacement_pre += Math.sqrt(n.forcex * n.forcex + n.forcey * n.forcey);
            }
        }
        // Repelling forces, all nodes repel each other (Coulomb's Law)
        for (let i=nodelink.dots.length; i>0;) {
            let n = nodelink.dots[--i];

            let j = nodelink.dots.length;
            while (j--) {
                if (i === j) continue; // No forces on identical nodes
                let m = nodelink.dots[j];

                // Vector from n to m
                let dx = m.x - n.x;
                let dy = m.y - n.y;
                let distSq = dx * dx + dy * dy + 0.01;  // Ensure distance != 0
                let dist = Math.sqrt(distSq);
                let f = REPULSION_FACTOR / distSq; // * (graph.nDegree[n] * graph.nDegree[m]);

                if (n.forcex !== undefined) {    
                    n.forcex -= 0.5 * f * dx / dist; // Distribute force to nodes,
                    n.forcey -= 0.5 * f * dy / dist; // each node receives half of
                }
                if (m.forcex !== undefined) {  
                    m.forcex += 0.5 * f * dx / dist; // the force in opposite
                    m.forcey += 0.5 * f * dy / dist; // directions
                    }
            }
        }        

        // Attracting forces, nodes connected by edges attract each other (Hooke's Law)
        
        for (let l = nodelink.links.length; l > 0;) {
            let n = nodelink.links[--l].source;
            let m = nodelink.links[l].target;

            // Vector from n to m
            let dx = m.x - n.x;
            let dy = m.y - n.y;
            let distSq = dx * dx + dy * dy + 0.01;  // Ensure distance != 0
            let dist = Math.sqrt(distSq);
            let f = ATTRACTION_FACTOR * (SPRING_LENGTH - dist);

            if (n.forcex !== undefined) { 
                n.forcex -= 0.5 * f * dx / dist; // Distribute force to nodes,
                n.forcey -= 0.5 * f * dy / dist; // each node receives half of
            }
            if (m.forcex !== undefined) { 
                m.forcex += 0.5 * f * dx / dist; // the force in opposite
                m.forcey += 0.5 * f * dy / dist; // directions
            }
        }

        // Update position
        let totalDisplacement = 0;

        // calc post force.
        for (let i = nodelink.dots.length; i > 0;) {
            let n = nodelink.dots[--i];

            if (!n.fixx) {
                n.x += n.forcex;
                n.y += n.forcey;

                totalDisplacement += Math.sqrt(n.forcex * n.forcex + n.forcey * n.forcey);
            }
        }
        // console.log(totalDisplacement);

        // Stop if a good layout has been reached
        done = (totalDisplacement_pre > totalDisplacement);
        //done = (totalDisplacement < DISPLACEMENT_LIMIT);
        // fix free elements position.
        if(done){
            for (let i = nodelink.dots.length; i > 0;) {
                let n = nodelink.dots[--i];
    
                if (!n.fixx) {
                    [n.forcex, n.forcey] = [null, null]; // Stop motion.
                    [n.fixx, n.fixy] = [n.x, n.y]; // Fix node.
                }
            } 
        }
        return !done;
    };
}