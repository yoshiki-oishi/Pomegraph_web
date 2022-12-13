import { parseNewick } from "patristic/dist/patristic.js";
import { DistMatrix } from "./DistProc";


// Access method class for lineage string.
export class Lineage {
    // 0, G-0, G-1, G-1.1, G-1.1.1 ...
    static LINEAGE_RE = /G-(\d+)((?:\.)\d+)*/;
    static UNASSIGNED_NODE = '0';
    static ORIGIN_NODE = 'G-0'; 

    // parse methods of a tree.
    static getDepth(s){
        if(s === this.UNASSIGNED_NODE) return 0;
        if(!(s.match(/G-(.+)/))) return 0;
        return s.match(/G-(.+)/)[1].split('.').length;
    }

    static isDefined(s){
        return (!(s === undefined ||  s === this.UNASSIGNED_NODE || !(s.match(/G-(.+)/))));
    }

    static addSibling(s){
        if(!this.isDefined(s)) return s;
        return s.replace(/(\d+)$/,(m, p1) => {return parseInt(p1)+1;});
    }

    static pushLevel(s, isSibling){
        if(isSibling || s === Lineage.ORIGIN_NODE) return this.addSibling(s);
        return s+'.1';
    }

    static popLevel(s){
        if (s.match(/G-(\d+)$/)) return Lineage.ORIGIN_NODE;
        return s.replace(/(\.\d+)$/,'');
    }

    static getParent(s){
        return this.popLevel(s);
    }

    static getCommonSubstring(s, t){
        let common = "G-";
        for(let i = 2; i < Math.min(s.length, t.length); i++){
            if (s[i] == t[i]){
                if ( i+1 == Math.min(s.length, t.length) || i+1 < Math.min(s.length, t.length) && s[i+1] == t[i+1])
                    common += s[i];
            }else break; 
        }
        return common.replace(/\.$/,'');
    }

    static getLength(gnode, stack){
        return gnode[stack].length;
    }

    static getSubstitutions(gnode, stack){
        return (gnode[stack].gnode.subs !== undefined) ? gnode[stack].gnode.subs : 0;
    }

    static getLengthFromRoot(gnode, gnode_key){
        let stack = gnode_key;
        let total_len = 0;
        while( stack !== Lineage.ORIGIN_NODE && stack !== Lineage.UNASSIGNED_NODE ){
            total_len += this.getLength(gnode, stack);
            stack = this.popLevel(stack);
        };
        return total_len;
    }

    static getSubstFromRoot(gnode, gnode_key){
        let stack = gnode_key;
        let total_len = 0;
        while( stack !== Lineage.ORIGIN_NODE && stack !== Lineage.UNASSIGNED_NODE ){
            total_len += this.getSubstitutions(gnode, stack);
            stack = this.popLevel(stack);
        };
        return total_len;    
    }

    static getDistance(gnode, src, dst){
        if(src === dst) return 0.0;
        let redundant = this.getLengthFromRoot(gnode, src) + this.getLengthFromRoot(gnode, dst);
        let sub = this.getCommonSubstring(src, dst);
        let common = ( sub === "G-" ) ? 0 : this.getLengthFromRoot(gnode, sub);
        return redundant - common * 2;
    }
/*
    static doDepthWalk(tree, gnodes, nodes, epi, stack, processLeaf, processNode){
        if (tree.isLeaf()){
            processLeaf(tree, gnodes, nodes, epi, stack);
            return;
        }// hit the bottom of tree. 
        processNode(tree, gnodes, nodes, epi, stack);
        let isSibling = false;
        tree.eachChild((branch) => {
            stack = Lineage.pushLevel(stack, isSibling);
            Lineage.doDepthWalk(branch, gnodes, nodes, epi, stack, processLeaf, processNode); // step level.
            isSibling = true;
        })
        return;
    }
*/
    static doDepthWalk(graph, id, gnodes, nodes, epi, stack, processLeaf, processNode){
        // loop avoidance.
        if (graph.ids.find(v=>v.id === id)) return; // pop stack
        graph.ids.push({'label': stack, 'id': id});
        if (graph.isLeaf(id)){
            processLeaf(graph, id, gnodes, nodes, epi, stack);
            return;
        }// hit the bottom of tree. 
        processNode(graph, id, gnodes, nodes, epi, stack);
        let isSibling = false;
        graph.getChilds(id).forEach((chid) => {
            stack = Lineage.pushLevel(stack, isSibling);
            Lineage.doDepthWalk(graph, chid, gnodes, nodes, epi, stack, processLeaf, processNode); // step level.
            isSibling = true;
        })
        return;
    }
    // parse methods of a catalogue by depth manner.

