import { Lineage } from './TreeImport';
import { autocorrelation } from 'autocorrelation';

//const N_BREAKS = 1024;
const N_BREAKS = 512;

const tsv_to_array = (data, delimiter = '\t', omitFirstRow = false) =>
     data
        .slice(omitFirstRow ? data.indexOf('\n') + 1 : 0)
        .split('\n')
        .map(v => v.split(delimiter));

export class DistMatrix {
    #matrix;
    #nbreak;
    #sequential;
    #maxL;

    constructor(m) {
        this.#matrix = m.reduce((result, row) => {
            const [key, ...values] = row;
            result.push(values);
            return result;
        },[]);
        this.#nbreak = (m.length ** 2 > N_BREAKS) ? N_BREAKS : 2 ** Math.ceil(Math.log2(m.length ** 2));
        let mat =  this.#matrix.reduce((r,v) =>{
            r.push(v);
            return r;
        },[]);
        this.#sequential = Array.from(
            mat.flat()
                .filter(v=>!isNaN(v))
                .sort((a, b) => a - b)
            );
        this.#maxL = this.#sequential[this.#sequential.length-1];
    }

    get sequential(){
        return this.#sequential;
    }

    get max_dist(){
        return this.maxL;    
    }

    get interval(){
        if (!this.#matrix) return;
        return this.#maxL / (this.#nbreak - 1);
    }

    parseDist(text){
        const df = tsv_to_array(text.replaceAll(/\r/g,''),'\t',true);
        //console.log("mean:" + Math. this.getDistanceElements);
        //return this.getDistanceSetWithKeys(df);
        return this.setDistanceTable(df);
    }

    calcSamplingPoints(){
        const interval = this.interval;
        let result = [...Array(this.#nbreak)].map(v=>v=0);
        // sometimes branch lengths are negative. it will be treated as zero.  
        this.#sequential.map(v=>(v>0) ? v : 0)
            .forEach(v=>result[parseInt(v / interval)] += 1);
        //console.table(result);
        return Object.values(result);
    }

    calcNormalization(vec){
        let result = vec.map(v=>parseInt(v));
        const maxV = Math.max(...result);
        return result.map(v=>v/maxV*2.0);
    }

    getACF(signals){
        signals[0] = 0; //signal filtering.
        let acf = autocorrelation(signals);
        //console.table(acf.slice(0,100));
        return acf.slice(0,Math.ceil(signals.length/2));
    }

    movingAverage(window, series){
        if(!series || !series.length) return;
        let result = [];
        series.map((_,i)=>{
            result.push(series.slice(i,i+window).reduce((a, b)=> a + b));
        });
        return result;
    }

    getPeak(series){
        const WINDOW = 2.0;
        const PROBE_WINDOW = 5;
        const probe = this.movingAverage(WINDOW,series);
        const maxind = [];

        const maxval = Math.max(...series);
        series.forEach((item, index) => item === maxval ? maxind.push(index): null); 
        console.log(maxind);
        let detected = maxind[0];

        const peak = probe.slice(detected - PROBE_WINDOW, detected + PROBE_WINDOW);
        const [top, sec] = peak.sort((a,b)=>b - a);
        const p_top = parseInt(probe.findIndex(e=>e == top));
        const p_sec = parseInt(probe.findIndex(e=>e == sec));
        return p_top * (top/(top+sec)) + p_sec * (sec/(top+sec))//intermediate formula.              
    }

    getShoulder(baud){
        const maxind = [];
        const shoulderind = [];
        const maxval = Math.max(...baud);
        baud.forEach((item, index) => item === maxval ? maxind.push(index): null);
        const right = baud.slice(0, maxind[0]+1);  
        right.reverse().forEach((item, index) => item === 0 ? shoulderind.push(index): null);
        //console.log(right);
        return shoulderind[0];
    }

    getPeriod(){
        let signals = this.calcNormalization(this.calcSamplingPoints());
        let acf = this.getACF(signals);
        acf[0] = 0; // boundary processing.
        acf[1] = 0;
        acf[2] = 0;
        acf[3] = 0;
        acf[4] = 0;
        const period = this.getPeak(acf);
        const phase = period - this.getShoulder(signals.slice(0, period*2));
        //console.table(signals);
        //console.table(acf);
        return ({'period':period, 'phase':phase, 'interval': this.interval});
    }

    static getSubstCount(period, length){
        if (!period) return undefined;
        const unit = length / period.interval - period.phase;
        if (unit < 0) return 0;
        else return (Math.ceil(unit / period.period));
    }

    toJson(){
        return {subst: Array.from(this.#matrix)};
    }

    async adjustTreeDist(tree, epi){
        return new Map(tree.reduce((ret, val) =>{
            ret.push([val.label, parseInt(this.getSubstCnt(epi.get(val.label), epi.get(Lineage.getParent(val.label))))]);
            return ret;
        },[]));
    }
}

export class ConnectivityMatrix {
    #edges = []; // undirected edges.
    #nodes = [];
    #adjm = [];
    #gntbl = [];
    #directed = [];

    constructor(json){
        const getAttrArray = function (df, attrkey){
            return df.reduce((ret, elem)=>{
            ret.push(elem[attrkey]);
            return ret;
            }, []);
        }

        json.edge.forEach(e=>{
            const tmp = {
                'src': parseInt(e.src),
                'dst': parseInt(e.dst),
                'weight': parseInt(e.subs)
            }
            this.directed.push(tmp);
        });
        json.node.forEach((_, i)=>( this.nodes.push(i) ));
        this.gntbl = json.gnlist;
        this.edges = ConnectivityMatrix.undirectEdges(this.directed);
        this.buildAdjacentMatrix();
        return this;
    }

    get edges(){ return this.#edges; }
    get nodes(){ return this.#nodes; }
    get adjm(){ return this.#adjm; }
    get directed(){ return this.#directed; }
    get gntbl(){ return this.#gntbl; }
    get conn(){ return this.floydWarshallAlgorithm(); }

    set edges(e){ this.#edges = e; }
    set nodes(n){ this.#nodes = n; }
    set directed(e){ this.#directed = e; }
    set gntbl(pairs){ this.#gntbl = pairs; }
    // set adjm(m){ this.#adjm = m; }

    getChildIDs (idx){
        // return this.edges.filter((e, i)=>(e.src === idx ? i : []));
        let result = this.edges.filter(e=>(e.src === idx ? true : false));
        return result.length ? result.reduce((r,v)=>{r.push(v.dst); return r},[]) : null; 
    }

    getChilds(idx){
        return this.edges.filter(e=>(e.src === idx ? true : false));
    }

    isLeaf(idx){
        return this.getChilds(idx) ? false : true;
    }

    getLength(src, dst){
        return this.adjm[src][dst];
    }

    buildAdjacentMatrix(){
        for (let i = 0; i < this.nodes.length; i++) {
            this.adjm[this.nodes[i]] = [];
            // For existing edges assign the dist to be same as weight
            this.getChilds(this.nodes[i])
             .forEach(e => (this.adjm[this.nodes[i]][e.dst] = e.weight));
            this.nodes.forEach(n => {
               // For all other nodes assign it to infinity
               if (this.adjm[this.nodes[i]][n] == undefined)
               this.adjm[this.nodes[i]][n] = Infinity;
               // For self edge assign dist to be 0
               if (this.nodes[i] === n) this.adjm[this.nodes[i]][n] = 0;
            });
         }
    }

    floydWarshallAlgorithm() {
        //https://www.tutorialspoint.com/The-Floyd-Warshall-algorithm-in-Javascript
        let dist = [];
        this.adjm.forEach((vec, i) =>{
            dist[i] = [];
            vec.forEach((v, j) => dist[i][j] = v);
        });
        this.nodes.forEach(i => {
           this.nodes.forEach(j => {
              this.nodes.forEach(k => {
                 // Check if going from i to k then from k to j is better
                 // than directly going from i to j. If yes then update
                 // i to j value to the new value
                 if (dist[i][k] + dist[k][j] < dist[i][j])
                    dist[i][j] = dist[i][k] + dist[k][j];
                });
            });
        });
        return dist;
    }

    static undirectEdges(e){
        let result = e.reduce((r,ee)=>{r.push(ee); return r;},[]);
        e.forEach(v=>{
            result.push({
                src: v.dst,
                dst: v.src,
                weight: v.weight
            });
        });
        return result;
    }
}