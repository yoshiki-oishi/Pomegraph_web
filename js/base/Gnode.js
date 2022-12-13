
import { Lineage } from "./TreeImport";

export class Gnode {

    #zoom = 1.0;

    constructor(){
        this.subgroup ={}; // for secure access.
    }

    getZoom(){
        return this.#zoom;
    }

    getSubgroup(m){
        return this.subgroup[m];
    }

    getCenter(m){
        return [...this.getSubgroup(m).center];
    }

    getWorldPosition(m){
        return [...this.getSubgroup(m).worldPosition];
    }

    getMembers(m){
        return Object.values(this.getSubgroup(m).members).reduce((r,c)=> r.concat(c),[]);
    }

    setZoom(z){
        this.#zoom = z;
    }

    setRadius(m, s){
        this.getSubgroup(m).radius = s;
    }

    setCenter(m, x, y){
        const gg = this.getSubgroup(m);
        [...gg.center] = [x, y];
        [...gg.worldPosition] = [x, y];
    }

    setEdges(m, sg){
        if (!m){ // Treatment for rootless tree.
            this.subgroup = Object.assign(this.subgroup, { [Lineage.ORIGIN_NODE] : {
                center: [0, 0],
                worldPosition: [0, 0],
                viewPosition: [],
                radius: 0,
                zoom: 1.0,
                edges: [],
                neighbors: [],
                degree:  0,
                label:  "",
                highlight: new Set(),
                members: {} // Actually, it is blank gnode.
            }});
            m = this.getSubgroup(Lineage.ORIGIN_NODE); // substitute to origin node from null.
        }
        sg.forEach(gg => this.setEdge(m, gg));
    }

    setEdge(m, n){
        m.edges.push(n); // push to array.
    }

    countAllMembers(m){
        return Object.values(this.getSubgroup(m).members).reduce((r,c) => r + c.length, 0);
    }

    getTotalMembers(m){
        return this.countAllMembers(m);
    }

    register(dots) {

        if(!dots.length) return;

        this.subgroup = dots.reduce((result, dot) => {
            const ggname = dot.node['GNODEID'];
            const lgname = dot.node['assoc'];

            // collect subgroup members.
            (!result[ggname].members[lgname]) ? result[ggname].members[lgname] = [dot,] : result[ggname].members[lgname].push(dot);        
            return result;   
        },{});
    }
}