    static doBreadthWalk(graph, id, gnodes, nodes, epi, stack, processLeaf, processNode){
        // loop avoidance.
        if (graph.ids.find(v=>v.id === id)) return; // pop stack
        graph.ids.push({'label': stack, 'id': id});
        if (graph.isLeaf(id)){
            processLeaf(graph, id, gnodes, nodes, epi, stack);
            return;
        }// hit the bottom of tree. 
        processNode(graph, id, gnodes, nodes, epi, stack);
        let isSibling = false;
        graph.getChilds(id).forEach((chid) => {
            stack = Lineage.pushLevel(stack, isSibling);
            Lineage.doDepthWalk(graph, chid, gnodes, nodes, epi, stack, processLeaf, processNode); // step level.
            isSibling = true;
        })
        return;
    }
    // parse methods of a catalogue by breadth manner.

    static getRootChilds(catalogue){
        return catalogue.reduce((result, cur)=>{
            if(cur.match(/G-[1-9][0-9]*(?!\.)/)) result.push(cur);
            return result;
        },[]);
    }

    static getChilds(catalogue, node){
        let prefix = node.replace('\.','\\.');
        let pat = new RegExp(prefix + "\\.\\d+(?!\\..+)$");
        return catalogue.reduce((result, cur)=>{
            if(cur.match(pat)) result.push(cur);
            return result;
        },[]);
    }

    static getDirectChilds(catalogue, node){
        let prefix = node.replace('\.','\\.');
        let pat = new RegExp(prefix + "\\.\\d+(?!\\.\\d+)","g");
        return catalogue.reduce((result, cur)=>{
            if(cur.match(pat)) result.push(cur);
            return result;
        },[]);
    }

    static isLeaf(catalogue, node){
        return (!this.getChilds(catalogue, node));
    }

    static getLongestPair(catalogue){
        let mapped = catalogue.map(v =>{
            return {key: v, value: Lineage.getDepth(v)};
        });
        return mapped.sort((a,b) =>{
            if(a.value > b.value) return -1;
            if(a.value < b.value) return 1;
            return 0;
        });
    }

    static getSpanningDistance(gnode, catalogue){
        if (catalogue.length < 2) return 0;
        let [first, second] = Lineage.getLongestPair(catalogue);
        return Lineage.getLengthFromRoot(gnode, first.key) + Lineage.getLengthFromRoot(gnode, second.key);
    }

    static getSpanningSubstCount(gnode, catalogue){
        if (catalogue.length < 2) return 0;
        let [first, second] = Lineage.getLongestPair(catalogue);
        return Lineage.getSubstFromRoot(gnode, first.key) + Lineage.getSubstFromRoot(gnode, second.key);        
    }

    // Accessor of Gnodes.
    static getSubNodes(gnode, gn){
        return Object.values(gnode[gn].members).flat();
    }

    static getSubGnodes(catalogue, gn, result){
        if(gn == Lineage.ORIGIN_NODE) return; // skip the root node.
        const vec = this.getChilds(catalogue, gn);
        if(!vec.length) return result;
        vec.forEach(e => result.push(e));
        vec.forEach(ch => this.getSubGnodes(catalogue, ch, result));
    }
}
// for internal data handling.
export function export_data(data)
{
    const fname = 'internal_data.txt'
    if(data){
        let blob = new Blob([JSON.stringify(data)], {type:"text/plain"});
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a")
        document.body.appendChild(a);
        a.download = fname;
        a.href = url;
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
    }
}

export class AdjList {
    #nexus;
    #identical;

    constructor(){}
    get nexus(){ return this.#nexus; }
    get identical(){ return this.#identical; }

    set nexus(n){ this.#nexus = n; }
    set identical(i){ this.#identical = i; }

}

export class Tree {
    #file;
    #data; // temporal object store.

    constructor(_file) {
        this.#file = _file;
    };

    get file() { return this.#file; }
    get data() { return this.#data; }

    set file(f){ this.#file = f; }
    set data(d){ this.#data = d; }

    compare(from, to){
        return from.toString() == to.toString();
    }

    Reader(onload){
        this._Reader(onload, func); // must be overloaded by derived class.
    }

    _Reader(onload, func){
        let reader = new FileReader();
        let that = this;   
        reader.onload = function(e) {
            that.data = func(e.currentTarget.result);
          if (typeof onload == 'function') {
            onload(e);
          }
        };
        if(this.file !== undefined){
            reader.readAsText(this.file);
        }   
    }

    toJSON(){
        throw "App must implement toJSON(..).";
    }

    static register_node(node_df, epi_df, element, label){
        if(element){
            node_df.push({
                TAGID: element,
                SEQID: element,
                GNODEID: label,
                type: "",
                date: 0,
                dint: 0,
                association: 0
            }); // temporary assiginment.
            epi_df.push({
                SEQID: element,
                GNODEID: label
            })
        }
    }

    static register_gnode(gnode_df, stack, length, x, y){
        // initial assignment of gnode_df.
        if (!(stack in gnode_df)){
            gnode_df = Object.assign(gnode_df, {[stack] : {
                label: stack,
                length: length, // branch length from the parent node.
                edges: [],
                x: x,
                y: y
            }});
        }
    }

    static assign_edges(gnode_df){
        // assign edges.
        const catalogue = Object.keys(gnode_df);
        Object.keys(gnode_df).forEach((src)=>{
            if(src === Lineage.ORIGIN_NODE){
                Lineage.getRootChilds(catalogue).forEach( dst => {
                    gnode_df[src].edges.push(dst);
                });
            }else{
                Lineage.getChilds(catalogue, src).forEach( dst => {
                    gnode_df[src].edges.push(dst);
                });
            }
        });
        return gnode_df;
    }

    static add_edges(gnode_df, optional){
        let result = [];
        gnode_df.forEach(gn =>{
            if(gn.label === optional.src) gn.push;
            result.push(gn);
        });
        return result;
    }

    static getGedgeList(gnode_df){
        let result = [];
        const catalogue = gnode_df.reduce((r,v)=>{r.push(v.label); return r},[]);
        catalogue.forEach((src)=>{
            if(src === Lineage.ORIGIN_NODE){
                Lineage.getRootChilds(catalogue).forEach( dst => {
                    result.push({
                        'src': src,
                        'dst': dst
                    });
                });
            }else{
                Lineage.getChilds(catalogue, src).forEach( dst => {
                    result.push({
                        'src': src,
                        'dst': dst
                    });
                });
            }
        });
        return result;
    }

    toMatrix(gnode_df){
        const catalogue = Object.keys(gnode_df);
        return catalogue.reduce((res, src) =>{
            res.push(
                catalogue.reduce((row, dst) =>{
                    row.push(Lineage.getDistance(gnode_df, src, dst));
                    return row;
                },[])
            )
            return res;
            },[]);
    }

}

export class Newick extends Tree {

    static simplifyTree(d) {
        const dist = new DistMatrix(d.toMatrix().matrix);
        const period = dist.getPeriod(); // {peroid, phase, interval}
        console.log(period);
        for(let i = 0; i < (period.phase - 1); i++) d.collect(i * period.interval); // progressive condensation.
        return d;
        //console.log(this.#tree);
    }


    Reader(onload) { 
        let reader = new FileReader();
        let that = this;   
        reader.onload = function(e) {
            let data = parseNewick(e.currentTarget.result);
            that.tree = Newick.simplifyTree(data);
          if (typeof onload == 'function') {
            onload(e);
          }
        };
        if(this.file !== undefined){
            reader.readAsText(this.file);
        }
        // Newick.setTreelReadCompleted(true);
    }                     

    toJson(){
        let result = {};
        this.node_df = [];
        this.epi_df = [];
        this.gnode_df = [];
        const labeling_f = function (tree, gnode_df, node_df, epi_df, stack){
            if(tree.id) tree.id.split('+').forEach(element => {
                Newick.register_node(node_df, epi_df, element, stack);
           });
           tree.id = stack;
           Newick.register_gnode(gnode_df, stack, tree.length);
        };
        Lineage.doDepthWalk(this.tree.getRoot(), this.gnode_df, this.node_df, this.epi_df, Lineage.ORIGIN_NODE, labeling_f, labeling_f);
        result['nodes'] = this.node_df;
        result['epi'] = this.epi_df;
        result['tree'] = Object.values(this.assign_edges(this.gnode_df));
        const dist = new DistMatrix(this.toMatrix(this.gnode_df));
        //console.log(dist.getPeriod());
        result['dist'] = dist.getPeriod();
        return result;
    }
}